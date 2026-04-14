import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { getRole } from '@/lib/supabase-server'
import { CustomerPlanSection } from '@/components/customer-plan-section'
import { CustomerForm } from '@/components/customer-form'
import { MonthlyEntryForm } from '@/components/monthly-entry-form'
import { MonthlyHistoryTable } from '@/components/monthly-history-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CustomerPlan, Plan } from '@/lib/types'
import { ActiveLeadsExport } from '@/components/active-leads-export'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabase()
  const role = await getRole()
  const isAdmin = role === 'admin'

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!customer) notFound()

  const { data: customerPlans } = await supabase
    .from('customer_plans')
    .select('*, plan:plans(*)')
    .eq('customer_id', params.id)

  const { data: allPlans } = await supabase
    .from('plans')
    .select('*')
    .order('plan_name')

  const { data: monthlyRecords } = await supabase
    .from('monthly_records')
    .select('*')
    .eq('customer_id', params.id)
    .order('month', { ascending: false })

  // SIM dump data — latest month summary for this customer
  const { data: simSummaryRows } = await supabase
    .from('sim_customer_summary')
    .select('by_plan, total_sims, upload_month')
    .eq('customer_id', params.id)
    .order('upload_month', { ascending: false })

  // Consolidate all rows for the latest month (customer may have multiple raw-name rows)
  const latestSimMonth = simSummaryRows?.[0]?.upload_month ?? null
  const simDumpByPlan: Record<string, number> = {}
  let simDumpTotal = 0
  ;(simSummaryRows ?? [])
    .filter(r => r.upload_month === latestSimMonth)
    .forEach(r => {
      simDumpTotal += r.total_sims ?? 0
      if (r.by_plan) {
        Object.entries(r.by_plan as Record<string, number>).forEach(([plan, cnt]) => {
          simDumpByPlan[plan] = (simDumpByPlan[plan] ?? 0) + cnt
        })
      }
    })

  // Active leads (Stage 4 opportunities) — match by customer name
  const { data: activeLeads } = await supabase
    .from('funnel_opportunities')
    .select('id, opp_id, product_name, product_vertical, po_date, po_value, contract_period, quantity, commissioned_qty, annualized_value, abf_generated_total, commissioned_status, billing_cycle, nam_name')
    .eq('funnel_stage', 4)
    .ilike('customer_name', customer.name)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentMonthRecord = (monthlyRecords ?? []).find(r => r.month === currentMonth)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/customers" className="text-sm text-slate-500 hover:underline">← Customers</Link>
          <h1 className="text-2xl font-bold mt-1">{customer.name}</h1>
          <div className="flex gap-2 mt-1">
            {customer.product_vertical && <Badge>{customer.product_vertical}</Badge>}
            {customer.billing_cycle && <Badge variant="outline">{customer.billing_cycle}</Badge>}
            {customer.commissioned_status && <Badge variant="outline">{customer.commissioned_status}</Badge>}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Edit Customer</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Customer</DialogTitle>
                </DialogHeader>
                <CustomerForm customer={customer} />
              </DialogContent>
            </Dialog>

            {/* Edit current month if record exists, otherwise add new */}
            {currentMonthRecord ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button style={{ background: '#f57c00' }}>
                    ✎ Edit {currentMonth}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit {currentMonth} Entry</DialogTitle>
                  </DialogHeader>
                  <MonthlyEntryForm
                    customerId={params.id}
                    record={currentMonthRecord}
                    existingMonths={(monthlyRecords ?? []).map(r => r.month)}
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>+ Add Monthly Entry</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Monthly Entry</DialogTitle>
                  </DialogHeader>
                  <MonthlyEntryForm customerId={params.id} existingMonths={(monthlyRecords ?? []).map(r => r.month)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="monthly">Monthly History</TabsTrigger>
          {(activeLeads ?? []).length > 0 && (
            <TabsTrigger value="leads">
              Active Leads
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-green-600 text-white">
                {(activeLeads ?? []).length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">

          {/* ── Live billing summary from monthly records ── */}
          {(monthlyRecords ?? []).length > 0 && (() => {
            const latest = (monthlyRecords ?? [])[0]
            const totalAbf = (monthlyRecords ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
            const totalRev = (monthlyRecords ?? []).reduce((s, r) => s + (r.revenue_realised ?? 0), 0)
            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Billing SIMs (Latest)',       value: latest.active_sims?.toLocaleString('en-IN') ?? '—',                          color: '#1a237e' },
                  { label: latestSimMonth ? `SIMs in Dump (${latestSimMonth})` : 'SIMs in Dump', value: simDumpTotal > 0 ? simDumpTotal.toLocaleString('en-IN') : '—', color: '#0277bd' },
                  { label: `ABF ${latest.month} (₹ Cr)`, value: latest.abf_amount ? latest.abf_amount.toFixed(3) : '—',                       color: '#f57c00' },
                  { label: 'Total ABF FY (₹ Cr)',         value: totalAbf.toFixed(3),                                                           color: '#f57c00' },
                  { label: 'Total Revenue FY (₹ Cr)',     value: totalRev.toFixed(3),                                                           color: '#2e7d32' },
                ].map(c => (
                  <div key={c.label} className="rounded-md bg-white shadow-sm p-3" style={{ borderTop: `3px solid ${c.color}` }}>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-0.5">{c.value}</p>
                  </div>
                ))}
              </div>
            )
          })()}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="NAM" value={customer.nam_name} />
            <InfoCard label="Vertical" value={customer.product_vertical} />
            <InfoCard label="City" value={customer.city} />
            <InfoCard label="PO Date" value={customer.po_date} />
            <InfoCard label="PO Number" value={customer.po_letter_number} />
            <InfoCard label="Committed Qty" value={customer.quantity?.toLocaleString()} />
            <InfoCard label="Commissioned Qty" value={customer.commissioned_qty?.toLocaleString()} />
            <InfoCard label="Pending" value={customer.commissioning_pending?.toLocaleString()} />
            <InfoCard label="ABF Generated (₹ Cr)" value={customer.abf_generated?.toFixed(3)} />
            <InfoCard label="Base Tariff" value={customer.base_tariff?.toFixed(4)} />
            <InfoCard label="After Negotiation" value={customer.after_negotiation?.toFixed(4)} />
            <InfoCard label="Billing Cycle" value={customer.billing_cycle} />
            <InfoCard label="Contract Period" value={customer.contract_period ? `${customer.contract_period}Y` : null} />
            <InfoCard label="Vendor" value={customer.vendor_name} />
            <InfoCard label="Product" value={customer.product_name} />
            <InfoCard label="CP Name" value={customer.cp_name} />
          </div>
          {customer.details && (
            <div className="rounded-md border p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Details</p>
              <p className="text-sm">{customer.details}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="pt-4">
          <CustomerPlanSection
            customerId={params.id}
            customerPlans={(customerPlans ?? []) as (CustomerPlan & { plan: Plan })[]}
            allPlans={allPlans ?? []}
            isAdmin={isAdmin}
            dumpByPlan={simDumpTotal > 0 ? simDumpByPlan : undefined}
            dumpMonth={latestSimMonth ?? undefined}
          />
        </TabsContent>

        <TabsContent value="monthly" className="pt-4">
          <MonthlyHistoryTable records={monthlyRecords ?? []} customerId={params.id} isAdmin={isAdmin} />
        </TabsContent>

        {(activeLeads ?? []).length > 0 && (
          <TabsContent value="leads" className="pt-4">
            <ActiveLeadsTab leads={activeLeads ?? []} customerName={customer.name} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
    </div>
  )
}

const verticalColors: Record<string, { bg: string; text: string }> = {
  CM:  { bg: '#e3f2fd', text: '#0d47a1' },
  EB:  { bg: '#e8f5e9', text: '#1b5e20' },
  CFA: { bg: '#fce4ec', text: '#880e4f' },
}

type ActiveLead = {
  id: string
  opp_id: number | null
  product_name: string | null
  product_vertical: string | null
  po_date: string | null
  po_value: number | null
  contract_period: number | null
  quantity: number | null
  commissioned_qty: number | null
  annualized_value: number | null
  abf_generated_total: number | null
  commissioned_status: string | null
  billing_cycle: string | null
  nam_name: string | null
}

function ActiveLeadsTab({ leads, customerName }: { leads: ActiveLead[]; customerName: string }) {
  const totalCommQty  = leads.reduce((s, l) => s + (l.commissioned_qty ?? 0), 0)
  const totalMonthly  = leads.reduce((s, l) => {
    if (!l.annualized_value) return s
    const frac = (l.quantity && l.commissioned_qty) ? Math.min(l.commissioned_qty / l.quantity, 1) : 1
    return s + (l.annualized_value / 12) * frac
  }, 0)
  const totalAbfGen   = leads.reduce((s, l) => s + (l.abf_generated_total ?? 0), 0)
  const totalPO       = leads.reduce((s, l) => s + (l.po_value ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="flex justify-end">
        <ActiveLeadsExport leads={leads} customerName={customerName} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active POs',             value: String(leads.length),                              color: '#1a237e' },
          { label: 'Total PO Value (₹ Cr)',  value: totalPO.toFixed(2),                               color: '#2e7d32' },
          { label: 'Monthly ABF (₹ Cr)',     value: totalMonthly.toFixed(3),                          color: '#0d47a1' },
          { label: 'ABF Generated (₹ Cr)',   value: totalAbfGen.toFixed(3),                           color: '#6a1b9a' },
        ].map(c => (
          <div key={c.label} className="rounded-md bg-white shadow-sm p-3" style={{ borderTop: `3px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-xl font-extrabold text-slate-800 mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <div className="rounded-md border overflow-x-auto bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Opp ID</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Product</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">Vertical</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">PO Date</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">PO Value (₹ Cr)</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">Contract (Y)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">Commissioned</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">Monthly ABF (₹ Cr)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">ABF Generated (₹ Cr)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l, i) => {
              const frac = (l.quantity && l.commissioned_qty) ? Math.min(l.commissioned_qty / l.quantity, 1) : 1
              const mAbf = l.annualized_value ? (l.annualized_value / 12) * frac : null
              const vc = verticalColors[l.product_vertical ?? '']
              return (
                <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{l.opp_id ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={l.product_name ?? ''}>{l.product_name ?? '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {l.product_vertical ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={vc ? { background: vc.bg, color: vc.text } : { background: '#f3f4f6', color: '#374151' }}
                      >
                        {l.product_vertical}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{l.po_date ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-medium text-green-700">
                    {l.po_value != null ? Number(l.po_value).toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">{l.contract_period ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{l.quantity ? Number(l.quantity).toLocaleString('en-IN') : '—'}</td>
                  <td className="px-3 py-2 text-right">{l.commissioned_qty ? Number(l.commissioned_qty).toLocaleString('en-IN') : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: '#0d47a1' }}>
                    {mAbf != null ? mAbf.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: '#6a1b9a' }}>
                    {l.abf_generated_total != null ? Number(l.abf_generated_total).toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {l.commissioned_status ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: l.commissioned_status === 'Full' ? '#e8f5e9' : '#fff3e0',
                          color: l.commissioned_status === 'Full' ? '#2e7d32' : '#e65100',
                        }}
                      >
                        {l.commissioned_status}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Totals */}
          <tfoot>
            <tr className="border-t bg-slate-100 font-bold text-xs">
              <td className="px-3 py-2" colSpan={6}>{leads.length} PO{leads.length !== 1 ? 's' : ''}</td>
              <td className="px-3 py-2 text-right">
                {leads.reduce((s, l) => s + (l.quantity ?? 0), 0).toLocaleString('en-IN')}
              </td>
              <td className="px-3 py-2 text-right">
                {totalCommQty.toLocaleString('en-IN')}
              </td>
              <td className="px-3 py-2 text-right" style={{ color: '#0d47a1' }}>
                {totalMonthly.toFixed(3)} Cr
              </td>
              <td className="px-3 py-2 text-right" style={{ color: '#6a1b9a' }}>
                {totalAbfGen.toFixed(3)} Cr
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
