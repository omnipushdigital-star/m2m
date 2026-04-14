'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export type CustomerEntry = {
  id:        string | null
  name:      string
  totalSims: number
  byPlan:    Record<string, number>
}

export type PlanEntry = {
  plan:  string
  total: number
}

export function SimSnapshotClient({
  plans,
  customers,
  totalSims,
  month,
}: {
  plans:     PlanEntry[]
  customers: CustomerEntry[]
  totalSims: number
  month:     string
}) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const maxPlanSims = plans[0]?.total ?? 1

  // Right panel: if a plan is selected, show customers on that plan sorted by plan count
  // Otherwise show top 10 by total SIMs
  const rightRows = selectedPlan
    ? customers
        .filter(c => (c.byPlan[selectedPlan] ?? 0) > 0)
        .map(c => ({ name: c.name, sims: c.byPlan[selectedPlan] ?? 0, id: c.id }))
        .sort((a, b) => b.sims - a.sims)
    : customers
        .slice(0, 10)
        .map(c => ({ name: c.name, sims: c.totalSims, id: c.id }))

  const rightTotal  = rightRows.reduce((s, r) => s + r.sims, 0)
  const rightMax    = rightRows[0]?.sims ?? 1

  function fmt(n: number) {
    return n.toLocaleString('en-IN')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded bg-[#1565c0]" />
          SIM Inventory Snapshot
        </h2>
        <span className="text-xs bg-[#1565c0]/10 text-[#1565c0] font-semibold px-3 py-1 rounded-full">
          {month} · {fmt(totalSims)} SIMs
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Left: Plans ── */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Plan-wise SIM Count</p>
            <p className="text-xs text-slate-400">{plans.length} plans · click to filter</p>
          </div>

          <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
            {plans.map(({ plan, total }) => {
              const barW     = Math.round((total / maxPlanSims) * 100)
              const sharePct = totalSims > 0 ? ((total / totalSims) * 100).toFixed(1) : '0'
              const isActive = selectedPlan === plan

              return (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(isActive ? null : plan)}
                  className={cn(
                    'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors',
                    isActive
                      ? 'bg-[#1565c0]/8 border-l-2 border-[#1565c0]'
                      : 'hover:bg-slate-50 border-l-2 border-transparent'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium truncate', isActive ? 'text-[#1565c0]' : 'text-slate-700')}>
                      {plan}
                    </p>
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn('h-1.5 rounded-full transition-all', isActive ? 'bg-[#1565c0]' : 'bg-[#1565c0]/50')}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className={cn('text-sm font-mono font-semibold', isActive ? 'text-[#1565c0]' : 'text-slate-800')}>
                      {fmt(total)}
                    </p>
                    <p className="text-xs text-slate-400">{sharePct}%</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">TOTAL</span>
            <span className="text-sm font-mono font-bold text-slate-800">{fmt(totalSims)}</span>
          </div>
        </div>

        {/* ── Right: Customers ── */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            {selectedPlan ? (
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  Customers on <span className="text-[#1565c0]">{selectedPlan}</span>
                </p>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="shrink-0 text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  clear
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-700">Top 10 Customers by SIM Count</p>
            )}
            <p className="text-xs text-slate-400 shrink-0 ml-2">{rightRows.length} customers</p>
          </div>

          <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
            {rightRows.map((row, i) => {
              const barW     = Math.round((row.sims / rightMax) * 100)
              const sharePct = rightTotal > 0 ? ((row.sims / rightTotal) * 100).toFixed(1) : '0'

              return (
                <div key={row.id ?? row.name} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                  <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{row.name}</p>
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-[#2e7d32] transition-all"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className="text-sm font-mono font-semibold text-slate-800">{fmt(row.sims)}</p>
                    <p className="text-xs text-slate-400">{sharePct}%</p>
                  </div>
                </div>
              )
            })}

            {rightRows.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                No customers found on this plan
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">
              {selectedPlan ? 'PLAN TOTAL' : 'TOTAL (top 10)'}
            </span>
            <span className="text-sm font-mono font-bold text-slate-800">{fmt(rightTotal)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
