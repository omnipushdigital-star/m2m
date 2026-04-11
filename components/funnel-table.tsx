'use client'

import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'

const categoryColors: Record<string, string> = {
  GOVT:    '#1a237e',
  PRIVATE: '#f57c00',
  PSU:     '#2e7d32',
}

type FunnelRow = {
  id: string
  customer_name: string
  nam_name: string | null
  main_category: string | null
  product_name: string | null
  quantity: number | null
  business_type: string | null
  // Stage 1
  base_tariff?: number | null
  commitment?: number | null
  stage_week1?: number | null
  remarks_current?: string | null
  // Stage 4
  po_value?: number | null
  po_date?: string | null
  contract_period?: number | null
  commissioned_qty?: number | null
  commissioned_status?: string | null
}

// Generic dropdown filter derived from unique values in a column
function ColFilter({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white w-full mt-1 focus:outline-none focus:ring-1"
      style={{ minWidth: 80 }}
    >
      <option value="">All</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// Text search filter
function TextFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Search…"
      className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white w-full mt-1 focus:outline-none focus:ring-1"
      style={{ minWidth: 80 }}
    />
  )
}

export function FunnelTable({
  data,
  stage,
}: {
  data: FunnelRow[]
  stage: 1 | 4
}) {
  const [filters, setFilters] = useState({
    customer: '',
    nam: '',
    category: '',
    product: '',
    business_type: '',
    status: '',     // stage 4 only
  })

  const set = (key: keyof typeof filters) => (v: string) =>
    setFilters(prev => ({ ...prev, [key]: v }))

  // Unique option lists
  function uniq(arr: string[]) {
    return Array.from(new Set(arr)).sort()
  }
  const opts = useMemo(() => ({
    nam:           uniq(data.map(r => r.nam_name ?? '').filter(Boolean)),
    category:      uniq(data.map(r => r.main_category ?? '').filter(Boolean)),
    product:       uniq(data.map(r => r.product_name ?? '').filter(Boolean)),
    business_type: uniq(data.map(r => r.business_type ?? '').filter(Boolean)),
    status:        uniq(data.map(r => r.commissioned_status ?? '').filter(Boolean)),
  }), [data])

  const filtered = useMemo(() => data.filter(r => {
    if (filters.customer && !r.customer_name.toLowerCase().includes(filters.customer.toLowerCase())) return false
    if (filters.nam && r.nam_name !== filters.nam) return false
    if (filters.category && r.main_category !== filters.category) return false
    if (filters.product && r.product_name !== filters.product) return false
    if (filters.business_type && r.business_type !== filters.business_type) return false
    if (stage === 4 && filters.status && r.commissioned_status !== filters.status) return false
    return true
  }), [data, filters, stage])

  const totalValue = filtered.reduce((s, r) =>
    s + (stage === 1 ? (r.base_tariff ?? 0) : (r.po_value ?? 0)), 0)

  const hasFilter = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-3">
      {/* Active filter count + clear */}
      {hasFilter && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800">{filtered.length}</strong> of {data.length} rows</span>
          <button
            onClick={() => setFilters({ customer: '', nam: '', category: '', product: '', business_type: '', status: '' })}
            className="px-2 py-0.5 rounded text-white text-xs font-medium"
            style={{ background: '#f57c00' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b">
            <tr>
              {/* Customer */}
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[160px]">
                Customer
                <TextFilter value={filters.customer} onChange={set('customer')} />
              </th>
              {/* NAM */}
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[120px]">
                NAM
                <ColFilter options={opts.nam} value={filters.nam} onChange={set('nam')} />
              </th>
              {/* Category */}
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[100px]">
                Category
                <ColFilter options={opts.category} value={filters.category} onChange={set('category')} />
              </th>
              {/* Product */}
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[160px]">
                Product
                <ColFilter options={opts.product} value={filters.product} onChange={set('product')} />
              </th>
              {/* Qty */}
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide min-w-[80px]">
                Qty
                <div className="mt-1 h-[26px]" />
              </th>
              {/* Value */}
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide min-w-[100px]">
                {stage === 1 ? 'Value (₹ Cr)' : 'PO Value (₹ Cr)'}
                <div className="mt-1 h-[26px]" />
              </th>

              {stage === 1 ? (
                <>
                  <th className="px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide min-w-[90px]">
                    Commitment
                    <div className="mt-1 h-[26px]" />
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide min-w-[80px]">
                    Stage Wk1
                    <div className="mt-1 h-[26px]" />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[180px]">
                    Current Remarks
                    <div className="mt-1 h-[26px]" />
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[110px]">
                    PO Date
                    <div className="mt-1 h-[26px]" />
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide min-w-[90px]">
                    Contract (Y)
                    <div className="mt-1 h-[26px]" />
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide min-w-[100px]">
                    Comm. Qty
                    <div className="mt-1 h-[26px]" />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[90px]">
                    Status
                    <ColFilter options={opts.status} value={filters.status} onChange={set('status')} />
                  </th>
                </>
              )}

              {/* Business Type */}
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide min-w-[120px]">
                Business Type
                <ColFilter options={opts.business_type} value={filters.business_type} onChange={set('business_type')} />
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={stage === 1 ? 10 : 10} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 font-semibold text-slate-800 max-w-[200px] truncate" title={r.customer_name}>
                    {r.customer_name}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.nam_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                      style={{ background: categoryColors[r.main_category ?? ''] ?? '#9e9e9e' }}
                    >
                      {r.main_category ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate" title={r.product_name ?? ''}>
                    {r.product_name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {r.quantity ? Number(r.quantity).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: stage === 1 ? '#f57c00' : '#2e7d32' }}>
                    {stage === 1
                      ? (r.base_tariff != null ? Number(r.base_tariff).toFixed(2) : '—')
                      : (r.po_value != null ? Number(r.po_value).toFixed(2) : '—')
                    }
                  </td>

                  {stage === 1 ? (
                    <>
                      <td className="px-3 py-2 text-center">
                        {r.commitment != null ? (
                          <span
                            className="inline-flex w-6 h-6 rounded-full text-white text-xs font-bold items-center justify-center"
                            style={{ background: '#2e7d32' }}
                          >
                            {r.commitment}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">{r.stage_week1 ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate" title={r.remarks_current ?? ''}>
                        {r.remarks_current ?? '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-slate-600">{r.po_date ?? '—'}</td>
                      <td className="px-3 py-2 text-center">{r.contract_period ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {r.commissioned_qty ? Number(r.commissioned_qty).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.commissioned_status ? (
                          <Badge
                            className="text-xs border-none"
                            style={{
                              background: r.commissioned_status === 'Full' ? '#e8f5e9' : '#fff3e0',
                              color: r.commissioned_status === 'Full' ? '#2e7d32' : '#e65100',
                            }}
                          >
                            {r.commissioned_status}
                          </Badge>
                        ) : '—'}
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-xs">{r.business_type ?? '—'}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Totals footer */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t bg-slate-100 font-bold text-xs">
                <td className="px-3 py-2" colSpan={4}>
                  {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                  {hasFilter ? ` (filtered from ${data.length})` : ''}
                </td>
                <td className="px-3 py-2 text-right">
                  {filtered.reduce((s, r) => s + (r.quantity ?? 0), 0).toLocaleString('en-IN')}
                </td>
                <td className="px-3 py-2 text-right" style={{ color: stage === 1 ? '#f57c00' : '#2e7d32' }}>
                  {totalValue.toFixed(2)} Cr
                </td>
                <td colSpan={stage === 1 ? 4 : 4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
