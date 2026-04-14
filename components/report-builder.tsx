'use client'

import React, { useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { downloadExcel } from '@/lib/export-excel'
import {
  BarChart2, Users, Smartphone, TrendingUp, GitCompare,
  Download, SlidersHorizontal, PlayCircle, ChevronRight,
} from 'lucide-react'

/* ─────────────────────────── types ─────────────────────────── */

type ReportType = 'monthly_abf' | 'nam_performance' | 'customer_sim' | 'active_leads' | 'fy_comparison'

interface Filters {
  fromMonth: string
  toMonth: string
  singleMonth: string
  nam: string
  vertical: string
  category: string
  status: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

/* ─────────────────────────── constants ─────────────────────────── */

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { id: 'monthly_abf',     label: 'Monthly ABF Summary',   icon: BarChart2,    desc: 'ABF & Revenue per customer for a date range',          color: '#f57c00' },
  { id: 'nam_performance', label: 'NAM Performance',        icon: Users,        desc: 'Consolidated ABF/Revenue/SIMs grouped by NAM',         color: '#1a237e' },
  { id: 'customer_sim',    label: 'Customer SIM Status',    icon: Smartphone,   desc: 'Active SIMs & billing status for a selected month',    color: '#2e7d32' },
  { id: 'active_leads',    label: 'Active Leads (Stage 4)', icon: TrendingUp,   desc: 'PO pipeline with per-opportunity monthly ABF',         color: '#0d47a1' },
  { id: 'fy_comparison',   label: 'FY Comparison',          icon: GitCompare,   desc: 'FY 2025-26 vs FY 2026-27 ABF & Revenue side by side',  color: '#6a1b9a' },
]

/* ─────────────────────────── helpers ─────────────────────────── */

function cr(v: number) { return parseFloat(v.toFixed(3)) }
function pct(a: number, b: number) {
  if (!b) return ''
  return parseFloat((((a - b) / b) * 100).toFixed(1))
}

/* ─────────────────────────── main component ─────────────────────────── */

export function ReportBuilder({
  allMonths,
  allNams,
}: {
  allMonths: string[]
  allNams: string[]
}) {
  const defaultFrom = allMonths[allMonths.length - 1] ?? new Date().toISOString().slice(0, 7)
  const defaultTo   = allMonths[0] ?? new Date().toISOString().slice(0, 7)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [reportType, setReportType] = useState<ReportType | null>(null)
  const [filters, setFilters] = useState<Filters>({
    fromMonth:   defaultFrom,
    toMonth:     defaultTo,
    singleMonth: defaultTo,
    nam:         '',
    vertical:    '',
    category:    '',
    status:      '',
  })
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)

  const supabase = getSupabase()

  function setF(key: keyof Filters) {
    return (v: string) => setFilters(prev => ({ ...prev, [key]: v }))
  }

  /* ── generate ── */
  async function generate() {
    if (!reportType) return
    setLoading(true)
    setError('')
    setGenerated(false)

    try {
      let result: Row[] = []

      if (reportType === 'monthly_abf') {
        const { data, error: e } = await supabase
          .from('monthly_records')
          .select('*, customer:customers(name, nam_name, product_vertical, main_category)')
          .gte('month', filters.fromMonth)
          .lte('month', filters.toMonth)
          .order('month', { ascending: false })
        if (e) throw e
        result = (data ?? [])
          .filter(r => {
            if (filters.nam      && r.customer?.nam_name        !== filters.nam)      return false
            if (filters.vertical && r.customer?.product_vertical !== filters.vertical) return false
            if (filters.category && r.customer?.main_category   !== filters.category) return false
            return true
          })
          .map(r => ({
            Month:              r.month,
            Customer:           r.customer?.name ?? '—',
            NAM:                r.customer?.nam_name ?? '—',
            Vertical:           r.customer?.product_vertical ?? '—',
            Category:           r.customer?.main_category ?? '—',
            'Active SIMs':      r.active_sims,
            'ABF (₹ Cr)':       cr(r.abf_amount ?? 0),
            'Revenue (₹ Cr)':   cr(r.revenue_realised ?? 0),
            'Efficiency %':     r.abf_amount ? parseFloat(((r.revenue_realised / r.abf_amount) * 100).toFixed(1)) : 0,
            'Pending SIMs':     r.commissioning_pending,
            Notes:              r.notes ?? '',
          }))

      } else if (reportType === 'nam_performance') {
        const { data, error: e } = await supabase
          .from('monthly_records')
          .select('*, customer:customers(name, nam_name, product_vertical, main_category)')
          .gte('month', filters.fromMonth)
          .lte('month', filters.toMonth)
        if (e) throw e
        const map = new Map<string, { customers: Set<string>; sims: number; abf: number; rev: number }>()
        for (const r of (data ?? [])) {
          const nam = r.customer?.nam_name ?? 'Unassigned'
          if (!map.has(nam)) map.set(nam, { customers: new Set(), sims: 0, abf: 0, rev: 0 })
          const m = map.get(nam)!
          m.customers.add(r.customer?.name ?? '')
          m.sims += r.active_sims ?? 0
          m.abf  += r.abf_amount ?? 0
          m.rev  += r.revenue_realised ?? 0
        }
        result = Array.from(map.entries())
          .sort((a, b) => b[1].abf - a[1].abf)
          .map(([nam, m]) => ({
            NAM:                nam,
            Customers:          m.customers.size,
            'Active SIMs':      m.sims,
            'Total ABF (₹ Cr)': cr(m.abf),
            'Total Rev (₹ Cr)': cr(m.rev),
            'Avg Efficiency %': m.abf ? parseFloat(((m.rev / m.abf) * 100).toFixed(1)) : 0,
          }))

      } else if (reportType === 'customer_sim') {
        const { data, error: e } = await supabase
          .from('monthly_records')
          .select('*, customer:customers(name, nam_name, product_vertical, main_category)')
          .eq('month', filters.singleMonth)
        if (e) throw e
        result = (data ?? [])
          .filter(r => {
            if (filters.nam      && r.customer?.nam_name        !== filters.nam)      return false
            if (filters.vertical && r.customer?.product_vertical !== filters.vertical) return false
            if (filters.category && r.customer?.main_category   !== filters.category) return false
            return true
          })
          .sort((a, b) => (b.abf_amount ?? 0) - (a.abf_amount ?? 0))
          .map(r => ({
            Customer:           r.customer?.name ?? '—',
            NAM:                r.customer?.nam_name ?? '—',
            Vertical:           r.customer?.product_vertical ?? '—',
            Category:           r.customer?.main_category ?? '—',
            'Active SIMs':      r.active_sims,
            'ABF (₹ Cr)':       cr(r.abf_amount ?? 0),
            'Revenue (₹ Cr)':   cr(r.revenue_realised ?? 0),
            'Efficiency %':     r.abf_amount ? parseFloat(((r.revenue_realised / r.abf_amount) * 100).toFixed(1)) : 0,
            'Pending SIMs':     r.commissioning_pending,
            Notes:              r.notes ?? '',
          }))

      } else if (reportType === 'active_leads') {
        let q = supabase
          .from('funnel_opportunities')
          .select('*')
          .eq('funnel_stage', 4)
        if (filters.vertical) q = q.eq('product_vertical', filters.vertical)
        if (filters.category) q = q.eq('main_category', filters.category)
        if (filters.status)   q = q.eq('commissioned_status', filters.status)
        const { data, error: e } = await q.order('po_value', { ascending: false })
        if (e) throw e
        result = (data ?? []).map(r => {
          const frac = (r.quantity && r.commissioned_qty) ? Math.min(r.commissioned_qty / r.quantity, 1) : 1
          const mAbf = r.annualized_value ? cr((r.annualized_value / 12) * frac) : ''
          return {
            'Opp ID':               r.opp_id ?? '',
            Customer:               r.customer_name,
            NAM:                    r.nam_name ?? '',
            Category:               r.main_category ?? '',
            Product:                r.product_name ?? '',
            Vertical:               r.product_vertical ?? '',
            'PO Value (₹ Cr)':      r.po_value ?? '',
            'PO Date':              r.po_date ?? '',
            'Contract (Y)':         r.contract_period ?? '',
            'Qty Committed':        r.quantity ?? '',
            'Qty Commissioned':     r.commissioned_qty ?? '',
            'Monthly ABF (₹ Cr)':   mAbf,
            'ABF Generated (₹ Cr)': r.abf_generated_total ?? '',
            Status:                 r.commissioned_status ?? '',
          }
        })

      } else if (reportType === 'fy_comparison') {
        const [{ data: d1 }, { data: d2 }] = await Promise.all([
          supabase
            .from('monthly_records')
            .select('*, customer:customers(name, nam_name, product_vertical, main_category)')
            .gte('month', '2025-04').lte('month', '2026-03'),
          supabase
            .from('monthly_records')
            .select('*, customer:customers(name, nam_name, product_vertical, main_category)')
            .gte('month', '2026-04').lte('month', '2027-03'),
        ])

        const map25 = new Map<string, { abf: number; rev: number; nam: string; vert: string }>()
        const map26 = new Map<string, { abf: number; rev: number }>()

        for (const r of (d1 ?? [])) {
          const k = r.customer?.name ?? ''
          if (!map25.has(k)) map25.set(k, { abf: 0, rev: 0, nam: r.customer?.nam_name ?? '', vert: r.customer?.product_vertical ?? '' })
          const m = map25.get(k)!; m.abf += r.abf_amount ?? 0; m.rev += r.revenue_realised ?? 0
        }
        for (const r of (d2 ?? [])) {
          const k = r.customer?.name ?? ''
          if (!map26.has(k)) map26.set(k, { abf: 0, rev: 0 })
          const m = map26.get(k)!; m.abf += r.abf_amount ?? 0; m.rev += r.revenue_realised ?? 0
        }

        const allCustomers = new Set([...Array.from(map25.keys()), ...Array.from(map26.keys())])
        result = Array.from(allCustomers)
          .filter(c => {
            const meta = map25.get(c) ?? { nam: '', vert: '' }
            if (filters.nam      && (meta as {nam:string}).nam  !== filters.nam)      return false
            if (filters.vertical && (meta as {vert:string}).vert !== filters.vertical) return false
            return true
          })
          .map(c => {
            const a = map25.get(c) ?? { abf: 0, rev: 0, nam: '', vert: '' }
            const b = map26.get(c) ?? { abf: 0, rev: 0 }
            return {
              Customer:             c,
              NAM:                  (a as {nam:string}).nam,
              Vertical:             (a as {vert:string}).vert,
              'FY25-26 ABF (₹ Cr)': cr(a.abf),
              'FY25-26 Rev (₹ Cr)': cr(a.rev),
              'FY26-27 ABF (₹ Cr)': cr(b.abf),
              'FY26-27 Rev (₹ Cr)': cr(b.rev),
              'ABF Growth %':       pct(b.abf, a.abf),
              'Rev Growth %':       pct(b.rev, a.rev),
            }
          })
          .sort((a, b) => (b['FY25-26 ABF (₹ Cr)'] as number) - (a['FY25-26 ABF (₹ Cr)'] as number))
      }

      setRows(result)
      setGenerated(true)
      setStep(3)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  /* ── export ── */
  function handleExport() {
    const rdef = REPORT_TYPES.find(r => r.id === reportType)
    const label = rdef?.label.replace(/\s+/g, '_') ?? 'Report'
    const date = new Date().toISOString().slice(0, 10)
    downloadExcel(rows, `${label}_${date}`)
  }

  /* ── UI ── */
  const rdef = REPORT_TYPES.find(r => r.id === reportType)

  const needsDateRange  = reportType === 'monthly_abf' || reportType === 'nam_performance'
  const needsSingleMonth = reportType === 'customer_sim'
  const needsNam        = reportType !== 'active_leads'
  const needsVertical   = true
  const needsCategory   = reportType !== 'nam_performance'
  const needsStatus     = reportType === 'active_leads'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold">Custom Report Builder</h1>
        <p className="text-sm text-slate-500 mt-1">Select a report type, configure filters, and export to Excel</p>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {(['1. Report Type', '2. Filters', '3. Results'] as const).map((label, i) => (
          <React.Fragment key={label}>
            <span
              className={`px-3 py-1 rounded-full ${step > i + 1 ? 'bg-green-100 text-green-700' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              {label}
            </span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Report Type ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_TYPES.map(r => {
          const Icon = r.icon
          const active = reportType === r.id
          return (
            <button
              key={r.id}
              onClick={() => { setReportType(r.id); setStep(2); setGenerated(false); setRows([]) }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${active ? 'shadow-md' : 'bg-white hover:shadow-sm border-slate-200 hover:border-slate-300'}`}
              style={active ? { borderColor: r.color, background: `${r.color}10` } : {}}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" style={{ color: r.color }} />
                <span className="font-semibold text-sm text-slate-800">{r.label}</span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">{r.desc}</p>
            </button>
          )
        })}
      </div>

      {/* ── Step 2: Filters ── */}
      {reportType && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {rdef && <span className="ml-1 text-xs font-normal px-2 py-0.5 rounded-full text-white" style={{ background: rdef.color }}>{rdef.label}</span>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Date range */}
            {needsDateRange && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">From Month</label>
                  <select value={filters.fromMonth} onChange={e => setF('fromMonth')(e.target.value)}
                    className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                    {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">To Month</label>
                  <select value={filters.toMonth} onChange={e => setF('toMonth')(e.target.value)}
                    className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                    {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Single month */}
            {needsSingleMonth && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Month</label>
                <select value={filters.singleMonth} onChange={e => setF('singleMonth')(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                  {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* FY Comparison — fixed, show info */}
            {reportType === 'fy_comparison' && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 block mb-1">Period</label>
                <div className="text-sm px-2 py-1.5 rounded border bg-slate-50 text-slate-600">
                  FY 2025-26 (Apr 2025 – Mar 2026)  vs  FY 2026-27 (Apr 2026 – Mar 2027)
                </div>
              </div>
            )}

            {/* NAM */}
            {needsNam && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">NAM</label>
                <select value={filters.nam} onChange={e => setF('nam')(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                  <option value="">All NAMs</option>
                  {allNams.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}

            {/* Vertical */}
            {needsVertical && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Vertical</label>
                <select value={filters.vertical} onChange={e => setF('vertical')(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                  <option value="">All Verticals</option>
                  {['CM', 'EB', 'CFA'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {/* Category */}
            {needsCategory && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Category</label>
                <select value={filters.category} onChange={e => setF('category')(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                  <option value="">All Categories</option>
                  {['GOVT', 'PRIVATE', 'PSU'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Status (Active Leads only) */}
            {needsStatus && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                <select value={filters.status} onChange={e => setF('status')(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1">
                  <option value="">All Statuses</option>
                  {['Full', 'Partial'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: rdef?.color ?? '#1a237e' }}
          >
            <PlayCircle className="w-4 h-4" />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}

      {generated && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <strong className="text-slate-800">{rows.length}</strong> row{rows.length !== 1 ? 's' : ''} generated
              {rdef && <span className="ml-2 text-xs text-slate-400">— {rdef.label}</span>}
            </div>
            <button
              onClick={handleExport}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#2e7d32' }}
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-slate-400 text-sm">
              No data found for the selected filters.
            </div>
          ) : (
            <ResultsTable rows={rows} reportType={reportType!} color={rdef?.color ?? '#1a237e'} />
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── results table ─────────────────────────── */

function ResultsTable({ rows, color }: { rows: Row[]; reportType: ReportType; color: string }) {
  const cols = Object.keys(rows[0] ?? {})

  // Numeric columns for right-alignment
  const numericCols = new Set([
    'Active SIMs', 'ABF (₹ Cr)', 'Revenue (₹ Cr)', 'Efficiency %',
    'Total ABF (₹ Cr)', 'Total Rev (₹ Cr)', 'Avg Efficiency %',
    'Pending SIMs', 'Customers', 'PO Value (₹ Cr)', 'Qty Committed',
    'Qty Commissioned', 'Monthly ABF (₹ Cr)', 'ABF Generated (₹ Cr)',
    'Contract (Y)', 'FY25-26 ABF (₹ Cr)', 'FY25-26 Rev (₹ Cr)',
    'FY26-27 ABF (₹ Cr)', 'FY26-27 Rev (₹ Cr)', 'ABF Growth %', 'Rev Growth %',
  ])

  // Totals footer for numeric columns
  const totals: Row = {}
  for (const col of cols) {
    if (numericCols.has(col)) {
      const sum = rows.reduce((s, r) => s + (typeof r[col] === 'number' ? r[col] : 0), 0)
      totals[col] = col.includes('%') ? '—' : parseFloat(sum.toFixed(3))
    }
  }

  function cellColor(col: string, val: unknown) {
    if (col === 'ABF Growth %' || col === 'Rev Growth %') {
      if (typeof val === 'number') return val >= 0 ? '#2e7d32' : '#c62828'
    }
    if (col === 'Efficiency %' || col === 'Avg Efficiency %') {
      if (typeof val === 'number') {
        if (val >= 80) return '#2e7d32'
        if (val >= 50) return '#f57c00'
        return '#c62828'
      }
    }
    return undefined
  }

  return (
    <div className="rounded-xl border overflow-x-auto bg-white">
      <table className="w-full text-sm whitespace-nowrap">
        <thead style={{ background: `${color}12` }}>
          <tr>
            {cols.map(col => (
              <th
                key={col}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide border-b ${numericCols.has(col) ? 'text-right' : 'text-left'}`}
                style={{ color }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {cols.map(col => {
                const val = row[col]
                const right = numericCols.has(col)
                const fc = cellColor(col, val)
                return (
                  <td
                    key={col}
                    className={`px-3 py-2 ${right ? 'text-right font-medium' : 'text-slate-700'}`}
                    style={{ color: fc }}
                    title={typeof val === 'string' ? val : undefined}
                  >
                    {col === 'Opp ID'
                      ? <span className="font-mono text-xs text-slate-500">{val ?? '—'}</span>
                      : (val === '' || val === null || val === undefined) ? '—'
                      : typeof val === 'number'
                        ? (col.includes('%') ? `${val}%` : val.toLocaleString('en-IN'))
                        : <span className="max-w-[180px] truncate block" title={String(val)}>{String(val)}</span>
                    }
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 bg-slate-100 font-bold text-xs">
            {cols.map((col, i) => {
              const right = numericCols.has(col)
              return (
                <td key={col} className={`px-3 py-2 ${right ? 'text-right' : ''}`} style={{ color: i === 0 ? '#374151' : undefined }}>
                  {i === 0
                    ? `${rows.length} row${rows.length !== 1 ? 's' : ''}`
                    : right
                      ? totals[col] !== undefined
                        ? (typeof totals[col] === 'number'
                          ? (col.includes('%') ? '—' : totals[col].toLocaleString('en-IN'))
                          : totals[col])
                        : ''
                      : ''}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
