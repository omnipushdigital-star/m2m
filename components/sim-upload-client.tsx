'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, CheckCircle2, AlertTriangle, XCircle,
  Loader2, FileText, ChevronDown, ChevronUp, Search, Cloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { jaccardScore, normalizeName } from '@/lib/fuzzy-match'
import { getSupabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
type Customer = { id: string; name: string }

type CustomerSummary = {
  customer_name_raw: string
  customer_id:       string | null
  match_status:      'matched' | 'pending'
  total_sims:        number
  by_plan:           Record<string, number>
  by_apn:            Record<string, number>
  by_service_center: Record<string, number>
}

// ── Column positions ───────────────────────────────────────────────────────────
const COL = { external_id: 0, caf_no: 1, imsi: 2, sim_no: 3, customer_name: 4, service_center: 5, plan: 6, apn: 7 }

const STREAM_CHUNK = 8 * 1024 * 1024   // 8 MB read slices
const FUZZY_MIN    = 0.5

// ── Stream file lines ─────────────────────────────────────────────────────────
async function* streamLines(file: File): AsyncGenerator<string[]> {
  let offset   = 0
  let leftover = ''
  while (offset < file.size) {
    const text  = await file.slice(offset, offset + STREAM_CHUNK).text()
    const lines = (leftover + text).split(/\r?\n/)
    leftover    = lines.pop() ?? ''
    yield lines.filter(l => l.trim())
    offset += STREAM_CHUNK
  }
  if (leftover.trim()) yield [leftover]
}

// ── Parse + aggregate by customer ────────────────────────────────────────────
async function parseAndAggregate(
  file:        File,
  customers:   Customer[],
  uploadMonth: string,
  onProgress:  (parsed: number) => void,
): Promise<CustomerSummary[]> {
  const custTokens = customers.map(c => ({ id: c.id, tokens: normalizeName(c.name) }))
  const matchCache = new Map<string, { id: string | null; status: 'matched' | 'pending' }>()

  function match(raw: string) {
    if (matchCache.has(raw)) return matchCache.get(raw)!
    const tokens = normalizeName(raw)
    let bestId = null as string | null, bestScore = 0
    for (const c of custTokens) {
      const s = jaccardScore(tokens, c.tokens)
      if (s > bestScore) { bestScore = s; bestId = c.id }
    }
    const result = bestScore >= FUZZY_MIN
      ? { id: bestId, status: 'matched' as const }
      : { id: null,   status: 'pending' as const }
    matchCache.set(raw, result)
    return result
  }

  const aggMap = new Map<string, CustomerSummary>()
  let delim = '', skip = false, count = 0

  for await (const lines of streamLines(file)) {
    for (const line of lines) {
      if (!delim) {
        delim = (line.match(/\t/g)?.length ?? 0) >= (line.match(/,/g)?.length ?? 0) ? '\t' : ','
        skip  = isNaN(Number(line.split(delim)[0].trim()))
      }
      if (skip) { skip = false; continue }

      const cols = line.split(delim)
      if (cols.length < 8) continue
      const imsi = cols[COL.imsi]?.trim()
      if (!imsi) continue

      const raw  = cols[COL.customer_name]?.trim() ?? ''
      const plan = cols[COL.plan]?.trim()           ?? 'Unknown'
      const apn  = cols[COL.apn]?.trim()            ?? 'Unknown'
      const sc   = cols[COL.service_center]?.trim() ?? 'Unknown'

      if (!aggMap.has(raw)) {
        const { id, status } = match(raw)
        aggMap.set(raw, { customer_name_raw: raw, customer_id: id, match_status: status,
          total_sims: 0, by_plan: {}, by_apn: {}, by_service_center: {} })
      }
      const agg = aggMap.get(raw)!
      agg.total_sims++
      agg.by_plan[plan] = (agg.by_plan[plan] ?? 0) + 1
      agg.by_apn[apn]   = (agg.by_apn[apn]   ?? 0) + 1
      agg.by_service_center[sc] = (agg.by_service_center[sc] ?? 0) + 1

      count++
      if (count % 50000 === 0) onProgress(count)
    }
    onProgress(count)
  }
  return Array.from(aggMap.values()).sort((a, b) => b.total_sims - a.total_sims)
}

// ── Upload file to R2 via pre-signed URL (XHR for progress) ──────────────────
function uploadToR2(file: File, url: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', 'text/plain')
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)) }
    xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`R2 upload failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('R2 upload network error'))
    xhr.send(file)
  })
}

// ── Save summaries to Supabase ────────────────────────────────────────────────
async function saveSummaries(summaries: CustomerSummary[], uploadMonth: string) {
  const supabase = getSupabase()

  // Get previous month for net-change calculation
  const d = new Date(`${uploadMonth}-01`)
  d.setMonth(d.getMonth() - 1)
  const prevMonth = d.toISOString().slice(0, 7)

  const { data: prevData } = await supabase
    .from('sim_customer_summary')
    .select('customer_name_raw, total_sims')
    .eq('upload_month', prevMonth)

  const prevMap = new Map((prevData ?? []).map(r => [r.customer_name_raw, r.total_sims as number]))

  const summaryRows = summaries.map(s => ({
    customer_name_raw:  s.customer_name_raw,
    customer_id:        s.customer_id,
    match_status:       s.match_status,
    upload_month:       uploadMonth,
    total_sims:         s.total_sims,
    by_plan:            s.by_plan,
    by_apn:             s.by_apn,
    by_service_center:  s.by_service_center,
    updated_at:         new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('sim_customer_summary')
    .upsert(summaryRows, { onConflict: 'customer_name_raw,upload_month' })

  if (error) throw new Error(error.message)

  // Change log
  const changeRows = summaries.map(s => {
    const prev = prevMap.get(s.customer_name_raw) ?? null
    return {
      upload_month:      uploadMonth,
      customer_name_raw: s.customer_name_raw,
      customer_id:       s.customer_id,
      total_sims:        s.total_sims,
      prev_total_sims:   prev,
      net_change:        prev !== null ? s.total_sims - prev : null,
    }
  })

  await supabase
    .from('sim_change_log')
    .upsert(changeRows, { onConflict: 'customer_name_raw,upload_month' })
}

// ── SIM Upload Client ─────────────────────────────────────────────────────────
export function SimUploadClient({ customers }: { customers: Customer[] }) {
  const [dragOver,    setDragOver]    = useState(false)
  const [file,        setFile]        = useState<File | null>(null)
  const [uploadMonth, setUploadMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [phase,       setPhase]       = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [r2Pct,       setR2Pct]       = useState(0)
  const [parsed,      setParsed]      = useState(0)
  const [step,        setStep]        = useState('')
  const [summaries,   setSummaries]   = useState<CustomerSummary[]>([])
  const [totalSims,   setTotalSims]   = useState(0)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [showPending, setShowPending] = useState(true)
  const [matchSearch, setMatchSearch] = useState('')
  const [resolved,    setResolved]    = useState<Set<string>>(new Set())
  const [resolving,   setResolving]   = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f); setPhase('idle'); setSummaries([]); setErrorMsg('')
    setResolved(new Set()); setR2Pct(0); setParsed(0)
  }, [])

  async function startUpload() {
    if (!file || !uploadMonth) return
    setErrorMsg(''); setSummaries([]); setResolved(new Set())
    setPhase('running'); setR2Pct(0); setParsed(0)

    try {
      // 1 — Get R2 pre-signed URL
      setStep('Preparing upload…')
      const presignRes = await fetch(`/api/r2-presign?month=${uploadMonth}`)
      const { url: r2Url, error: presignErr } = await presignRes.json()
      if (presignErr) throw new Error(presignErr)

      // 2 — Upload to R2 + parse file IN PARALLEL
      setStep('Uploading to R2 & parsing…')
      const [aggs] = await Promise.all([
        parseAndAggregate(file, customers, uploadMonth, p => setParsed(p)),
        uploadToR2(file, r2Url, pct => setR2Pct(pct)),
      ])

      if (aggs.length === 0) throw new Error('No valid SIM rows found. Check file format.')

      const total = aggs.reduce((s, a) => s + a.total_sims, 0)
      setTotalSims(total)

      // 3 — Save summaries to Supabase (38 rows, fast)
      setStep('Saving summaries…')
      await saveSummaries(aggs, uploadMonth)

      setSummaries(aggs)
      setPhase('done')

    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  async function handleResolve(raw: string, customerId: string) {
    setResolving(raw)
    try {
      const supabase = getSupabase()
      await supabase.from('sim_customer_summary')
        .update({ customer_id: customerId, match_status: 'matched' })
        .eq('customer_name_raw', raw)
      setResolved(prev => new Set([...Array.from(prev), raw]))
    } finally { setResolving(null) }
  }

  const isRunning = phase === 'running'
  const pending   = summaries.filter(s => s.match_status === 'pending' && !resolved.has(s.customer_name_raw))
  const filtered  = matchSearch
    ? pending.filter(s => s.customer_name_raw.toLowerCase().includes(matchSearch.toLowerCase()))
    : pending

  return (
    <div className="space-y-6">

      {/* Step 1 — Month */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">1. Select Upload Month</h2>
        <input type="month" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)}
          disabled={isRunning}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-slate-400 mt-1">Month the SIM dump was exported.</p>
      </div>

      {/* Step 2 — File */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">2. Select SIM File</h2>
        <div
          className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
            isRunning && 'pointer-events-none opacity-60')}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.tsv,.dat" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
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
              <p className="text-xs text-slate-400">or click to browse · .txt / .csv / .tsv</p>
            </div>
          )}
        </div>
      </div>

      {/* Step 3 — Process */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">3. Process Upload</h2>
        <button onClick={startUpload} disabled={!file || !uploadMonth || isRunning}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors',
            file && uploadMonth && !isRunning
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isRunning ? step : 'Start Upload'}
        </button>

        {/* Dual progress bars */}
        {isRunning && (
          <div className="space-y-3">
            <ProgressBar
              icon={<Cloud className="w-3.5 h-3.5 text-orange-500" />}
              label="R2 Archive Upload"
              pct={r2Pct}
              color="#f57c00"
            />
            <ProgressBar
              icon={<FileText className="w-3.5 h-3.5 text-blue-500" />}
              label={`Parsing — ${parsed.toLocaleString('en-IN')} rows`}
              pct={Math.min(Math.round(parsed / 1600000 * 100), 99)}
              color="#1565c0"
            />
          </div>
        )}

        {phase === 'error' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {phase === 'done' && summaries.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-slate-700">Upload Complete — {uploadMonth}</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total Active SIMs',  value: totalSims,                                    color: '#1565c0' },
              { label: 'Customers Found',    value: summaries.length,                             color: '#2e7d32' },
              { label: 'Needs Review',       value: summaries.filter(s => s.match_status === 'pending').length, color: '#f57c00' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: `${s.color}12` }}>
                <p className="text-xl font-extrabold" style={{ color: s.color }}>{s.value.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-customer table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-slate-500 text-left">
                <th className="pb-2 font-semibold">Customer Name (Raw)</th>
                <th className="pb-2 font-semibold text-right">SIMs</th>
                <th className="pb-2 font-semibold">Top Plan</th>
                <th className="pb-2 font-semibold">Match</th>
              </tr></thead>
              <tbody className="divide-y">
                {summaries.map(a => {
                  const topPlan = Object.entries(a.by_plan).sort((x, y) => y[1] - x[1])[0]
                  const isResolved = resolved.has(a.customer_name_raw)
                  return (
                    <tr key={a.customer_name_raw} className="hover:bg-slate-50">
                      <td className="py-1.5 font-medium text-slate-700">{a.customer_name_raw}</td>
                      <td className="py-1.5 text-right font-bold">{a.total_sims.toLocaleString('en-IN')}</td>
                      <td className="py-1.5 text-slate-500 truncate max-w-[160px]">{topPlan?.[0] ?? '—'}</td>
                      <td className="py-1.5">
                        {isResolved || a.match_status === 'matched'
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Matched</span>
                          : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Review</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending matches */}
      {pending.length > 0 && phase === 'done' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <button onClick={() => setShowPending(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-700 text-sm">Ambiguous Customer Names — Needs Review</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {filtered.length} remaining
              </span>
            </div>
            {showPending ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showPending && (
            <div className="border-t">
              <div className="px-5 py-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="Search…" value={matchSearch}
                    onChange={e => setMatchSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {filtered.map(s => (
                  <MatchRow key={s.customer_name_raw} nameRaw={s.customer_name_raw}
                    totalSims={s.total_sims} customers={customers}
                    resolving={resolving === s.customer_name_raw}
                    onResolve={id => handleResolve(s.customer_name_raw, id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ icon, label, pct, color }: { icon: React.ReactNode; label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">{icon}<span>{label}</span></div>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Match row ─────────────────────────────────────────────────────────────────
function MatchRow({ nameRaw, totalSims, customers, resolving, onResolve }: {
  nameRaw: string; totalSims: number; customers: Customer[]
  resolving: boolean; onResolve: (id: string) => void
}) {
  const [selected, setSelected] = useState('')
  return (
    <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">{nameRaw}</p>
        <p className="text-[11px] text-slate-400">{totalSims.toLocaleString('en-IN')} SIMs</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]">
          <option value="">— select customer —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => onResolve(selected)} disabled={!selected || resolving}
          className={cn('flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors',
            selected && !resolving ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
          {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Confirm
        </button>
      </div>
    </div>
  )
}
