'use client'

import React from 'react'

// ── Hardcoded targets for FY 2025-26 ─────────────────────────────────────────
type QTargets = { q1: number | null; q2: number | null; q3: number | null; q4: number | null }
type KpiDef   = { id: string; name: string; annual: number | null } & QTargets

const TARGETS: Record<string, KpiDef[]> = {
  '2025-26': [
    { id: 'stage4',     name: 'Stage IV',                                    annual: 200,  q1: 50,    q2: 58.045, q3: 54.025, q4: 96.8101 },
    { id: 'stage1',     name: 'Stage I — Pipeline',                          annual: null, q1: null,  q2: null,   q3: null,   q4: null    },
    { id: 'abf',        name: 'ABF (Amount Billed For)',                      annual: 75,   q1: 18.75, q2: 30.81,  q3: 42.14,  q4: 53.25   },
    { id: 'newBusiness',name: 'New Business',                                 annual: 70,   q1: 17.5,  q2: 17.5,   q3: 17.5,   q4: 17.5    },
    { id: 'clusterBw',  name: 'Cluster BW / Data Centre',                    annual: 10,   q1: 2.5,   q2: 5,      q3: 7.5,    q4: 9.985   },
    { id: 'emerging',   name: 'Emerging Areas (SDWAN / IoT / M2M / CNPN)',   annual: 30,   q1: 7.5,   q2: 7.5,    q3: 7.5,    q4: 7.5     },
    { id: 'privateBiz', name: 'Private Business',                             annual: 100,  q1: 25,    q2: 25,     q3: 25,     q4: 25      },
    { id: 'vsat',       name: 'VSAT',                                         annual: 1,    q1: 1,     q2: 1,      q3: 1,      q4: 1       },
    { id: 'inmarsat',   name: 'Inmarsat',                                     annual: 1,    q1: 1,     q2: 1,      q3: 1,      q4: 1       },
    { id: 'fiber',      name: 'Fiber Monetization / Dark Fiber',              annual: null, q1: null,  q2: null,   q3: null,   q4: null    },
  ],
}

// ── KPI achievement type (passed from server) ─────────────────────────────────
type KpiAch = { annual: number; q1: number; q2: number; q3: number; q4: number }
type Achievements = {
  stage4: KpiAch; stage1: KpiAch; abf: KpiAch; newBusiness: KpiAch
  clusterBw: KpiAch; emerging: KpiAch; privateBiz: KpiAch
  vsat: KpiAch; inmarsat: KpiAch; fiber: KpiAch
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(achieved: number, target: number | null): number | null {
  if (!target) return null
  return Math.min((achieved / target) * 100, 999)
}

function ragColor(p: number | null): { bar: string; text: string; bg: string; label: string } {
  if (p === null) return { bar: '#94a3b8', text: '#64748b', bg: '#f8fafc', label: 'No Target' }
  if (p >= 100)  return { bar: '#2e7d32', text: '#1b5e20', bg: '#f1f8f1', label: 'Achieved' }
  if (p >= 75)   return { bar: '#f57c00', text: '#e65100', bg: '#fff8f1', label: 'On Track' }
  return           { bar: '#c62828', text: '#b71c1c', bg: '#fff5f5', label: 'Behind' }
}

function cr(v: number) { return v.toFixed(2) }

const QUARTERS = [
  { key: 'q1' as const, label: 'Q1', sub: 'Apr–Jun' },
  { key: 'q2' as const, label: 'Q2', sub: 'Jul–Sep' },
  { key: 'q3' as const, label: 'Q3', sub: 'Oct–Dec' },
  { key: 'q4' as const, label: 'Q4', sub: 'Jan–Mar' },
]

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ def, ach }: { def: KpiDef; ach: KpiAch }) {
  const annualPct = pct(ach.annual, def.annual)
  const rag = ragColor(annualPct)

  return (
    <div
      className="bg-white rounded-xl border-2 overflow-hidden"
      style={{ borderColor: rag.bar }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2"
        style={{ background: rag.bg }}>
        <div>
          <p className="text-sm font-bold text-slate-800 leading-tight">{def.name}</p>
          {def.annual && (
            <p className="text-xs text-slate-500 mt-0.5">Annual Target: ₹{def.annual} Cr</p>
          )}
        </div>
        <span
          className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5"
          style={{ background: rag.bar, color: 'white' }}
        >
          {rag.label}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Annual achievement bar */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-slate-500">
              Achievement: <strong className="text-slate-800">₹{cr(ach.annual)} Cr</strong>
            </span>
            {annualPct !== null && (
              <span className="text-sm font-extrabold" style={{ color: rag.text }}>
                {annualPct.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(annualPct ?? 0, 100)}%`,
                background: rag.bar,
              }}
            />
          </div>
        </div>

        {/* Q1–Q4 grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {QUARTERS.map(q => {
            const tgt  = def[q.key]
            const achV = ach[q.key]
            const qPct = pct(achV, tgt)
            const qRag = ragColor(qPct)
            return (
              <div
                key={q.key}
                className="rounded-lg p-2 text-center"
                style={{ background: `${qRag.bar}14` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: qRag.bar }}>
                  {q.label}
                </p>
                <p className="text-[9px] text-slate-400">{q.sub}</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{cr(achV)}</p>
                {tgt !== null ? (
                  <>
                    <p className="text-[9px] text-slate-400">of {cr(tgt)}</p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: qRag.text }}>
                      {qPct !== null ? `${qPct.toFixed(0)}%` : '—'}
                    </p>
                  </>
                ) : (
                  <p className="text-[9px] text-slate-300 mt-1">No target</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function KpiTracker({ fy, achievements }: { fy: string; achievements: Achievements }) {
  const defs = TARGETS[fy] ?? []

  const achMap: Record<string, KpiAch> = {
    stage4:      achievements.stage4,
    stage1:      achievements.stage1,
    abf:         achievements.abf,
    newBusiness: achievements.newBusiness,
    clusterBw:   achievements.clusterBw,
    emerging:    achievements.emerging,
    privateBiz:  achievements.privateBiz,
    vsat:        achievements.vsat,
    inmarsat:    achievements.inmarsat,
    fiber:       achievements.fiber,
  }

  // Summary counts
  const withTarget = defs.filter(d => d.annual !== null)
  const achieved   = withTarget.filter(d => {
    const a = achMap[d.id]
    return a && pct(a.annual, d.annual) !== null && (pct(a.annual, d.annual) ?? 0) >= 100
  })
  const onTrack    = withTarget.filter(d => {
    const a = achMap[d.id]; const p = pct(a?.annual ?? 0, d.annual)
    return p !== null && p >= 75 && p < 100
  })
  const behind     = withTarget.filter(d => {
    const a = achMap[d.id]; const p = pct(a?.annual ?? 0, d.annual)
    return p !== null && p < 75
  })

  return (
    <div className="space-y-5">

      {/* ── FY Badge + Summary ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="px-3 py-1 rounded-full text-sm font-bold text-white"
          style={{ background: '#1565c0' }}>FY {fy}</span>
        <div className="flex gap-2">
          {[
            { label: 'Achieved', count: achieved.length, color: '#2e7d32' },
            { label: 'On Track', count: onTrack.length,  color: '#f57c00' },
            { label: 'Behind',   count: behind.length,   color: '#c62828' },
          ].map(s => (
            <span key={s.label}
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${s.color}18`, color: s.color }}>
              {s.count} {s.label}
            </span>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">All values in ₹ Cr</span>
      </div>

      {/* ── Summary bar — overall annual achievement ── */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Annual Progress — KPIs with targets</p>
        <div className="space-y-2">
          {defs.filter(d => d.annual !== null).map(d => {
            const a = achMap[d.id]
            const p = pct(a?.annual ?? 0, d.annual)
            const rag = ragColor(p)
            return (
              <div key={d.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0 truncate">{d.name}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(p ?? 0, 100)}%`, background: rag.bar }} />
                </div>
                <span className="text-xs font-bold w-12 text-right" style={{ color: rag.text }}>
                  {p !== null ? `${p.toFixed(0)}%` : '—'}
                </span>
                <span className="text-xs text-slate-500 w-28 text-right">
                  {cr(a?.annual ?? 0)} / {cr(d.annual!)} Cr
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {defs.map(d => (
          <KpiCard key={d.id} def={d} ach={achMap[d.id]} />
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Stage IV, New Business, Emerging Areas, Private, VSAT, Inmarsat, Fiber from funnel PO data ·
        ABF from monthly billing records · Stage I from current pipeline
      </p>
    </div>
  )
}
