'use client'

import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

type Opp = {
  id: string
  opp_id: number | null
  customer_name: string
  nam_name: string | null
  main_category: string | null
  business_type: string | null
  funnel_stage: number
  product_name: string | null
  product_details: string | null
  product_vertical: string | null
  quantity: number | null
  base_tariff: number | null
  after_discount: number | null
  after_negotiation: number | null
  po_value: number | null
  contract_period: number | null
  commissioned_qty: number | null
  commissioned_status: string | null
  po_date: string | null
  remarks_current: string | null
  commitment: number | null
  stage_week1: number | null
  stage_week2: number | null
  stage_week3: number | null
  stage_week4: number | null
  stage_current: number | null
  annualized_value: number | null
  abf_generated_total: number | null
  billing_cycle: string | null
}

type Customer = { id: string; name: string; nam_name: string | null; product_vertical: string | null }
type Monthly  = { customer_id: string; month: string; abf_amount: number; revenue_realised: number; active_sims: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns "2024-25", "2025-26", etc. from a YYYY-MM-DD date */
function getFY(poDate: string | null): string | null {
  if (!poDate) return null
  const year  = parseInt(poDate.slice(0, 4))
  const month = parseInt(poDate.slice(5, 7))
  if (isNaN(year) || isNaN(month)) return null
  const fyStart = month >= 4 ? year : year - 1
  return `${fyStart}-${String(fyStart + 1).slice(2)}`
}

function monthlyAbf(r: Opp): number | null {
  if (!r.annualized_value) return null
  const frac = r.quantity && r.commissioned_qty
    ? Math.min(r.commissioned_qty / r.quantity, 1)
    : 1
  return (r.annualized_value / 12) * frac
}

function fmt(v: number | null | undefined) {
  if (v == null || v === 0) return ''
  return v.toLocaleString('en-IN')
}
function fmtCr(v: number | null | undefined) {
  if (v == null) return ''
  return v.toFixed(3)
}

const catColor: Record<string, string> = {
  GOVT: '#1a237e', PSU: '#2e7d32', PRIVATE: '#f57c00',
}
const vertColors: Record<string, { bg: string; text: string }> = {
  CM:  { bg: '#e3f2fd', text: '#0d47a1' },
  EB:  { bg: '#e8f5e9', text: '#1b5e20' },
  CFA: { bg: '#fce4ec', text: '#880e4f' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LtbReportClient({
  opps,
  customers,
  monthly,
}: {
  opps: Opp[]
  customers: Customer[]
  monthly: Monthly[]
}) {
  const [activeTab, setActiveTab]   = useState<'stage4' | 'stage1' | 'billing'>('stage4')
  const [fyFilter,  setFyFilter]    = useState<string>('all')

  // All FYs present in stage 4 data (from po_date)
  const availableFYs = useMemo(() => {
    const fys = new Set<string>()
    for (const o of opps) {
      if (o.funnel_stage === 4) {
        const fy = getFY(o.po_date)
        if (fy) fys.add(fy)
      }
    }
    return Array.from(fys).sort()
  }, [opps])

  // Split and filter
  const allStage4  = opps.filter(o => o.funnel_stage === 4)
  const stage4     = fyFilter === 'all'
    ? allStage4
    : allStage4.filter(o => getFY(o.po_date) === fyFilter)
  const stage1     = opps.filter(o => o.funnel_stage === 1)

  // Dynamic month columns from actual billing data
  const billingMonths = useMemo(() => {
    const ms = new Set(monthly.map(r => r.month))
    return Array.from(ms).sort()
  }, [monthly])

  const MONTH_LABEL = (m: string) => {
    const [yr, mo] = m.split('-')
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${names[parseInt(mo) - 1]}-${yr.slice(2)}`
  }

  // Billing map: customerId → month → {abf, rev}
  const billingMap = useMemo(() => {
    const m = new Map<string, Map<string, { abf: number; rev: number }>>()
    for (const r of monthly) {
      if (!m.has(r.customer_id)) m.set(r.customer_id, new Map())
      m.get(r.customer_id)!.set(r.month, { abf: r.abf_amount, rev: r.revenue_realised })
    }
    return m
  }, [monthly])

  const custIdMap = useMemo(() =>
    new Map(customers.map(c => [c.name.toUpperCase(), c.id])), [customers])

  // ── Totals ──
  const totalPO      = stage4.reduce((s, r) => s + (r.po_value ?? 0), 0)
  const totalMonthly = stage4.reduce((s, r) => s + (monthlyAbf(r) ?? 0), 0)
  const totalAbfGen  = stage4.reduce((s, r) => s + (r.abf_generated_total ?? 0), 0)

  // ── Export ──
  function exportExcel() {
    const wb = XLSX.utils.book_new()
    const date = new Date().toISOString().slice(0, 10)

    // Sheet 1: Stage 4
    const s4H = [
      'Opp ID','Customer','Category','NAM','Product','Vertical','Billing Cycle',
      'Qty','PO Value (₹ Cr)','PO Date','FY','Contract (Y)',
      'Comm. Qty','Monthly ABF (₹ Cr)','ABF Generated (₹ Cr)','Status',
    ]
    const s4R = stage4.map(r => [
      r.opp_id, r.customer_name, r.main_category, r.nam_name,
      r.product_name, r.product_vertical ?? '', r.billing_cycle ?? '',
      r.quantity, r.po_value, r.po_date, getFY(r.po_date) ?? '',
      r.contract_period, r.commissioned_qty,
      monthlyAbf(r) != null ? parseFloat((monthlyAbf(r)!).toFixed(3)) : '',
      r.abf_generated_total ?? '', r.commissioned_status ?? '',
    ])
    const ws1 = XLSX.utils.aoa_to_sheet([s4H, ...s4R])
    XLSX.utils.book_append_sheet(wb, ws1, `Stage4_${fyFilter === 'all' ? 'All' : `FY${fyFilter}`}`)

    // Sheet 2: Stage 1
    const s1H = [
      'Opp ID','Customer','Category','NAM','Product','Qty',
      'Base Tariff (₹ Cr)','Wk1','Wk2','Wk3','Wk4','Current','Commitment','Remarks',
    ]
    const s1R = stage1.map(r => [
      r.opp_id, r.customer_name, r.main_category, r.nam_name,
      r.product_name, r.quantity, r.base_tariff,
      r.stage_week1, r.stage_week2, r.stage_week3, r.stage_week4,
      r.stage_current, r.commitment, r.remarks_current,
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([s1H, ...s1R])
    XLSX.utils.book_append_sheet(wb, ws2, 'Stage1_Pipeline')

    // Sheet 3: Monthly Billing
    const bH = [
      'Customer','Vertical','NAM',
      ...billingMonths.flatMap(m => [`${MONTH_LABEL(m)} ABF`, `${MONTH_LABEL(m)} Rev`]),
      'Total ABF (₹ Cr)', 'Total Rev (₹ Cr)',
    ]
    const bR = customers
      .filter(c => billingMap.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => {
        const bm = billingMap.get(c.id)!
        const mv = billingMonths.flatMap(m => { const v = bm.get(m); return [v?.abf ?? 0, v?.rev ?? 0] })
        const ta = billingMonths.reduce((s, m) => s + (bm.get(m)?.abf ?? 0), 0)
        const tr = billingMonths.reduce((s, m) => s + (bm.get(m)?.rev ?? 0), 0)
        return [c.name, c.product_vertical ?? '', c.nam_name ?? '', ...mv, ta, tr]
      })
    const ws3 = XLSX.utils.aoa_to_sheet([bH, ...bR])
    XLSX.utils.book_append_sheet(wb, ws3, 'Monthly_Billing')

    XLSX.writeFile(wb, `GGN_Lead_to_Bill_${date}.xlsx`)
  }

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
      activeTab === t
        ? 'border-[#1565c0] text-[#1565c0] bg-white'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 rounded" style={{ background: '#1565c0' }} />
            Lead to Bill Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">GGN Unit · EB Platinum · All Active POs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Financial Year:</label>
            <select
              value={fyFilter}
              onChange={e => setFyFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All FYs</option>
              {availableFYs.map(fy => (
                <option key={fy} value={fy}>FY {fy}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
            style={{ background: '#2e7d32' }}
          >
            ⬇ Download Excel
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: fyFilter === 'all' ? 'Stage 4 Total POs' : `Stage 4 — FY ${fyFilter}`,
            value: String(stage4.length),               color: '#2e7d32' },
          { label: 'Total PO Value (₹ Cr)',
            value: totalPO.toFixed(2),                  color: '#2e7d32' },
          { label: 'Monthly ABF (₹ Cr)',
            value: totalMonthly.toFixed(3),              color: '#0d47a1' },
          { label: 'ABF Generated (₹ Cr)',
            value: totalAbfGen.toFixed(3),               color: '#6a1b9a' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg shadow-sm p-4" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button className={tabCls('stage4')} onClick={() => setActiveTab('stage4')}>
            Stage 4 — Active POs
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
              style={{ background: '#2e7d32', color: 'white' }}>
              {stage4.length}
            </span>
          </button>
          <button className={tabCls('stage1')} onClick={() => setActiveTab('stage1')}>
            Stage 1 — Pipeline
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
              style={{ background: '#f57c00', color: 'white' }}>
              {stage1.length}
            </span>
          </button>
          <button className={tabCls('billing')} onClick={() => setActiveTab('billing')}>
            Monthly Billing Summary
          </button>
        </div>
      </div>

      {/* ── Stage 4 Table ── */}
      {activeTab === 'stage4' && (
        <div className="rounded-md border overflow-x-auto bg-white">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-xs uppercase tracking-wide">
              <tr>
                {['Opp ID','Customer','Category','NAM','Product','Vert.','Qty','PO Value (₹Cr)','PO Date','FY','Contract','Comm. Qty','Monthly ABF (₹Cr)','ABF Gen (₹Cr)','Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage4.length === 0 ? (
                <tr><td colSpan={15} className="px-4 py-8 text-center text-slate-400">No records for the selected FY.</td></tr>
              ) : stage4.map((r, i) => {
                const mAbf = monthlyAbf(r)
                const vc   = vertColors[r.product_vertical ?? '']
                const fy   = getFY(r.po_date)
                return (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 text-slate-400 font-mono text-xs">{r.opp_id ?? '—'}</td>
                    <td className="px-3 py-2 font-semibold max-w-[160px] truncate" title={r.customer_name}>{r.customer_name}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                        style={{ background: catColor[r.main_category ?? ''] ?? '#9e9e9e' }}>
                        {r.main_category ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{r.nam_name ?? '—'}</td>
                    <td className="px-3 py-2 max-w-[130px] truncate text-slate-600 text-xs" title={r.product_name ?? ''}>{r.product_name ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {r.product_vertical ? (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                          style={vc ? { background: vc.bg, color: vc.text } : { background: '#f3f4f6', color: '#374151' }}>
                          {r.product_vertical}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(r.quantity)}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#2e7d32' }}>{fmtCr(r.po_value)}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{r.po_date ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {fy ? (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: '#f0f4ff', color: '#1a237e' }}>
                          {fy}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">{r.contract_period ? `${r.contract_period}Y` : '—'}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.commissioned_qty)}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#0d47a1' }}>
                      {mAbf != null ? mAbf.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#6a1b9a' }}>
                      {r.abf_generated_total != null ? r.abf_generated_total.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: r.commissioned_status === 'Full' ? '#e8f5e9' : '#fff3e0',
                          color:      r.commissioned_status === 'Full' ? '#2e7d32' : '#e65100',
                        }}>
                        {r.commissioned_status ?? '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {stage4.length > 0 && (
              <tfoot>
                <tr className="border-t bg-slate-100 font-bold text-xs">
                  <td colSpan={6} className="px-3 py-2">{stage4.length} PO{stage4.length !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2 text-right">
                    {stage4.reduce((s, r) => s + (r.quantity ?? 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: '#2e7d32' }}>
                    {totalPO.toFixed(3)}
                  </td>
                  <td colSpan={3} />
                  <td className="px-3 py-2 text-right">
                    {stage4.reduce((s, r) => s + (r.commissioned_qty ?? 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: '#0d47a1' }}>
                    {totalMonthly.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: '#6a1b9a' }}>
                    {totalAbfGen.toFixed(3)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Stage 1 Table ── */}
      {activeTab === 'stage1' && (
        <div className="rounded-md border overflow-x-auto bg-white">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-xs uppercase tracking-wide">
              <tr>
                {['Opp ID','Customer','Category','NAM','Product','Qty','Value (₹Cr)','Wk1','Wk2','Wk3','Wk4','Current','Commit','Remarks'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage1.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-8 text-center text-slate-400">No Stage 1 pipeline data.</td></tr>
              ) : stage1.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 text-slate-400 font-mono text-xs">{r.opp_id ?? '—'}</td>
                  <td className="px-3 py-2 font-semibold max-w-[160px] truncate" title={r.customer_name}>{r.customer_name}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                      style={{ background: catColor[r.main_category ?? ''] ?? '#9e9e9e' }}>
                      {r.main_category ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{r.nam_name ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[130px] truncate text-slate-600 text-xs" title={r.product_name ?? ''}>{r.product_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.quantity)}</td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: '#f57c00' }}>{fmtCr(r.base_tariff)}</td>
                  {[r.stage_week1, r.stage_week2, r.stage_week3, r.stage_week4, r.stage_current].map((s, j) => (
                    <td key={j} className="px-3 py-2 text-center text-slate-500">{s ?? '—'}</td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {r.commitment != null
                      ? <span className="inline-flex w-5 h-5 rounded-full text-white text-xs font-bold items-center justify-center" style={{ background: '#2e7d32' }}>{r.commitment}</span>
                      : '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate text-slate-500 text-xs" title={r.remarks_current ?? ''}>{r.remarks_current ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Monthly Billing Summary ── */}
      {activeTab === 'billing' && (
        <div className="rounded-md border overflow-x-auto bg-white">
          {billingMonths.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No monthly billing records found.</div>
          ) : (
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky left-0 bg-slate-50 z-10">Customer</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">NAM</th>
                  {billingMonths.map(m => (
                    <th key={m} className="px-2 py-2.5 text-center text-xs font-semibold" colSpan={2}
                      style={{ borderLeft: '1px solid #e2e8f0' }}>
                      {MONTH_LABEL(m)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ borderLeft: '2px solid #e2e8f0' }}>Total ABF</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Total Rev</th>
                </tr>
                <tr className="bg-slate-100 text-xs text-slate-500">
                  <th className="px-3 py-1 sticky left-0 bg-slate-100" />
                  <th className="px-3 py-1" />
                  {billingMonths.map(m => (
                    <React.Fragment key={m}>
                      <th className="px-2 py-1 text-center font-medium" style={{ borderLeft: '1px solid #e2e8f0' }}>ABF</th>
                      <th className="px-2 py-1 text-center font-medium">Rev</th>
                    </React.Fragment>
                  ))}
                  <th className="px-3 py-1" style={{ borderLeft: '2px solid #e2e8f0' }} />
                  <th className="px-3 py-1" />
                </tr>
              </thead>
              <tbody>
                {customers
                  .filter(c => billingMap.has(c.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c, i) => {
                    const bm = billingMap.get(c.id)!
                    const totalAbf = billingMonths.reduce((s, m) => s + (bm.get(m)?.abf ?? 0), 0)
                    const totalRev = billingMonths.reduce((s, m) => s + (bm.get(m)?.rev ?? 0), 0)
                    return (
                      <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-2 font-semibold max-w-[160px] truncate sticky left-0 bg-inherit text-xs" title={c.name}>{c.name}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{c.nam_name ?? '—'}</td>
                        {billingMonths.map(m => {
                          const v = bm.get(m)
                          return (
                            <React.Fragment key={m}>
                              <td className="px-2 py-2 text-right text-xs" style={{ borderLeft: '1px solid #f1f5f9', color: '#f57c00' }}>
                                {v?.abf ? v.abf.toFixed(3) : ''}
                              </td>
                              <td className="px-2 py-2 text-right text-xs" style={{ color: '#2e7d32' }}>
                                {v?.rev ? v.rev.toFixed(3) : ''}
                              </td>
                            </React.Fragment>
                          )
                        })}
                        <td className="px-3 py-2 text-right font-bold text-xs" style={{ borderLeft: '2px solid #e2e8f0', color: '#f57c00' }}>
                          {totalAbf > 0 ? totalAbf.toFixed(3) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-xs" style={{ color: '#2e7d32' }}>
                          {totalRev > 0 ? totalRev.toFixed(3) : '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
