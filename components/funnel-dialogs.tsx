'use client'

import { useRef, useState, useTransition } from 'react'
import { addStage1Opportunity, moveToStage4, updateStage1Opportunity, updateStage4Opportunity } from '@/actions/funnel'

// ── Shared helpers ────────────────────────────────────────────────────────────

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

const inputCls = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565c0]/30 focus:border-[#1565c0]"
const selectCls = inputCls + " bg-white"

// ── Add Stage 1 Dialog ────────────────────────────────────────────────────────

export function AddStage1Dialog({ namOptions }: { namOptions: string[] }) {
  const [open, setOpen]       = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)
  const formRef               = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    setError(null)
    startTransition(async () => {
      try {
        await addStage1Opportunity(fd)
        formRef.current?.reset()
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: '#1565c0' }}
      >
        + Add Opportunity
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Add Stage 1 Opportunity</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Customer Name" required>
                <input name="customer_name" required className={inputCls} placeholder="e.g. ACME SOLUTIONS PVT LTD" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="NAM">
                  <select name="nam_name" className={selectCls}>
                    <option value="">— Select NAM —</option>
                    {namOptions.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select name="main_category" className={selectCls}>
                    <option value="">— Select —</option>
                    <option>GOVT</option>
                    <option>PRIVATE</option>
                    <option>PSU</option>
                  </select>
                </Field>
              </div>

              <Field label="Product / Service">
                <input name="product_name" className={inputCls} placeholder="e.g. M2M SIM — IoT Data Plan" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity (SIMs)">
                  <input name="quantity" type="number" min="1" className={inputCls} placeholder="0" />
                </Field>
                <Field label="Value (₹ Cr)">
                  <input name="base_tariff" type="number" step="0.001" min="0" className={inputCls} placeholder="0.000" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Business Type">
                  <select name="business_type" className={selectCls}>
                    <option value="">— Select —</option>
                    <option>NEW</option>
                    <option>RENEWAL</option>
                    <option>NEW EXIST</option>
                    <option>NEW RENEWAL</option>
                  </select>
                </Field>
                <Field label="Commitment (1–5)">
                  <select name="commitment" className={selectCls}>
                    <option value="">— Select —</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Remarks">
                <textarea name="remarks_current" rows={2} className={inputCls} placeholder="Current status / remarks…" />
              </Field>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: '#1565c0' }}>
                  {pending ? 'Adding…' : 'Add Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Move to Stage 4 Dialog ────────────────────────────────────────────────────

export function MoveToStage4Dialog({ opportunityId, customerName, quantity }: {
  opportunityId: string
  customerName:  string
  quantity:      number | null
}) {
  const [open, setOpen]            = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const formRef                    = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    setError(null)
    startTransition(async () => {
      try {
        await moveToStage4(opportunityId, fd)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 rounded text-xs font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
        style={{ background: '#2e7d32' }}
      >
        → Stage 4
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Move to Stage 4 — PO Received</h2>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
              </div>
              <p className="text-sm text-slate-500 mt-1 truncate">{customerName}</p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Opp ID">
                  <input name="opp_id" type="number" className={inputCls} placeholder="e.g. 1234" />
                </Field>
                <Field label="PO Date" required>
                  <input name="po_date" type="date" required className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="PO Value (₹ Cr)" required>
                  <input name="po_value" type="number" step="0.001" min="0" required className={inputCls} placeholder="0.000" />
                </Field>
                <Field label="Contract Period (years)">
                  <select name="contract_period" className={selectCls}>
                    <option value="">— Select —</option>
                    {[1,2,3,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`Commissioned Qty${quantity ? ` (of ${quantity.toLocaleString('en-IN')})` : ''}`}>
                  <input name="commissioned_qty" type="number" min="0" className={inputCls}
                    placeholder={quantity?.toString() ?? '0'} defaultValue={quantity ?? ''} />
                </Field>
                <Field label="Status">
                  <select name="commissioned_status" className={selectCls}>
                    <option value="">— Select —</option>
                    <option>Full</option>
                    <option>Partial</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Product Vertical">
                  <select name="product_vertical" className={selectCls}>
                    <option value="">— Select —</option>
                    <option>CM</option>
                    <option>EB</option>
                    <option>CFA</option>
                  </select>
                </Field>
                <Field label="Billing Cycle">
                  <select name="billing_cycle" className={selectCls}>
                    <option value="">— Select —</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Annually</option>
                  </select>
                </Field>
              </div>

              <Field label="Annualised Value (₹ Cr)">
                <input name="annualized_value" type="number" step="0.0001" min="0" className={inputCls} placeholder="0.0000" />
                <p className="text-xs text-slate-400 mt-0.5">Used to compute monthly ABF = annualised ÷ 12</p>
              </Field>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                ⚠️ This will move the opportunity from Stage 1 to Stage 4 and it will no longer appear in the pipeline.
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: '#2e7d32' }}>
                  {pending ? 'Moving…' : 'Confirm — Move to Stage 4'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Edit Stage 4 Dialog ───────────────────────────────────────────────────────

type Stage4Row = {
  id: string
  customer_name: string
  opp_id: number | null
  po_date: string | null
  po_value: number | null
  contract_period: number | null
  commissioned_qty: number | null
  commissioned_status: string | null
  product_vertical: string | null
  annualized_value: number | null
  abf_generated_total: number | null
  billing_cycle: string | null
  quantity: number | null
}

export function EditStage4Dialog({ row }: { row: Stage4Row }) {
  const [open, setOpen]            = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const formRef                    = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    setError(null)
    startTransition(async () => {
      try {
        await updateStage4Opportunity(row.id, fd)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 rounded text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Edit Stage 4 — PO Details</h2>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
              </div>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{row.customer_name}</p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Opp ID">
                  <input name="opp_id" type="number" defaultValue={row.opp_id ?? ''} className={inputCls} placeholder="e.g. 1234" />
                </Field>
                <Field label="PO Date">
                  <input name="po_date" type="date" defaultValue={row.po_date ?? ''} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="PO Value (₹ Cr)">
                  <input name="po_value" type="number" step="0.001" min="0" defaultValue={row.po_value ?? ''} className={inputCls} />
                </Field>
                <Field label="Contract Period (years)">
                  <select name="contract_period" defaultValue={row.contract_period ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    {[1,2,3,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`Commissioned Qty${row.quantity ? ` (of ${row.quantity.toLocaleString('en-IN')})` : ''}`}>
                  <input name="commissioned_qty" type="number" min="0" defaultValue={row.commissioned_qty ?? ''} className={inputCls} />
                </Field>
                <Field label="Status">
                  <select name="commissioned_status" defaultValue={row.commissioned_status ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    <option>Full</option>
                    <option>Partial</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Product Vertical">
                  <select name="product_vertical" defaultValue={row.product_vertical ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    <option>CM</option>
                    <option>EB</option>
                    <option>CFA</option>
                  </select>
                </Field>
                <Field label="Billing Cycle">
                  <select name="billing_cycle" defaultValue={row.billing_cycle ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Annually</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Annualised Value (₹ Cr)">
                  <input name="annualized_value" type="number" step="0.0001" min="0" defaultValue={row.annualized_value ?? ''} className={inputCls} />
                  <p className="text-xs text-slate-400 mt-0.5">Monthly ABF = this ÷ 12</p>
                </Field>
                <Field label="ABF Generated (₹ Cr)">
                  <input name="abf_generated_total" type="number" step="0.0001" min="0" defaultValue={row.abf_generated_total ?? ''} className={inputCls} />
                  <p className="text-xs text-slate-400 mt-0.5">Cumulative ABF so far</p>
                </Field>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: '#1565c0' }}>
                  {pending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Edit Stage 1 Dialog ───────────────────────────────────────────────────────

type Stage1Row = {
  id: string
  customer_name: string
  nam_name: string | null
  main_category: string | null
  product_name: string | null
  quantity: number | null
  base_tariff: number | null
  business_type: string | null
  commitment: number | null
  remarks_current: string | null
}

export function EditStage1Dialog({ row, namOptions }: { row: Stage1Row; namOptions: string[] }) {
  const [open, setOpen]            = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const formRef                    = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    setError(null)
    startTransition(async () => {
      try {
        await updateStage1Opportunity(row.id, fd)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 rounded text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit Opportunity</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Customer Name" required>
                <input name="customer_name" required defaultValue={row.customer_name} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="NAM">
                  <select name="nam_name" defaultValue={row.nam_name ?? ''} className={selectCls}>
                    <option value="">— Select NAM —</option>
                    {namOptions.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select name="main_category" defaultValue={row.main_category ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    <option>GOVT</option>
                    <option>PRIVATE</option>
                    <option>PSU</option>
                  </select>
                </Field>
              </div>

              <Field label="Product / Service">
                <input name="product_name" defaultValue={row.product_name ?? ''} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity (SIMs)">
                  <input name="quantity" type="number" min="1" defaultValue={row.quantity ?? ''} className={inputCls} />
                </Field>
                <Field label="Value (₹ Cr)">
                  <input name="base_tariff" type="number" step="0.001" min="0" defaultValue={row.base_tariff ?? ''} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Business Type">
                  <select name="business_type" defaultValue={row.business_type ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    <option>NEW</option>
                    <option>RENEWAL</option>
                    <option>NEW EXIST</option>
                    <option>NEW RENEWAL</option>
                  </select>
                </Field>
                <Field label="Commitment (1–5)">
                  <select name="commitment" defaultValue={row.commitment ?? ''} className={selectCls}>
                    <option value="">— Select —</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Remarks">
                <textarea name="remarks_current" rows={2} defaultValue={row.remarks_current ?? ''} className={inputCls} />
              </Field>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: '#1565c0' }}>
                  {pending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
