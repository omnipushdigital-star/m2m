import { getSupabase } from '@/lib/supabase'
import { SimInventoryClient } from '@/components/sim-inventory-client'

export const dynamic = 'force-dynamic'

export default async function SimInventoryPage() {
  const supabase = getSupabase()

  const { data: monthsData } = await supabase
    .from('sim_customer_summary')
    .select('upload_month')
    .order('upload_month', { ascending: false })

  const months = [...new Set((monthsData ?? []).map(r => r.upload_month))]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SIM Inventory Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Plan-wise SIM counts from monthly dump · Billing vs actual variance per customer
        </p>
      </div>
      <SimInventoryClient months={months} />
    </div>
  )
}
