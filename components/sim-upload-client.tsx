'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, CheckCircle2, AlertTriangle, XCircle,
  Loader2, FileText, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { jaccardScore, normalizeName } from '@/lib/fuzzy-match'
import { getSupabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
type Customer = { id: string; name: string }

type SimRow = {
  imsi:              string
  caf_no:            string
  sim_no:            string
  customer_name_raw: string
  customer_id:       string | null
  match_status:      'matched' | 'pending'
  service_center:    string
  plan:              string
  apn:               string
  first_seen_month:  string
  last_seen_month:   string   // source of truth for active/deactivated — no status column needed
  updated_at:        string
}

type UploadState = {
  parsed:    number
  upserted:  number
  total:     number
  customers: number
  pending:   number
  deleted:   number
}

// ── Column positions ───────────────────────────────────────────────────────────
const COL = { external_id: 0, caf_no: 1, imsi: 2, sim_no: 3, customer_name: 4, service_center: 5, plan: 6, apn: 7 }

const STREAM_CHUNK  = 8  * 1024 * 1024  // 8 MB read slices
const UPSERT_BATCH  = 1000              // rows per Supabase upsert call
const PARALLEL      = 5                 // concurrent upsert calls
const FUZZY_MIN     = 0.5

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

// ── Parse + build all rows with fuzzy matching ────────────────────────────────
async function parseAndMatch(
  file:       File,
  customers:  Customer[],
  uploadMonth: string,
  onProgress: (parsed: number) => void,
): Promise<SimRow[]> {
  // Pre-tokenise customer names once
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
      ? { id: bestId,  status: 'matched' as const }
      : { id: null,    status: 'pending' as const }
    matchCache.set(raw, result)
    return result
  }

  const rows: SimRow[] = []
  const seen  = new Set<string>()   // deduplicate IMSIs
  let   delim = ''
  let   skip  = false   // skip header row
  let   count = 0
  const now   = new Date().toISOString()

  for await (const lines of streamLines(file)) {
    for (const line of lines) {
      // First line — detect delimiter and check for header
      if (!delim) {
        delim = (line.match(/\t/g)?.length ?? 0) >= (line.match(/,/g)?.length ?? 0) ? '\t' : ','
        skip  = isNaN(Number(line.split(delim)[0].trim()))
      }
      if (skip) { skip = false; continue }

      const cols = line.split(delim)
      if (cols.length < 8) continue
      const imsi = cols[COL.imsi]?.trim()
      if (!imsi || seen.has(imsi)) continue
      seen.add(imsi)

      const raw = cols[COL.customer_name]?.trim() ?? ''
      const { id, status } = match(raw)

      rows.push({
        imsi,
        caf_no:            cols[COL.caf_no]?.trim()          ?? '',
        sim_no:            cols[COL.sim_no]?.trim()          ?? '',
        customer_name_raw: raw,
        customer_id:       id,
        match_status:      status,
        service_center:    cols[COL.service_center]?.trim()  ?? '',
        plan:              cols[COL.plan]?.trim()            ?? '',
        apn:               cols[COL.apn]?.trim()             ?? '',
        first_seen_month:  uploadMonth,
        last_seen_month:   uploadMonth,
        updated_at:        now,
      })

      count++
      if (count % 50000 === 0) onProgress(count)
    }
    onProgress(rows.length)
  }

  return rows
}

// ── Upsert rows directly to Supabase in parallel batches ─────────────────────
async function upsertAll(
  rows:       SimRow[],
  onProgress: (upserted: number) => void,
): Promise<void> {
  const supabase = getSupabase()
  const chunks: SimRow[][] = []
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    chunks.push(rows.slice(i, i + UPSERT_BATCH))
  }

  let done = 0
  for (let i = 0; i < chunks.length; i += PARALLEL) {
    const window = chunks.slice(i, i + PARALLEL)
    await Promise.all(
      window.map(batch =>
        supabase
          .from('sim_inventory')
          .upsert(batch, {
            onConflict:        'imsi',
            ignoreDuplicates:  false,
          })
          .then(({ error }) => {
            if (error) throw new Error(error.message)
            done += batch.length
            onProgress(done)
          })
      )
    )
  }
}

// ── SIM Upload Client ─────────────────────────────────────────────────────────
export function SimUploadClient({ customers }: { customers: Customer[] }) {
  const [dragOver,     setDragOver]     = useState(false)
  const [file,         setFile]         = useState<File | null>(null)
  const [uploadMonth,  setUploadMonth]  = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [phase,        setPhase]        = useState<'idle' | 'parsing' | 'uploading' | 'finalizing' | 'done' | 'error'>('idle')
  const [state,        setState]        = useState<UploadState>({ parsed: 0, upserted: 0, total: 0, customers: 0, pending: 0, deleted: 0 })
  const [errorMsg,     setErrorMsg]     = useState('')
  const [pendingRows,  setPendingRows]  = useState<Array<{ raw: string; sims: number }>>([])
  const [showPending,  setShowPending]  = useState(true)
  const [matchSearch,  setMatchSearch]  = useState('')
  const [resolved,     setResolved]     = useState<Set<string>>(new Set())
  const [resolving,    setResolving]    = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setPhase('idle')
    setState({ parsed: 0, upserted: 0, total: 0, customers: 0, pending: 0, deleted: 0 })
    setErrorMsg('')
    setPendingRows([])
    setResolved(new Set())
  }, [])

  async function startUpload() {
    if (!file || !uploadMonth) return
    setErrorMsg('')

    try {
      // 1 — Parse & match in browser
      setPhase('parsing')
      setState(s => ({ ...s, parsed: 0 }))

      const rows = await parseAndMatch(
        file, customers, uploadMonth,
        parsed => setState(s => ({ ...s, parsed })),
      )

      if (rows.length === 0) {
        setErrorMsg('No valid SIM rows found. Check file format (8 columns, tab or comma delimited).')
        setPhase('error')
        return
      }

      // Collect pending matches summary
      const pendingMap = new Map<string, number>()
      for (const r of rows) {
        if (r.match_status === 'pending') {
          pendingMap.set(r.customer_name_raw, (pendingMap.get(r.customer_name_raw) ?? 0) + 1)
        }
      }
      const pendingList = Array.from(pendingMap.entries())
        .map(([raw, sims]) => ({ raw, sims }))
        .sort((a, b) => b.sims - a.sims)

      setState(s => ({
        ...s,
        total:     rows.length,
        customers: new Set(rows.map(r => r.customer_name_raw)).size,
        pending:   pendingList.length,
      }))

      // 2 — Upsert directly to Supabase
      setPhase('uploading')
      await upsertAll(
        rows,
        upserted => setState(s => ({ ...s, upserted })),
      )

      // 3 — Count deactivated: SIMs present last month but not this month
      //     No UPDATE needed — last_seen_month IS the source of truth
      setPhase('finalizing')
      const supabase = getSupabase()
      const d2 = new Date(`${uploadMonth}-01`)
      d2.setMonth(d2.getMonth() - 1)
      const prevMonth = d2.toISOString().slice(0, 7)

      const { count: prevCount } = await supabase
        .from('sim_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('last_seen_month', prevMonth)

      const deleted = Math.max(0, (prevCount ?? 0) - rows.length)
      setState(s => ({ ...s, deleted }))
      setPendingRows(pendingList)
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
      await supabase
        .from('sim_inventory')
        .update({ customer_id: customerId, match_status: 'matched', updated_at: new Date().toISOString() })
        .eq('customer_name_raw', raw)
      setResolved(prev => new Set([...Array.from(prev), raw]))
    } finally {
      setResolving(null)
    }
  }

  const isRunning  = ['parsing', 'uploading', 'finalizing'].includes(phase)
  const filtered   = pendingRows
    .filter(p => !resolved.has(p.raw))
    .filter(p => !matchSearch || p.raw.toLowerCase().includes(matchSearch.toLowerCase()))

  // Progress %
  const progressPct =
    phase === 'parsing'    ? Math.min(Math.round((state.parsed  / Math.max(state.total, 1)) * 40), 40) :
    phase === 'uploading'  ? 40 + Math.round((state.upserted / Math.max(state.total, 1)) * 55) :
    phase === 'finalizing' ? 97 :
    phase === 'done'       ? 100 : 0

  return (
    <div className="space-y-6">

      {/* Step 1 — Month */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">1. Select Upload Month</h2>
        <input
          type="month"
          value={uploadMonth}
          onChange={e => setUploadMonth(e.target.value)}
          disabled={isRunning}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">Month the SIM dump was exported.</p>
      </div>

      {/* Step 2 — File */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">2. Upload SIM File</h2>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver     ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
            isRunning   && 'pointer-events-none opacity-60',
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef} type="file" accept=".txt,.csv,.tsv,.dat" className="hidden"
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
              <p className="text-xs text-slate-400">or click to browse · .txt / .csv / .tsv</p>
            </div>
          )}
        </div>
      </div>

      {/* Step 3 — Process */}
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
            ? phase === 'parsing'    ? 'Parsing file…'
            : phase === 'uploading'  ? `Uploading — ${state.upserted.toLocaleString('en-IN')} / ${state.total.toLocaleString('en-IN')} SIMs`
            : 'Counting changes…'
            : 'Start Upload'}
        </button>

        {/* Progress bar */}
        {(isRunning || phase === 'done') && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                {phase === 'parsing'    ? `Parsed ${state.parsed.toLocaleString('en-IN')} rows…` :
                 phase === 'uploading'  ? `Saving to Supabase in batches of ${UPSERT_BATCH}…` :
                 phase === 'finalizing' ? 'Marking deactivated SIMs…' :
                 'Complete'}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {phase === 'uploading' && (
              <p className="text-xs text-slate-400">
                ~{Math.ceil((state.total - state.upserted) / (UPSERT_BATCH * PARALLEL))} batches remaining · this takes 3–5 minutes for 1.6M rows
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

      {/* Summary */}
      {phase === 'done' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-slate-700">Upload Complete — {uploadMonth}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total SIMs',       value: state.total,     color: '#1565c0' },
              { label: 'Deactivated',      value: state.deleted,   color: '#c62828' },
              { label: 'Unique Customers', value: state.customers, color: '#2e7d32' },
              { label: 'Needs Review',     value: state.pending,   color: '#f57c00' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: `${s.color}12` }}>
                <p className="text-xl font-extrabold" style={{ color: s.color }}>
                  {s.value.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending matches */}
      {filtered.length > 0 && phase === 'done' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <button
            onClick={() => setShowPending(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-700 text-sm">Ambiguous Customer Names — Needs Review</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {filtered.length - resolved.size} remaining
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
                    type="text" placeholder="Search…" value={matchSearch}
                    onChange={e => setMatchSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {filtered.map(p => (
                  <MatchRow
                    key={p.raw}
                    nameRaw={p.raw}
                    totalSims={p.sims}
                    customers={customers}
                    resolving={resolving === p.raw}
                    resolved={resolved.has(p.raw)}
                    onResolve={id => handleResolve(p.raw, id)}
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
function MatchRow({ nameRaw, totalSims, customers, resolving, resolved, onResolve }: {
  nameRaw:   string
  totalSims: number
  customers: Customer[]
  resolving: boolean
  resolved:  boolean
  onResolve: (id: string) => void
}) {
  const [selected, setSelected] = useState('')
  if (resolved) return null
  return (
    <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">{nameRaw}</p>
        <p className="text-[11px] text-slate-400">{totalSims.toLocaleString('en-IN')} SIMs</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={selected} onChange={e => setSelected(e.target.value)}
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
