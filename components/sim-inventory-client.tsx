'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Wifi, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
  BarChart3, Users, Activity, Layers,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type SimSummary = {
  customer_name_raw: string
  customer_id:       string | null
  match_status:      'matched' | 'pending' | 'other_unit'
  total_sims:        number
  by_plan:           Record<string, number> | null
  by_apn:            Record<string, number> | null
}

type BillingRecord = {
  customer_id: string
  active_sims: number
  abf_amount:  number
  customers:   { name: string } | null
}

type CustomerPlan = {
  customer_id: string
  sim_count:   number
  plans:       { plan_name: string } | null
}

type ChangeLogEntry = {
  upload_month:    string
  customer_name_raw: string
  customer_id:     string | null
  total_sims:      number
  prev_total_sims: number | null
  net_change:      number | null
}

type AnalyticsData = {
  simData:       SimSummary[]
  billingData:   BillingRecord[]
  changeLog:     ChangeLogEntry[]
  customerPlans: CustomerPlan[]
}

// Joined row for customer comparison tab
type CustomerRow = {
  customerId:   string | null
  rawName:      string
  displayName:  string
  matchStatus:  string
  dumpSims:     number
  billingSims:  number | null
  variance:     number | null
  variancePct:  number | null
  byPlan:       Record<string, number>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

function pct(v: number, total: number) {
  if (!total) return '—'
  return ((v / total) * 100).toFixed(1) + '%'
}

function varianceColor(pctVal: number | null) {
  if (pctVal === null) return 'text-slate-400'
  const abs = Math.abs(pctVal)
  if (abs <= 2)  return 'text-emerald-600'
  if (abs <= 10) return 'text-amber-600'
  return 'text-red-600'
}

function varianceBg(pctVal: number | null) {
  if (pctVal === null) return 'bg-slate-50'
  const abs = Math.abs(pctVal)
  if (abs <= 2)  return 'bg-emerald-50'
  if (abs <= 10) return 'bg-amber-50'
  return 'bg-red-50'
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex items-start gap-4">
      <div className={cn('rounded-lg p-2.5 shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ data, month }: { data: AnalyticsData; month: string }) {
  const matched    = data.simData.filter(r => r.match_status === 'matched')
  const pending    = data.simData.filter(r => r.match_status === 'pending')
  const otherUnit  = data.simData.filter(r => r.match_status === 'other_unit')

  const dumpTotal    = data.simData.reduce((s, r) => s + r.total_sims, 0)
  const dumpMatched  = matched.reduce((s, r) => s + r.total_sims, 0)
  const billingTotal = data.billingData.reduce((s, r) => s + (r.active_sims ?? 0), 0)
  const variance     = billingTotal - dumpTotal
  const variancePct  = dumpTotal > 0 ? ((variance / dumpTotal) * 100) : 0

  // Build billing lookup
  const billingMap = new Map<string, BillingRecord>()
  data.billingData.forEach(r => billingMap.set(r.customer_id, r))

  // Top 10 customers by dump SIMs
  const top10 = [...matched]
    .sort((a, b) => b.total_sims - a.total_sims)
    .slice(0, 10)

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="SIMs in Dump" value={fmt(dumpTotal)} sub={month} color="bg-[#1565c0]" icon={Wifi} />
        <StatCard label="SIMs in Billing" value={billingTotal ? fmt(billingTotal) : '—'} sub="Monthly records" color="bg-[#2e7d32]" icon={BarChart3} />
        <StatCard
          label="Variance (Billing − Dump)"
          value={billingTotal ? (variance >= 0 ? '+' : '') + fmt(variance) : '—'}
          sub={billingTotal ? variancePct.toFixed(1) + '%' : undefined}
          color={Math.abs(variancePct) <= 2 ? 'bg-emerald-600' : Math.abs(variancePct) <= 10 ? 'bg-amber-600' : 'bg-red-600'}
          icon={variance >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard label="Matched Customers" value={`${matched.length}`} sub={`${pending.length} pending · ${otherUnit.length} other unit`} color="bg-slate-500" icon={Users} />
      </div>

      {/* Coverage note */}
      {pending.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>{pending.length} customer{pending.length > 1 ? 's' : ''}</strong> in the dump are unmatched —{' '}
            {data.simData.filter(r => r.match_status === 'pending').reduce((s, r) => s + r.total_sims, 0).toLocaleString('en-IN')} SIMs excluded from variance analysis.
            Go to <strong>SIM Inventory Upload</strong> to resolve matches.
          </span>
        </div>
      )}

      {/* Top customers table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Top 10 Customers by SIM Count</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">#</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">CUSTOMER</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">DUMP SIMs</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">BILLING SIMs</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">VARIANCE</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">% SHARE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {top10.map((row, i) => {
                const billing = row.customer_id ? billingMap.get(row.customer_id) : undefined
                const bSims   = billing?.active_sims ?? null
                const varN    = bSims !== null ? bSims - row.total_sims : null
                const varP    = varN !== null && row.total_sims > 0 ? (varN / row.total_sims) * 100 : null
                return (
                  <tr key={row.customer_name_raw} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{billing?.customers?.name ?? row.customer_name_raw}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmt(row.total_sims)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{bSims !== null ? fmt(bSims) : <span className="text-slate-300">—</span>}</td>
                    <td className={cn('px-4 py-2.5 text-right font-mono', varianceColor(varP))}>
                      {varN !== null ? (varN >= 0 ? '+' : '') + fmt(varN) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 text-xs">{pct(row.total_sims, dumpTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <td className="px-4 py-2.5 text-slate-600 text-xs" colSpan={2}>TOTAL (matched)</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(dumpMatched)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">{billingTotal ? fmt(billingTotal) : '—'}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono', varianceColor(variancePct))}>
                  {billingTotal ? (variance >= 0 ? '+' : '') + fmt(variance) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-400 text-xs">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Plan Breakdown ───────────────────────────────────────────────────────

function PlanBreakdownTab({ data }: { data: AnalyticsData }) {
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)

  // Aggregate all plans across matched customers
  const planTotals: Record<string, number> = {}
  const matched = data.simData.filter(r => r.match_status === 'matched')
  matched.forEach(r => {
    if (!r.by_plan) return
    Object.entries(r.by_plan).forEach(([plan, cnt]) => {
      planTotals[plan] = (planTotals[plan] ?? 0) + cnt
    })
  })

  const totalSims  = Object.values(planTotals).reduce((s, v) => s + v, 0)
  const plansSorted = Object.entries(planTotals).sort((a, b) => b[1] - a[1])

  // Build billing lookup
  const billingMap = new Map<string, BillingRecord>()
  data.billingData.forEach(r => billingMap.set(r.customer_id, r))

  // Per-customer plan breakdown sorted by total desc
  const customerBreakdowns = matched
    .sort((a, b) => b.total_sims - a.total_sims)

  return (
    <div className="space-y-5">
      {/* Overall plan summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">All Plans — Consolidated</h3>
          <span className="text-xs text-slate-400">{plansSorted.length} plans · {fmt(totalSims)} SIMs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">#</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">PLAN NAME</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">SIM COUNT</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">% OF TOTAL</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">BAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plansSorted.map(([plan, count], i) => {
                const barW = totalSims > 0 ? (count / totalSims) * 100 : 0
                return (
                  <tr key={plan} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{plan}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmt(count)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500 text-xs">{pct(count, totalSims)}</td>
                    <td className="px-4 py-3 text-right" style={{ minWidth: 100 }}>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-[#1565c0]" style={{ width: `${barW}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <td className="px-4 py-2.5 text-slate-600 text-xs" colSpan={2}>TOTAL</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(totalSims)}</td>
                <td className="px-4 py-2.5 text-right text-slate-400 text-xs">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Per-customer plan breakdown */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Per-Customer Plan Detail</h3>
          <p className="text-xs text-slate-400 mt-0.5">Click a customer to expand plan breakdown</p>
        </div>
        <div className="divide-y divide-slate-50">
          {customerBreakdowns.map(row => {
            const billing    = row.customer_id ? billingMap.get(row.customer_id) : undefined
            const bSims      = billing?.active_sims ?? null
            const varN       = bSims !== null ? bSims - row.total_sims : null
            const varP       = varN !== null && row.total_sims > 0 ? (varN / row.total_sims) * 100 : null
            const isExpanded = expandedCustomer === row.customer_name_raw
            const plans      = row.by_plan ? Object.entries(row.by_plan).sort((a, b) => b[1] - a[1]) : []
            const custName   = billing?.customers?.name ?? row.customer_name_raw

            return (
              <div key={row.customer_name_raw}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setExpandedCustomer(isExpanded ? null : row.customer_name_raw)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{custName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{plans.length} plans</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold text-slate-700">{fmt(row.total_sims)}</p>
                    {varP !== null && (
                      <p className={cn('text-xs font-medium', varianceColor(varP))}>
                        {varN! >= 0 ? '+' : ''}{fmt(varN!)} billing
                      </p>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                </button>

                {isExpanded && plans.length > 0 && (
                  <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                    <table className="w-full text-xs mt-2">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-1.5 font-semibold pr-4">PLAN</th>
                          <th className="py-1.5 font-semibold text-right pr-4">SIMs</th>
                          <th className="py-1.5 font-semibold text-right pr-4">% of CUSTOMER</th>
                          <th className="py-1.5 font-semibold text-right">% of ALL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {plans.map(([plan, cnt]) => (
                          <tr key={plan} className="text-slate-700">
                            <td className="py-1.5 pr-4 font-medium">{plan}</td>
                            <td className="py-1.5 pr-4 text-right font-mono">{fmt(cnt)}</td>
                            <td className="py-1.5 pr-4 text-right text-slate-500">{pct(cnt, row.total_sims)}</td>
                            <td className="py-1.5 text-right text-slate-400">{pct(cnt, totalSims)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Billing vs Actual ────────────────────────────────────────────────────

function BillingComparisonTab({ data }: { data: AnalyticsData }) {
  const [sortCol, setSortCol]     = useState<'dump' | 'billing' | 'variance' | 'pct'>('dump')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter]       = useState<'all' | 'large' | 'missing'>('all')

  const billingMap = new Map<string, BillingRecord>()
  data.billingData.forEach(r => billingMap.set(r.customer_id, r))

  // Build comparison rows for matched customers
  const rows: CustomerRow[] = data.simData
    .filter(r => r.match_status === 'matched' && r.customer_id)
    .map(r => {
      const billing   = billingMap.get(r.customer_id!)
      const bSims     = billing?.active_sims ?? null
      const varN      = bSims !== null ? bSims - r.total_sims : null
      const varP      = varN !== null && r.total_sims > 0 ? (varN / r.total_sims) * 100 : null
      return {
        customerId:  r.customer_id,
        rawName:     r.customer_name_raw,
        displayName: billing?.customers?.name ?? r.customer_name_raw,
        matchStatus: r.match_status,
        dumpSims:    r.total_sims,
        billingSims: bSims,
        variance:    varN,
        variancePct: varP,
        byPlan:      r.by_plan ?? {},
      }
    })

  // Filters
  const filtered = rows.filter(r => {
    if (filter === 'large')   return r.variancePct !== null && Math.abs(r.variancePct) > 10
    if (filter === 'missing') return r.billingSims === null
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let va = 0, vb = 0
    if (sortCol === 'dump')    { va = a.dumpSims;    vb = b.dumpSims }
    if (sortCol === 'billing') { va = a.billingSims ?? -Infinity; vb = b.billingSims ?? -Infinity }
    if (sortCol === 'variance'){ va = a.variance ?? -Infinity;   vb = b.variance ?? -Infinity }
    if (sortCol === 'pct')     { va = a.variancePct ?? -Infinity;vb = b.variancePct ?? -Infinity }
    return sortDir === 'desc' ? vb - va : va - vb
  })

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col
      ? sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronUp className="w-3 h-3 inline ml-1" />
      : null

  const dumpTotal    = sorted.reduce((s, r) => s + r.dumpSims, 0)
  const billingTotal = sorted.reduce((s, r) => s + (r.billingSims ?? 0), 0)
  const varTotal     = billingTotal - dumpTotal
  const varPctTotal  = dumpTotal > 0 ? (varTotal / dumpTotal) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'large', 'missing'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
              filter === f
                ? 'bg-[#1565c0] text-white border-[#1565c0]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {f === 'all'     && `All Customers (${rows.length})`}
            {f === 'large'   && `Large Variance >10% (${rows.filter(r => r.variancePct !== null && Math.abs(r.variancePct) > 10).length})`}
            {f === 'missing' && `No Billing Record (${rows.filter(r => r.billingSims === null).length})`}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">
          🟢 ≤2% · 🟡 2–10% · 🔴 &gt;10% variance
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">#</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">CUSTOMER</th>
                <th
                  className="px-4 py-3 font-semibold text-slate-600 text-xs text-right cursor-pointer hover:text-[#1565c0] select-none"
                  onClick={() => toggleSort('dump')}
                >
                  DUMP SIMs<SortIcon col="dump" />
                </th>
                <th
                  className="px-4 py-3 font-semibold text-slate-600 text-xs text-right cursor-pointer hover:text-[#1565c0] select-none"
                  onClick={() => toggleSort('billing')}
                >
                  BILLING SIMs<SortIcon col="billing" />
                </th>
                <th
                  className="px-4 py-3 font-semibold text-slate-600 text-xs text-right cursor-pointer hover:text-[#1565c0] select-none"
                  onClick={() => toggleSort('variance')}
                >
                  VARIANCE<SortIcon col="variance" />
                </th>
                <th
                  className="px-4 py-3 font-semibold text-slate-600 text-xs text-right cursor-pointer hover:text-[#1565c0] select-none"
                  onClick={() => toggleSort('pct')}
                >
                  % VAR<SortIcon col="pct" />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">TOP PLAN (DUMP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((row, i) => {
                const topPlanEntry = Object.entries(row.byPlan).sort((a, b) => b[1] - a[1])[0]
                return (
                  <tr key={row.rawName} className={cn('hover:bg-slate-50 transition-colors', varianceBg(row.variancePct))}>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">{row.displayName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{fmt(row.dumpSims)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                      {row.billingSims !== null ? fmt(row.billingSims) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-mono font-semibold', varianceColor(row.variancePct))}>
                      {row.variance !== null
                        ? (row.variance >= 0 ? '+' : '') + fmt(row.variance)
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className={cn('px-4 py-2.5 text-right text-xs font-bold', varianceColor(row.variancePct))}>
                      {row.variancePct !== null
                        ? (row.variancePct >= 0 ? '+' : '') + row.variancePct.toFixed(1) + '%'
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {topPlanEntry
                        ? <span>{topPlanEntry[0]} <span className="text-slate-400">({fmt(topPlanEntry[1])})</span></span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <td className="px-4 py-2.5 text-slate-600 text-xs" colSpan={2}>TOTAL ({sorted.length} customers)</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(dumpTotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(billingTotal)}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono', varianceColor(varPctTotal))}>
                  {(varTotal >= 0 ? '+' : '') + fmt(varTotal)}
                </td>
                <td className={cn('px-4 py-2.5 text-right text-xs font-bold', varianceColor(varPctTotal))}>
                  {(varPctTotal >= 0 ? '+' : '') + varPctTotal.toFixed(1) + '%'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Month-on-Month Trends ────────────────────────────────────────────────

function TrendsTab({ data, selectedMonth }: { data: AnalyticsData; selectedMonth: string }) {
  // Build billing name lookup
  const billingMap = new Map<string, string>()
  data.billingData.forEach(r => {
    if (r.customer_id && r.customers?.name) billingMap.set(r.customer_id, r.customers.name)
  })

  // Get all months from change log
  const allMonths = Array.from(new Set(data.changeLog.map(r => r.upload_month))).sort().reverse()

  // Build per-customer timeline: { rawName -> { month -> {total, netChange} } }
  const timeline: Record<string, Record<string, { total: number; net: number | null }>> = {}
  data.changeLog.forEach(r => {
    if (!timeline[r.customer_name_raw]) timeline[r.customer_name_raw] = {}
    timeline[r.customer_name_raw][r.upload_month] = { total: r.total_sims, net: r.net_change }
  })

  // For current month entries
  const currentMonthEntries = data.changeLog.filter(r => r.upload_month === selectedMonth)
    .sort((a, b) => b.total_sims - a.total_sims)

  const months5 = allMonths.slice(0, 5)

  if (allMonths.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-12 text-center">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Not enough data for trends</p>
        <p className="text-xs text-slate-400 mt-1">Upload data for at least 2 months to see month-on-month changes</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Current month MoM summary */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Month-on-Month Changes — {selectedMonth}</h3>
          <span className="text-xs text-slate-400">{currentMonthEntries.length} customers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">CUSTOMER</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">PREV MONTH</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">THIS MONTH</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">NET CHANGE</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right">TREND</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentMonthEntries.map(row => {
                const displayName = (row.customer_id ? billingMap.get(row.customer_id) : null) ?? row.customer_name_raw
                const net = row.net_change
                const netColor = net === null ? 'text-slate-400'
                  : net > 0  ? 'text-emerald-600'
                  : net < 0  ? 'text-red-600'
                  : 'text-slate-500'
                return (
                  <tr key={row.customer_name_raw} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">{displayName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                      {row.prev_total_sims !== null ? fmt(row.prev_total_sims) : <span className="text-slate-300">New</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700 font-semibold">{fmt(row.total_sims)}</td>
                    <td className={cn('px-4 py-2.5 text-right font-mono font-semibold', netColor)}>
                      {net !== null ? (net >= 0 ? '+' : '') + fmt(net) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {net === null   ? <Minus className="w-4 h-4 text-slate-300 ml-auto" /> :
                       net > 100      ? <TrendingUp className="w-4 h-4 text-emerald-500 ml-auto" /> :
                       net < -100     ? <TrendingDown className="w-4 h-4 text-red-500 ml-auto" /> :
                                        <Minus className="w-4 h-4 text-slate-400 ml-auto" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <td className="px-4 py-2.5 text-slate-600 text-xs">TOTAL</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                  {fmt(currentMonthEntries.reduce((s, r) => s + (r.prev_total_sims ?? 0), 0))}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                  {fmt(currentMonthEntries.reduce((s, r) => s + r.total_sims, 0))}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                  {(() => {
                    const t = currentMonthEntries.reduce((s, r) => s + (r.net_change ?? 0), 0)
                    return (t >= 0 ? '+' : '') + fmt(t)
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Multi-month trend grid */}
      {months5.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Historical SIM Counts ({months5.length} months)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs sticky left-0 bg-slate-50">CUSTOMER</th>
                  {months5.map(m => (
                    <th key={m} className="px-4 py-2.5 font-semibold text-slate-600 text-xs text-right whitespace-nowrap">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(timeline)
                  .filter(([, months]) => Object.keys(months).length > 0)
                  .sort(([, a], [, b]) => {
                    const latestA = a[months5[0]]?.total ?? 0
                    const latestB = b[months5[0]]?.total ?? 0
                    return latestB - latestA
                  })
                  .slice(0, 20)
                  .map(([rawName, monthData]) => {
                    const customerId = data.changeLog.find(r => r.customer_name_raw === rawName)?.customer_id
                    const displayName = (customerId ? billingMap.get(customerId) : null) ?? rawName
                    return (
                      <tr key={rawName} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-800 text-xs max-w-[160px] truncate sticky left-0 bg-white">{displayName}</td>
                        {months5.map(m => {
                          const entry = monthData[m]
                          return (
                            <td key={m} className="px-4 py-2.5 text-right font-mono text-slate-700 text-xs">
                              {entry ? fmt(entry.total) : <span className="text-slate-300">—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Client Component ────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',            icon: BarChart3    },
  { id: 'plans',      label: 'Plan Breakdown',       icon: Layers       },
  { id: 'billing',    label: 'Billing vs Actual',    icon: Activity     },
  { id: 'trends',     label: 'Month-on-Month',       icon: TrendingUp   },
] as const

type TabId = (typeof TABS)[number]['id']

export function SimInventoryClient({ months }: { months: string[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string>(months[0] ?? '')
  const [activeTab,     setActiveTab]     = useState<TabId>('overview')
  const [data,          setData]          = useState<AnalyticsData | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const fetchData = useCallback(async (month: string) => {
    if (!month) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sim-analytics?month=${encodeURIComponent(month)}`)
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(selectedMonth) }, [selectedMonth, fetchData])

  if (months.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-16 text-center">
        <Wifi className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-semibold text-lg">No SIM Data Yet</p>
        <p className="text-sm text-slate-400 mt-2">Upload a monthly SIM dump from the SIM Inventory Upload page to see analytics here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Month selector + status badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Month:</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
          >
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {data && !loading && (
          <div className="flex gap-2 text-xs flex-wrap">
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-full font-medium border border-emerald-100">
              <CheckCircle2 className="w-3 h-3" />
              {data.simData.filter(r => r.match_status === 'matched').length} matched
            </span>
            {data.simData.filter(r => r.match_status === 'pending').length > 0 && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-full font-medium border border-amber-100">
                <Clock className="w-3 h-3" />
                {data.simData.filter(r => r.match_status === 'pending').length} pending
              </span>
            )}
            {data.simData.filter(r => r.match_status === 'other_unit').length > 0 && (
              <span className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-1.5 rounded-full font-medium border border-slate-200">
                <XCircle className="w-3 h-3" />
                {data.simData.filter(r => r.match_status === 'other_unit').length} other unit
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 border-2 border-[#1565c0] border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 shadow-sm p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors flex-1 justify-center',
              activeTab === id
                ? 'bg-[#1565c0] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {data && !loading && (
        <>
          {activeTab === 'overview' && <OverviewTab data={data} month={selectedMonth} />}
          {activeTab === 'plans'    && <PlanBreakdownTab data={data} />}
          {activeTab === 'billing'  && <BillingComparisonTab data={data} />}
          {activeTab === 'trends'   && <TrendsTab data={data} selectedMonth={selectedMonth} />}
        </>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-16 text-center">
          <div className="w-8 h-8 border-2 border-[#1565c0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading analytics…</p>
        </div>
      )}
    </div>
  )
}
