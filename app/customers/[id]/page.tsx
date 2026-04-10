import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
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

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabase()

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
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="monthly">Monthly History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="NAM" value={customer.nam_name} />
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
            <InfoCard label="Vertical" value={customer.product_vertical} />
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
          />
        </TabsContent>

        <TabsContent value="monthly" className="pt-4">
          <MonthlyHistoryTable records={monthlyRecords ?? []} customerId={params.id} />
        </TabsContent>
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
