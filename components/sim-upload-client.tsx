'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Upload, CheckCircle2, AlertTriangle, XCircle,
  Loader2, FileText, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
type Customer = { id: string; name: string }

type SimRow = {
  external_id: string
  caf_no: string
  imsi: string
  sim_no: string
  customer_name_raw: string
  service_center: string
  plan: string
  apn: string
}

type UploadSummary = {
  new: number
  changed: number
  unchanged: number
  deleted: number
  pending: number
  total: number
}

type PendingMatch = {
  imsi: string
  caf_no: string
  customer_name_raw: string
  suggestedId: string | null
  suggestedName: string | null
  resolved: boolean
}

// ── Column mapping (0-indexed positions in each file row) ─────────────────────
// Expected columns: external_id, caf_no, imsi, sim_no, customer_name_raw, service_center, plan, apn
const COL_MAP = {
  external_id:       0,
  caf_no:            1,
  imsi:              2,
  sim_no:            3,
  customer_name_raw: 4,
  service_center:    5,
  plan:              6,
  apn:               7,
}

const CHUNK_SIZE = 2000
const PARALLEL_CHUNKS = 5

// ── Parse raw text file ───────────────────────────────────────────────────────
function parseSimFile(text: string): SimRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return []

  // Auto-detect delimiter from first line
  const firstLine = lines[0]
  const tabCount   = (firstLine.match(/\t/g) ?? []).length
  const commaCount = (firstLine.match(/,/g)  ?? []).length
  const delim = tabCount >= commaCount ? '\t' : ','

  // Skip header row if first cell looks like a label (not a number / not all digits)
  const startIdx = isNaN(Number(firstLine.split(delim)[0].trim())) ? 1 : 0

  const rows: SimRow[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(delim)
    if (cols.length < 8) continue
    const imsi = cols[COL_MAP.imsi]?.trim()
    if (!imsi) continue
    rows.push({
      external_id:       cols[COL_MAP.external_id]?.trim()       ?? '',
      caf_no:            cols[COL_MAP.caf_no]?.trim()            ?? '',
      imsi,
      sim_no:            cols[COL_MAP.sim_no]?.trim()            ?? '',
      customer_name_raw: cols[COL_MAP.customer_name_raw]?.trim() ?? '',
      service_center:    cols[COL_MAP.service_center]?.trim()    ?? '',
      plan:              cols[COL_MAP.plan]?.trim()              ?? '',
      apn:               cols[COL_MAP.apn]?.trim()               ?? '',
    })
  }
  return rows
}

// ── Send chunks with concurrency limit ───────────────────────────────────────
async function sendChunks(
  sims: SimRow[],
  uploadMonth: string,
  customers: Customer[],
  onProgress: (done: number, total: number) => void,
): Promise<{ new: number; changed: number; unchanged: number }> {
  const chunks: SimRow[][] = []
  for (let i = 0; i < sims.length; i += CHUNK_SIZE) {
    chunks.push(sims.slice(i, i + CHUNK_SIZE))
  }

  let done = 0
  let totalNew = 0, totalChanged = 0, totalUnchanged = 0

  // Process in windows of PARALLEL_CHUNKS
  for (let i = 0; i < chunks.length; i += PARALLEL_CHUNKS) {
    const window = chunks.slice(i, i + PARALLEL_CHUNKS)
    const results = await Promise.all(
      window.map(chunk =>
        fetch('/api/sim-upload/chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sims: chunk, uploadMonth, customers }),
        }).then(r => r.json())
      )
    )
    for (const r of results) {
      if (r.error) throw new Error(r.error)
      totalNew       += r.new       ?? 0
      totalChanged   += r.changed   ?? 0
      totalUnchanged += r.unchanged ?? 0
      done++
      onProgress(done, chunks.length)
    }
  }

  return { new: totalNew, changed: totalChanged, unchanged: totalUnchanged }
}

// ── Fetch pending matches after upload ───────────────────────────────────────
async function fetchPendingMatches(customers: Customer[]): Promise<PendingMatch[]> {
  const res = await fetch('/api/sim-upload/pending-matches')
  if (!res.ok) return []
  const data = await res.json() as Array<{
    imsi: string; caf_no: string; customer_name_raw: string; customer_id: string | null
  }>

  // Build customer name map for display
  const custMap = new Map(customers.map(c => [c.id, c.name]))

  return data.map(r => ({
    imsi:              r.imsi,
    caf_no:            r.caf_no,
    customer_name_raw: r.customer_name_raw,
    suggestedId:       r.customer_id,
    suggestedName:     r.customer_id ? (custMap.get(r.customer_id) ?? null) : null,
    resolved:          false,
  }))
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
  const [progress,     setProgress]     = useState({ done: 0, total: 0 })
  const [summary,      setSummary]      = useState<UploadSummary | null>(null)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [pending,      setPending]      = useState<PendingMatch[]>([])
  const [showPending,  setShowPending]  = useState(true)
  const [matchSearch,  setMatchSearch]  = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    setFile(f)
    setPhase('idle')
    setSummary(null)
    setErrorMsg('')
    setPending([])
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  // ── Upload flow ─────────────────────────────────────────────────────────────
  async function startUpload() {
    if (!file || !uploadMonth) return
    setErrorMsg('')
    setSummary(null)
    setPending([])

    try {
      // 1. Parse file in browser
      setPhase('parsing')
      const text = await file.text()
      const sims = parseSimFile(text)
      if (sims.length === 0) {
        setErrorMsg('No valid SIM rows found in file. Check column format.')
        setPhase('error')
        return
      }

      // 2. Send chunks to API
      setPhase('uploading')
      setProgress({ done: 0, total: Math.ceil(sims.length / CHUNK_SIZE) })

      const chunkResult = await sendChunks(
        sims, uploadMonth, customers,
        (done, total) => setProgress({ done, total }),
      )

      // 3. Finalize (mark deletions)
      setPhase('finalizing')
      const finRes = await fetch('/api/sim-upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadMonth }),
      })
      const finData = await finRes.json()
      if (finData.error) throw new Error(finData.error)

      // 4. Fetch pending matches
      const pendingMatches = await fetchPendingMatches(customers)

      setSummary({
        new:       chunkResult.new,
        changed:   chunkResult.changed,
        unchanged: chunkResult.unchanged,
        deleted:   finData.deleted ?? 0,
        pending:   pendingMatches.length,
        total:     sims.length,
      })
      setPending(pendingMatches)
      setPhase('done')

    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  // ── Resolve a pending match ─────────────────────────────────────────────────
  async function resolveMatch(idx: number, customerId: string, saveMapping: boolean) {
    const m = pending[idx]
    const res = await fetch('/api/sim-upload/resolve-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imsi:            m.imsi,
        customerId,
        cafNo:           m.caf_no,
        customerNameRaw: m.customer_name_raw,
        saveMapping,
      }),
    })
    if (res.ok) {
      setPending(prev => prev.map((p, i) => i === idx ? { ...p, resolved: true } : p))
    }
  }

  // ── Filtered pending list ───────────────────────────────────────────────────
  const filteredPending = pending.filter(p => {
    if (!matchSearch) return !p.resolved
    const q = matchSearch.toLowerCase()
    return !p.resolved && (
      p.customer_name_raw.toLowerCase().includes(q) ||
      p.caf_no.toLowerCase().includes(q)
    )
  })

  const resolvedCount = pending.filter(p => p.resolved).length

  // ── Progress % ─────────────────────────────────────────────────────────────
  const progressPct = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  const isRunning = phase === 'parsing' || phase === 'uploading' || phase === 'finalizing'

  return (
    <div className="space-y-6">

      {/* ── Step 1: Pick month ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">1. Select Upload Month</h2>
        <input
          type="month"
          value={uploadMonth}
          onChange={e => setUploadMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRunning}
        />
        <p className="text-xs text-slate-400 mt-1">This should match the month the SIM dump was exported.</p>
      </div>

      {/* ── Step 2: Drop file ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">2. Upload SIM File</h2>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
            isRunning && 'pointer-events-none opacity-60',
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
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
              <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB — click to replace</p>
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

      {/* ── Step 3: Upload button + progress ─────────────────────────────── */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">3. Process Upload</h2>

        <button
          onClick={startUpload}
          disabled={!file || !uploadMonth || isRunning}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors',
            file && uploadMonth && !isRunning
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isRunning ? (
            phase === 'parsing'    ? 'Parsing file…'    :
            phase === 'uploading'  ? 'Uploading chunks…' :
            phase === 'finalizing' ? 'Finalizing…'       : 'Processing…'
          ) : 'Start Upload'}
        </button>

        {/* Progress bar */}
        {phase === 'uploading' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Chunk {progress.done} of {progress.total}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              ~{(progress.done * CHUNK_SIZE).toLocaleString()} / ~{(progress.total * CHUNK_SIZE).toLocaleString()} SIMs processed
            </p>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* ── Summary card ─────────────────────────────────────────────────── */}
      {summary && phase === 'done' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-sm font-bold text-slate-700">Upload Complete — {uploadMonth}</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total in File', value: summary.total,     color: '#1565c0' },
              { label: 'New Activated', value: summary.new,       color: '#2e7d32' },
              { label: 'Plan/APN Changed', value: summary.changed,  color: '#f57c00' },
              { label: 'Unchanged',     value: summary.unchanged, color: '#78909c' },
              { label: 'Deactivated',   value: summary.deleted,   color: '#c62828' },
              { label: 'Needs Review',  value: summary.pending,   color: '#7b1fa2' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: `${s.color}12` }}>
                <p className="text-xl font-extrabold" style={{ color: s.color }}>
                  {s.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pending matches queue ─────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <button
            onClick={() => setShowPending(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-700 text-sm">
                Needs Review — Ambiguous Customer Matches
              </span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {pending.length - resolvedCount} remaining
              </span>
              {resolvedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  {resolvedCount} resolved
                </span>
              )}
            </div>
            {showPending ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showPending && (
            <div className="border-t">
              {/* Search */}
              <div className="px-5 py-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or CAF no…"
                    value={matchSearch}
                    onChange={e => setMatchSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="divide-y max-h-96 overflow-y-auto">
                {filteredPending.length === 0 ? (
                  <p className="text-center py-6 text-sm text-slate-400">No unresolved matches{matchSearch ? ' matching search' : ''}.</p>
                ) : (
                  filteredPending.map((m) => (
                    <MatchRow
                      key={m.imsi}
                      match={m}
                      customers={customers}
                      onResolve={(customerId, save) => resolveMatch(
                        pending.findIndex(p => p.imsi === m.imsi),
                        customerId, save
                      )}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Individual match row ───────────────────────────────────────────────────────
function MatchRow({
  match, customers, onResolve,
}: {
  match: PendingMatch
  customers: Customer[]
  onResolve: (customerId: string, saveMapping: boolean) => void
}) {
  const [selected,     setSelected]     = useState(match.suggestedId ?? '')
  const [saveMapping,  setSaveMapping]  = useState(true)
  const [resolving,    setResolving]    = useState(false)

  async function handleResolve() {
    if (!selected) return
    setResolving(true)
    await onResolve(selected, saveMapping)
    setResolving(false)
  }

  return (
    <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">{match.customer_name_raw}</p>
        <p className="text-[11px] text-slate-400">CAF: {match.caf_no} · IMSI: {match.imsi}</p>
        {match.suggestedName && (
          <p className="text-[11px] text-amber-600 mt-0.5">
            Suggested: <strong>{match.suggestedName}</strong>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
        >
          <option value="">— select customer —</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={saveMapping}
            onChange={e => setSaveMapping(e.target.checked)}
            className="w-3 h-3"
          />
          Remember
        </label>

        <button
          onClick={handleResolve}
          disabled={!selected || resolving}
          className={cn(
            'flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors',
            selected && !resolving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Confirm
        </button>
      </div>
    </div>
  )
}
