import { Suspense } from 'react'
import { getSupabase } from '@/lib/supabase'
import { SimInventoryClient } from '@/components/sim-inventory-client'
import { SimSnapshotPanel } from '@/components/sim-snapshot-panel'

export const dynamic = 'force-dynamic'

export default async function SimInventoryPage() {
  const supabase = getSupabase()

  const { data: monthsData } = await supabase
    .from('sim_customer_summary')
    .select('upload_month')
    .order('upload_month', { ascending: false })

  const months = Array.from(new Set((monthsData ?? []).map(r => r.upload_month)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SIM Inventory Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Plan-wise SIM counts from monthly dump · Billing vs actual variance per customer
        </p>
      </div>

      {/* Snapshot: plan-wise + customer-wise with click-to-filter */}
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-72 rounded-lg bg-slate-100 animate-pulse" />
        </div>
      }>
        <SimSnapshotPanel />
      </Suspense>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Detailed analytics tabs */}
      <SimInventoryClient months={months} />
    </div>
  )
}
