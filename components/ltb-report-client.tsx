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
  tender_negotiation: string | null
  prev_stage?: number | null
  funnel_stage: number
  product_name: string | null
  product_details: string | null
  quantity: number | null
  base_tariff: number | null
  after_discount: number | null
  after_negotiation: number | null
  po_value: number | null
  contract_period: number | null
  commissioned_qty: number | null
  commissioning_pending: number | null
  commissioned_status: string | null
  po_date: string | null
  remarks_current: string | null
  commitment: number | null
  stage_week1: number | null
  stage_week2: number | null
  stage_week3: number | null
  stage_week4: number | null
  stage_current: number | null
}

type Customer = { id: string; name: string; nam_name: string | null; product_vertical: string | null }
type Monthly  = { customer_id: string; month: string; abf_amount: number; revenue_realised: number; active_sims: number }

const MONTHS_FY = [
  '2025-04','2025-05','2025-06','2025-07','2025-08','2025-09',
  '2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04',
]

const MONTH_LABELS: Record<string, string> = {
  '2025-04':'Apr-25','2025-05':'May-25','2025-06':'Jun-25','2025-07':'Jul-25',
  '2025-08':'Aug-25','2025-09':'Sep-25','2025-10':'Oct-25','2025-11':'Nov-25',
  '2025-12':'Dec-25','2026-01':'Jan-26','2026-02':'Feb-26','2026-03':'Mar-26','2026-04':'Apr-26',
}

function fmt(v: number | null | undefined) {
  if (!v) return ''
  return v.toLocaleString('en-IN')
}

function fmtCr(v: number | null | undefined) {
  if (!v) return ''
  return v.toFixed(3)
}

export function LtbReportClient({
  opps,
  customers,
  monthly,
}: {
  opps: Opp[]
  customers: Customer[]
  monthly: Monthly[]
}) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [activeTab, setActiveTab] = useState<'stage4' | 'stage1' | 'billing'>('stage4')

  // Build billing map: customerId → month → {abf, rev}
  const billingMap = useMemo(() => {
    const m = new Map<string, Map<string, { abf: number; rev: number }>>()
    for (const r of monthly) {
      if (!m.has(r.customer_id)) m.set(r.customer_id, new Map())
      m.get(r.customer_id)!.set(r.month, { abf: r.abf_amount, rev: r.revenue_realised })
    }
    return m
  }, [monthly])

  // Customer name → id map
  const custIdMap = useMemo(() =>
    new Map(customers.map(c => [c.name.toUpperCase(), c.id])), [customers])

  const stage4 = opps.filter(o => o.funnel_stage === 4)
  const stage1 = opps.filter(o => o.funnel_stage === 1)

  // Available months in data
  const availableMonths = MONTHS_FY.filter(m => m <= currentMonth)

  function exportExcel() {
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Stage 4 (Lead-wise Commissioning & Billing) ──
    const s4Headers = [
      'Opp ID','Customer','Category','NAM','Business Type','Product','Details',
      'Qty','Base Tariff','After Nego','PO Value','Contract (Y)','Comm. Qty','Pending','Status',
      'PO Date','ABF Generated (₹ Cr)',
    ]
    const s4Rows = stage4.map(r => {
      const custId = custIdMap.get(r.customer_name.toUpperCase())
      const billing = custId ? billingMap.get(custId) : null
      const totalAbf = billing
        ? Array.from(billing.values()).reduce((s, v) => s + v.abf, 0)
        : 0
      return [
        r.opp_id, r.customer_name, r.main_category, r.nam_name, r.business_type,
        r.product_name, r.product_details, r.quantity,
        r.base_tariff, r.after_negotiation, r.po_value,
        r.contract_period, r.commissioned_qty, r.commissioning_pending,
        r.commissioned_status, r.po_date, totalAbf.toFixed(3),
      ]
    })
    const ws1 = XLSX.utils.aoa_to_sheet([s4Headers, ...s4Rows])
    XLSX.utils.book_append_sheet(wb, ws1, 'Lead-wise Comm & Billing')

    // ── Sheet 2: Stage 1 Pipeline ──
    const s1Headers = [
      'Opp ID','Customer','Category','NAM','Business Type','Product','Qty',
      'Base Tariff (₹ Cr)','Stage Wk1','Stage Wk2','Stage Wk3','Stage Wk4','Current Stage','Commitment','Current Remarks',
    ]
    const s1Rows = stage1.map(r => [
      r.opp_id, r.customer_name, r.main_category, r.nam_name, r.business_type,
      r.product_name, r.quantity, r.base_tariff,
      r.stage_week1, r.stage_week2, r.stage_week3, r.stage_week4, r.stage_current,
      r.commitment, r.remarks_current,
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([s1Headers, ...s1Rows])
    XLSX.utils.book_append_sheet(wb, ws2, 'Stage 1 Pipeline')

    // ── Sheet 3: Monthly Billing Summary ──
    const billingHeaders = [
      'Customer','Vertical','NAM',
      ...availableMonths.flatMap(m => [`${MONTH_LABELS[m]} ABF`, `${MONTH_LABELS[m]} Rev`]),
      'Total ABF (₹ Cr)', 'Total Revenue (₹ Cr)',
    ]
    const billingRows = customers
      .filter(c => billingMap.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => {
        const bm = billingMap.get(c.id)!
        const monthVals = availableMonths.flatMap(m => {
          const v = bm.get(m)
          return [v?.abf ?? 0, v?.rev ?? 0]
        })
        const totalAbf = availableMonths.reduce((s, m) => s + (bm.get(m)?.abf ?? 0), 0)
        const totalRev = availableMonths.reduce((s, m) => s + (bm.get(m)?.rev ?? 0), 0)
        return [c.name, c.product_vertical ?? '', c.nam_name ?? '', ...monthVals, totalAbf, totalRev]
      })
    const ws3 = XLSX.utils.aoa_to_sheet([billingHeaders, ...billingRows])
    XLSX.utils.book_append_sheet(wb, ws3, 'Monthly Billing Summary')

    XLSX.writeFile(wb, `GGN_Lead_to_Bill_${selectedMonth}.xlsx`)
  }

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
      activeTab === t
        ? 'border-[#1565c0] text-[#1565c0] bg-white'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 rounded" style={{ background: '#1565c0' }} />
            Lead to Bill Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">GGN Unit · EB Platinum · FY 2025-26</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Month:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#1565c0' } as React.CSSProperties}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{MONTH_LABELS[m] ?? m}</option>
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

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Stage 4 Deals', value: String(stage4.length), color: '#2e7d32' },
          { label: 'PO Value (₹ Cr)', value: stage4.reduce((s,r) => s+(r.po_value??0), 0).toFixed(2), color: '#2e7d32' },
          { label: 'Stage 1 Pipeline', value: String(stage1.length), color: '#f57c00' },
          { label: 'Pipeline Value (₹ Cr)', value: stage1.reduce((s,r) => s+(r.base_tariff??0), 0).toFixed(2), color: '#f57c00' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg shadow-sm p-4" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button className={tabClass('stage4')} onClick={() => setActiveTab('stage4')}>Stage 4 — Commissioned</button>
          <button className={tabClass('stage1')} onClick={() => setActiveTab('stage1')}>Stage 1 — Pipeline</button>
          <button className={tabClass('billing')} onClick={() => setActiveTab('billing')}>Monthly Billing Summary</button>
        </div>
      </div>

      {/* Stage 4 Table */}
      {activeTab === 'stage4' && (
        <div className="rounded-md border overflow-x-auto bg-white">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-xs uppercase tracking-wide">
              <tr>
                {['Opp ID','Customer','Category','NAM','Product','Qty','PO Value (₹Cr)','Contract','Comm. Qty','Pending','Status','PO Date','ABF Gen (₹Cr)'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage4.map((r, i) => {
                const custId = custIdMap.get(r.customer_name.toUpperCase())
                const billing = custId ? billingMap.get(custId) : null
                const totalAbf = billing
                  ? Array.from(billing.values()).reduce((s, v) => s + v.abf, 0)
                  : 0
                return (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 text-slate-400 text-xs">{r.opp_id}</td>
                    <td className="px-3 py-2 font-semibold max-w-[180px] truncate" title={r.customer_name}>{r.customer_name}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                        style={{ background: r.main_category === 'GOVT' ? '#1a237e' : r.main_category === 'PSU' ? '#2e7d32' : '#f57c00' }}>
                        {r.main_category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.nam_name}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate text-slate-600" title={r.product_name ?? ''}>{r.product_name}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.quantity)}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#2e7d32' }}>{fmtCr(r.po_value)}</td>
                    <td className="px-3 py-2 text-center">{r.contract_period ? `${r.contract_period}Y` : '—'}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.commissioned_qty)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmt(r.commissioning_pending)}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: r.commissioned_status === 'Full' ? '#e8f5e9' : '#fff3e0',
                                 color: r.commissioned_status === 'Full' ? '#2e7d32' : '#e65100' }}>
                        {r.commissioned_status ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{r.po_date}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#f57c00' }}>{totalAbf > 0 ? totalAbf.toFixed(3) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-slate-100 font-bold text-xs">
                <td colSpan={6} className="px-3 py-2">{stage4.length} deals</td>
                <td className="px-3 py-2 text-right" style={{ color: '#2e7d32' }}>
                  {stage4.reduce((s, r) => s + (r.po_value ?? 0), 0).toFixed(3)}
                </td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Stage 1 Table */}
      {activeTab === 'stage1' && (
        <div className="rounded-md border overflow-x-auto bg-white">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-xs uppercase tracking-wide">
              <tr>
                {['Opp ID','Customer','Category','NAM','Product','Qty','Value (₹Cr)','Wk1','Wk2','Wk3','Wk4','Current','Commit','Remarks'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stage1.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 text-slate-400 text-xs">{r.opp_id}</td>
                  <td className="px-3 py-2 font-semibold max-w-[180px] truncate" title={r.customer_name}>{r.customer_name}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                      style={{ background: r.main_category === 'GOVT' ? '#1a237e' : r.main_category === 'PSU' ? '#2e7d32' : '#f57c00' }}>
                      {r.main_category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.nam_name}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate text-slate-600">{r.product_name}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.quantity)}</td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: '#f57c00' }}>{fmtCr(r.base_tariff)}</td>
                  {[r.stage_week1, r.stage_week2, r.stage_week3, r.stage_week4, r.stage_current].map((s, j) => (
                    <td key={j} className="px-3 py-2 text-center text-slate-500">{s ?? '—'}</td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {r.commitment != null ? (
                      <span className="inline-flex w-5 h-5 rounded-full text-white text-xs font-bold items-center justify-center"
                        style={{ background: '#2e7d32' }}>{r.commitment}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate text-slate-500" title={r.remarks_current ?? ''}>{r.remarks_current ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly Billing Summary */}
      {activeTab === 'billing' && (
        <div className="rounded-md border overflow-x-auto bg-white">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky left-0 bg-slate-50 z-10">Customer</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">NAM</th>
                {availableMonths.map(m => (
                  <th key={m} className="px-2 py-2.5 text-center text-xs font-semibold" colSpan={2}
                    style={{ borderLeft: '1px solid #e2e8f0' }}>
                    {MONTH_LABELS[m]}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ borderLeft: '2px solid #e2e8f0' }}>Total ABF</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Total Rev</th>
              </tr>
              <tr className="bg-slate-100 text-xs text-slate-500">
                <th className="px-3 py-1 sticky left-0 bg-slate-100" />
                <th className="px-3 py-1" />
                {availableMonths.map(m => (
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
                  const totalAbf = availableMonths.reduce((s, m) => s + (bm.get(m)?.abf ?? 0), 0)
                  const totalRev = availableMonths.reduce((s, m) => s + (bm.get(m)?.rev ?? 0), 0)
                  return (
                    <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2 font-semibold max-w-[180px] truncate sticky left-0 bg-inherit" title={c.name}>{c.name}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{c.nam_name ?? '—'}</td>
                      {availableMonths.map(m => {
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
        </div>
      )}
    </div>
  )
}
