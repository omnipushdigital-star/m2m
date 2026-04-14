'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, CheckCircle2, AlertTriangle, XCircle,
  Loader2, FileText, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { jaccardScore, normalizeName } from '@/lib/fuzzy-match'

// ── Types ─────────────────────────────────────────────────────────────────────
type Customer = { id: string; name: string }

type CustomerAgg = {
  customer_name_raw: string
  customer_id:       string | null
  match_status:      'matched' | 'pending'
  total_sims:        number
  by_plan:           Record<string, number>
  by_apn:            Record<string, number>
  by_service_center: Record<string, number>
}

type UploadSummary = {
  customers:  number
  totalSims:  number
  pending:    number
}

// ── Column positions (0-indexed) ──────────────────────────────────────────────
const COL = { external_id: 0, caf_no: 1, imsi: 2, sim_no: 3, customer_name: 4, service_center: 5, plan: 6, apn: 7 }

const STREAM_CHUNK = 8 * 1024 * 1024   // 8 MB slices for streaming
const FUZZY_THRESHOLD = 0.5

// ── Stream-parse the file in 8 MB slices ─────────────────────────────────────
// Yields arrays of complete lines, carries partial lines between slices.
async function* streamLines(file: File): AsyncGenerator<string[]> {
  let offset  = 0
  let leftover = ''
  while (offset < file.size) {
    const slice = file.slice(offset, offset + STREAM_CHUNK)
    const text  = await slice.text()
    const combined = leftover + text
    const lines    = combined.split(/\r?\n/)
    leftover = lines.pop() ?? ''
    yield lines.filter(l => l.trim())
    offset += STREAM_CHUNK
  }
  if (leftover.trim()) yield [leftover]
}

// ── Auto-detect delimiter ─────────────────────────────────────────────────────
function detectDelim(line: string): string {
  return (line.match(/\t/g)?.length ?? 0) >= (line.match(/,/g)?.length ?? 0) ? '\t' : ','
}

// ── Build per-customer aggregates from the entire file ────────────────────────
async function aggregateFile(
  file:        File,
  customers:   Customer[],
  onProgress:  (bytesRead: number, totalBytes: number) => void,
): Promise<CustomerAgg[]> {
  const custTokens = customers.map(c => ({ id: c.id, name: c.name, tokens: normalizeName(c.name) }))
  const matchCache = new Map<string, { id: string | null; status: 'matched' | 'pending' }>()

  function matchName(raw: string): { id: string | null; status: 'matched' | 'pending' } {
    if (matchCache.has(raw)) return matchCache.get(raw)!
    const tokens = normalizeName(raw)
    let bestId = null as string | null
    let bestScore = 0
    for (const c of custTokens) {
      const s = jaccardScore(tokens, c.tokens)
      if (s > bestScore) { bestScore = s; bestId = c.id }
    }
    const result = bestScore >= FUZZY_THRESHOLD
      ? { id: bestId, status: 'matched' as const }
      : { id: null,   status: 'pending' as const }
    matchCache.set(raw, result)
    return result
  }

  const aggMap = new Map<string, CustomerAgg>()
  let delim   = ''
  let isFirst = true
  let bytesRead = 0

  for await (const lines of streamLines(file)) {
    for (const line of lines) {
      if (isFirst) {
        delim   = detectDelim(line)
        isFirst = false
        // Skip header if first column is not numeric
        const firstCell = line.split(delim)[0].trim()
        if (isNaN(Number(firstCell))) continue
      }

      const cols = line.split(delim)
      if (cols.length < 8) continue

      const imsi            = cols[COL.imsi]?.trim()
      const customerNameRaw = cols[COL.customer_name]?.trim() ?? ''
      const plan            = cols[COL.plan]?.trim()  ?? 'Unknown'
      const apn             = cols[COL.apn]?.trim()   ?? 'Unknown'
      const sc              = cols[COL.service_center]?.trim() ?? 'Unknown'

      if (!imsi || !customerNameRaw) continue

      if (!aggMap.has(customerNameRaw)) {
        const { id, status } = matchName(customerNameRaw)
        aggMap.set(customerNameRaw, {
          customer_name_raw: customerNameRaw,
          customer_id:       id,
          match_status:      status,
          total_sims:        0,
          by_plan:           {},
          by_apn:            {},
          by_service_center: {},
        })
      }

      const agg = aggMap.get(customerNameRaw)!
      agg.total_sims++
      agg.by_plan[plan]  = (agg.by_plan[plan]  ?? 0) + 1
      agg.by_apn[apn]    = (agg.by_apn[apn]    ?? 0) + 1
      agg.by_service_center[sc] = (agg.by_service_center[sc] ?? 0) + 1
    }
    bytesRead = Math.min(bytesRead + STREAM_CHUNK, file.size)
    onProgress(bytesRead, file.size)
  }

  return Array.from(aggMap.values()).sort((a, b) => b.total_sims - a.total_sims)
}

// ── Resolve a pending match ───────────────────────────────────────────────────
async function resolveMatch(customerNameRaw: string, customerId: string) {
  await fetch('/api/sim-upload/resolve-match', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ customerNameRaw, customerId }),
  })
}

// ── SIM Upload Client ─────────────────────────────────────────────────────────
export function SimUploadClient({ customers }: { customers: Customer[] }) {
  const [dragOver,    setDragOver]    = useState(false)
  const [file,        setFile]        = useState<File | null>(null)
  const [uploadMonth, setUploadMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [phase,       setPhase]       = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle')
  const [progress,    setProgress]    = useState(0)   // 0–100
  const [summary,     setSummary]     = useState<UploadSummary | null>(null)
  const [aggregates,  setAggregates]  = useState<CustomerAgg[]>([])
  const [errorMsg,    setErrorMsg]    = useState('')
  const [showPending, setShowPending] = useState(true)
  const [matchSearch, setMatchSearch] = useState('')
  const [resolved,    setResolved]    = useState<Set<string>>(new Set())
  const [resolving,   setResolving]   = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setPhase('idle')
    setSummary(null)
    setAggregates([])
    setErrorMsg('')
    setResolved(new Set())
  }, [])

  async function startUpload() {
    if (!file || !uploadMonth) return
    setErrorMsg('')
    setSummary(null)
    setAggregates([])
    setResolved(new Set())

    try {
      // 1. Stream-parse and aggregate in browser
      setPhase('parsing')
      setProgress(0)
      const aggs = await aggregateFile(
        file, customers,
        (done, total) => setProgress(Math.round((done / total) * 80)),
      )

      if (aggs.length === 0) {
        setErrorMsg('No valid SIM rows found. Check file format (8 columns, tab or comma delimited).')
        setPhase('error')
        return
      }

      setAggregates(aggs)

      // 2. Send summaries to API (single call, ~38 rows)
      setPhase('uploading')
      setProgress(85)

      const res = await fetch('/api/sim-upload/summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ summaries: aggs, uploadMonth }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setProgress(100)
      setSummary({ customers: data.customers, totalSims: data.totalSims, pending: data.pending })
      setPhase('done')

    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  async function handleResolve(customerNameRaw: string, customerId: string) {
    setResolving(customerNameRaw)
    try {
      await resolveMatch(customerNameRaw, customerId)

      // Also update summary row in DB
      await fetch('/api/sim-upload/summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          summaries: aggregates
            .filter(a => a.customer_name_raw === customerNameRaw)
            .map(a => ({ ...a, customer_id: customerId, match_status: 'matched' as const })),
          uploadMonth,
        }),
      })

      setResolved(prev => new Set([...Array.from(prev), customerNameRaw]))
    } finally {
      setResolving(null)
    }
  }

  const isRunning = phase === 'parsing' || phase === 'uploading'
  const pending   = aggregates.filter(a => a.match_status === 'pending' && !resolved.has(a.customer_name_raw))
  const filtered  = matchSearch
    ? pending.filter(a => a.customer_name_raw.toLowerCase().includes(matchSearch.toLowerCase()))
    : pending

  return (
    <div className="space-y-6">

      {/* ── Step 1: Month ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">1. Select Upload Month</h2>
        <input
          type="month"
          value={uploadMonth}
          onChange={e => setUploadMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRunning}
        />
        <p className="text-xs text-slate-400 mt-1">Month the SIM dump was exported.</p>
      </div>

      {/* ── Step 2: File ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">2. Upload SIM File</h2>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver     ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
            isRunning && 'pointer-events-none opacity-60',
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.tsv,.dat"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-blue-500" />
              <p className="font-semibold text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB — click to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-slate-300" />
              <p className="text-slate-500 font-medium">Drag &amp; drop SIM dump file here</p>
              <p className="text-xs text-slate-400">or click to browse · .txt / .csv / .tsv accepted</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 3: Process ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">3. Process Upload</h2>
        <button
          onClick={startUpload}
          disabled={!file || !uploadMonth || isRunning}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors',
            file && uploadMonth && !isRunning
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          )}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isRunning
            ? phase === 'parsing'   ? 'Parsing file…' : 'Saving to database…'
            : 'Start Upload'}
        </button>

        {isRunning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{phase === 'parsing' ? 'Reading & aggregating SIM file…' : 'Saving summaries…'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            {phase === 'parsing' && (
              <p className="text-xs text-slate-400">
                Processing {(file!.size / 1024 / 1024).toFixed(0)} MB in 8 MB chunks — no data sent yet
              </p>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      {summary && phase === 'done' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-slate-700">Upload Complete — {uploadMonth}</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Customers Matched', value: summary.customers - summary.pending, color: '#2e7d32' },
              { label: 'Total Active SIMs',  value: summary.totalSims,                 color: '#1565c0' },
              { label: 'Needs Review',        value: summary.pending,                  color: '#f57c00' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-4 text-center" style={{ background: `${s.color}12` }}>
                <p className="text-2xl font-extrabold" style={{ color: s.color }}>
                  {s.value.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-customer breakdown table */}
          {aggregates.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="pb-2 font-semibold">Customer (Raw Name)</th>
                    <th className="pb-2 font-semibold text-right">Total SIMs</th>
                    <th className="pb-2 font-semibold">Top Plan</th>
                    <th className="pb-2 font-semibold">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {aggregates.map(a => {
                    const topPlan = Object.entries(a.by_plan).sort((x, y) => y[1] - x[1])[0]
                    return (
                      <tr key={a.customer_name_raw} className="hover:bg-slate-50">
                        <td className="py-1.5 font-medium text-slate-700">{a.customer_name_raw}</td>
                        <td className="py-1.5 text-right font-bold">{a.total_sims.toLocaleString('en-IN')}</td>
                        <td className="py-1.5 text-slate-500">{topPlan?.[0] ?? '—'}</td>
                        <td className="py-1.5">
                          {resolved.has(a.customer_name_raw) ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Resolved</span>
                          ) : a.match_status === 'matched' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Matched</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Review</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Pending matches ───────────────────────────────────────────────── */}
      {pending.length > 0 && phase === 'done' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <button
            onClick={() => setShowPending(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-700 text-sm">Ambiguous Customer Names — Needs Review</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {pending.length} remaining
              </span>
            </div>
            {showPending ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showPending && (
            <div className="border-t">
              <div className="px-5 py-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer name…"
                    value={matchSearch}
                    onChange={e => setMatchSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="divide-y max-h-80 overflow-y-auto">
                {filtered.map(a => (
                  <MatchRow
                    key={a.customer_name_raw}
                    nameRaw={a.customer_name_raw}
                    totalSims={a.total_sims}
                    customers={customers}
                    resolving={resolving === a.customer_name_raw}
                    onResolve={customerId => handleResolve(a.customer_name_raw, customerId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Match row ─────────────────────────────────────────────────────────────────
function MatchRow({
  nameRaw, totalSims, customers, resolving, onResolve,
}: {
  nameRaw:   string
  totalSims: number
  customers: Customer[]
  resolving: boolean
  onResolve: (customerId: string) => void
}) {
  const [selected, setSelected] = useState('')

  return (
    <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">{nameRaw}</p>
        <p className="text-[11px] text-slate-400">{totalSims.toLocaleString('en-IN')} SIMs</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
        >
          <option value="">— select customer —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={() => onResolve(selected)}
          disabled={!selected || resolving}
          className={cn(
            'flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors',
            selected && !resolving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          )}
        >
          {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Confirm
        </button>
      </div>
    </div>
  )
}
