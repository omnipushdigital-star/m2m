'use client'

import { useState, useTransition, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Users, TrendingUp, CheckCircle2, Wifi, Mail, Phone, AlertTriangle, Plus, Edit2, X } from 'lucide-react'
import { addNam, updateNam } from '@/actions/nams'

type Nam = {
  id: string
  name: string
  display_name: string | null
  email: string | null
  phone: string | null
  designation: string | null
  active: boolean
  user_id: string | null
  role: string | null
}

type NamStats = {
  customers: number
  stage1: number
  stage4: number
  pipelineValue: number
  poValue: number
  activeSims: number
  latestAbf: number
  simDump: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('en-IN') }

const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565c0]/30 focus:border-[#1565c0]"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── NAM Form Dialog ───────────────────────────────────────────────────────────

function NamDialog({ existing, onClose }: { existing?: Nam; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const formRef                    = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    setError(null)
    startTransition(async () => {
      try {
        if (existing) await updateNam(existing.id, fd)
        else          await addNam(fd)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {existing ? 'Edit NAM' : 'Add NAM to Registry'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="NAM Key Name" required>
            <input name="name" required defaultValue={existing?.name ?? ''} className={inputCls}
              placeholder="e.g. SUDHANSHU"
              readOnly={!!existing}
              className={cn(inputCls, existing ? 'bg-slate-50 text-slate-500' : '')}
            />
            <p className="text-xs text-slate-400 mt-0.5">
              Must match exactly the nam_name used in Customers and Funnel tables
            </p>
          </Field>

          <Field label="Display Name">
            <input name="display_name" defaultValue={existing?.display_name ?? ''} className={inputCls}
              placeholder="e.g. Sudhanshu Sharma" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email (for future login)">
              <input name="email" type="email" defaultValue={existing?.email ?? ''} className={inputCls}
                placeholder="nam@bsnl.in" />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={existing?.phone ?? ''} className={inputCls}
                placeholder="9XXXXXXXXX" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Designation">
              <select name="designation" defaultValue={existing?.designation ?? 'NAM'} className={inputCls}>
                <option value="NAM">NAM</option>
                <option value="Senior NAM">Senior NAM</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Manager">Manager</option>
              </select>
            </Field>
            <Field label="Status">
              <select name="active" defaultValue={existing?.active ? 'true' : 'false'} className={inputCls}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">📋 RBAC Readiness</p>
            <p>Once individual logins are created, set <code className="bg-blue-100 px-1 rounded">user_metadata.nam_name</code> = key name above. All data filters will work automatically via Supabase RLS.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: '#1565c0' }}>
              {pending ? 'Saving…' : existing ? 'Save Changes' : 'Add to Registry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NamsClient({
  nams,
  statsMap,
  unmappedNames,
  latestSimMonth,
}: {
  nams: Nam[]
  statsMap: Record<string, NamStats>
  unmappedNames: string[]
  latestSimMonth: string | null
}) {
  const [dialog, setDialog]         = useState<'add' | Nam | null>(null)
  const [, startTransition]         = useTransition()
  const _ = startTransition         // suppress unused warning

  const activeNams   = nams.filter(n => n.active)
  const inactiveNams = nams.filter(n => !n.active)

  // Grand totals
  const allStats   = Object.values(statsMap)
  const totalCusts = allStats.reduce((s, v) => s + v.customers, 0)
  const totalStage1 = allStats.reduce((s, v) => s + v.stage1, 0)
  const totalStage4 = allStats.reduce((s, v) => s + v.stage4, 0)
  const totalSims  = allStats.reduce((s, v) => s + v.activeSims, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="inline-block w-1.5 h-6 rounded bg-[#1565c0]" />
            NAM Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage National Account Managers · Foundation for per-NAM login access (RBAC)
          </p>
        </div>
        <button
          onClick={() => setDialog('add')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90"
          style={{ background: '#1565c0' }}
        >
          <Plus className="w-4 h-4" /> Add NAM
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Registered NAMs', value: String(nams.length),    sub: `${activeNams.length} active`, icon: Users,       color: 'bg-[#1565c0]' },
          { label: 'Total Customers', value: fmt(totalCusts),        sub: 'across all NAMs',             icon: Users,       color: 'bg-[#2e7d32]' },
          { label: 'Total Pipeline',  value: String(totalStage1),    sub: 'Stage 1 opportunities',       icon: TrendingUp,  color: 'bg-[#f57c00]' },
          { label: 'Active SIMs',     value: fmt(totalSims),         sub: 'billing records',             icon: Wifi,        color: 'bg-slate-600'  },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-4 flex items-start gap-3">
            <div className={cn('rounded-lg p-2.5 shrink-0', c.color)}>
              <c.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{c.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Unmapped NAM names warning */}
      {unmappedNames.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {unmappedNames.length} NAM name{unmappedNames.length > 1 ? 's' : ''} found in data but not registered
              </p>
              <p className="text-xs text-amber-700 mt-1 mb-2">
                These appear in Customers or Funnel Opportunities but have no registry entry. Add them to enable full RBAC coverage.
              </p>
              <div className="flex flex-wrap gap-2">
                {unmappedNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setDialog({ id: '', name, display_name: null, email: null, phone: null, designation: 'NAM', active: true, user_id: null, role: 'nam' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-full text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NAM cards grid */}
      {nams.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 px-6 py-16 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No NAMs registered yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add NAM" to register your first NAM</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeNams.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Active NAMs</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeNams.map(nam => {
                  const stats = statsMap[nam.name]
                  return (
                    <NamCard key={nam.id} nam={nam} stats={stats} latestSimMonth={latestSimMonth}
                      onEdit={() => setDialog(nam)} />
                  )
                })}
              </div>
            </div>
          )}
          {inactiveNams.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Inactive NAMs</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-60">
                {inactiveNams.map(nam => {
                  const stats = statsMap[nam.name]
                  return (
                    <NamCard key={nam.id} nam={nam} stats={stats} latestSimMonth={latestSimMonth}
                      onEdit={() => setDialog(nam)} />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RBAC readiness guide */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#1565c0]" /> RBAC Implementation Checklist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { done: true,  label: 'customers — NAM field', detail: 'customers.nam_name (direct)' },
            { done: true,  label: 'funnel_opportunities — NAM field', detail: 'funnel_opportunities.nam_name (direct)' },
            { done: true,  label: 'monthly_records — via customer', detail: 'JOIN customers ON customer_id' },
            { done: true,  label: 'sim_customer_summary — via customer', detail: 'JOIN customers ON customer_id' },
            { done: true,  label: 'customer_plans — via customer', detail: 'JOIN customers ON customer_id' },
            { done: true,  label: 'sim_change_log — via customer', detail: 'JOIN customers ON customer_id' },
            { done: false, label: 'Create Supabase Auth user per NAM', detail: 'Set user_metadata.nam_name = registry key name' },
            { done: false, label: 'Add RLS policies to tables', detail: 'Filter rows WHERE nam_name = jwt nam_name' },
          ].map(item => (
            <div key={item.label} className={cn('flex items-start gap-2.5 p-3 rounded-lg',
              item.done ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-200')}>
              <span className={cn('mt-0.5 shrink-0', item.done ? 'text-emerald-600' : 'text-slate-400')}>
                {item.done ? '✓' : '○'}
              </span>
              <div>
                <p className={cn('font-semibold', item.done ? 'text-emerald-800' : 'text-slate-600')}>{item.label}</p>
                <p className={cn(item.done ? 'text-emerald-600' : 'text-slate-400')}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog */}
      {dialog && (
        <NamDialog
          existing={dialog === 'add' ? undefined : dialog as Nam}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

// ── NAM Card ──────────────────────────────────────────────────────────────────

function NamCard({ nam, stats, latestSimMonth, onEdit }: {
  nam: Nam
  stats: NamStats | undefined
  latestSimMonth: string | null
  onEdit: () => void
}) {
  const s = stats ?? { customers: 0, stage1: 0, stage4: 0, pipelineValue: 0, poValue: 0, activeSims: 0, latestAbf: 0, simDump: 0 }

  const authReady = !!(nam.email)

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3"
        style={{ borderTop: `3px solid ${authReady ? '#2e7d32' : '#f57c00'}` }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-slate-800">{nam.display_name || nam.name}</p>
            {nam.display_name && (
              <span className="text-xs text-slate-400 font-mono">({nam.name})</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{nam.designation}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-xs px-2 py-1 rounded-full font-semibold',
            authReady ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100')}>
            {authReady ? '✓ Login ready' : '○ No login yet'}
          </span>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contact info */}
      {(nam.email || nam.phone) && (
        <div className="px-5 pb-3 flex gap-4 text-xs text-slate-500">
          {nam.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> {nam.email}
            </span>
          )}
          {nam.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> {nam.phone}
            </span>
          )}
        </div>
      )}

      {/* Data coverage stats */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-2">
        <StatPill label="Customers" value={String(s.customers)}  color="text-[#1565c0]" />
        <StatPill label="Stage 1"   value={String(s.stage1)}     color="text-[#f57c00]" />
        <StatPill label="Stage 4"   value={String(s.stage4)}     color="text-[#2e7d32]" />
        <StatPill label="Active SIMs (billing)" value={s.activeSims > 0 ? fmt(s.activeSims) : '—'} color="text-slate-700" />
        <StatPill label={`SIMs in Dump${latestSimMonth ? ` (${latestSimMonth})` : ''}`} value={s.simDump > 0 ? fmt(s.simDump) : '—'} color="text-[#0277bd]" />
        <StatPill label="Pipeline (₹ Cr)" value={s.pipelineValue > 0 ? s.pipelineValue.toFixed(2) : '—'} color="text-[#f57c00]" />
      </div>

      {/* RBAC data scope note */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Data scope when logged in: </span>
        customers where <code className="bg-slate-100 px-1 rounded">nam_name = &apos;{nam.name}&apos;</code>
        + their monthly records, SIM data, and funnel opportunities
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-400 truncate">{label}</p>
      <p className={cn('text-sm font-bold mt-0.5', color)}>{value}</p>
    </div>
  )
}
