import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { CustomerTable } from '@/components/customer-table'
import { Button } from '@/components/ui/button'

export default async function CustomersPage() {
  const supabase = getSupabase()
  const { data: customers } = await supabase
    .from('customers')
    .select('*, customer_plans(id, plan_id, sim_count)')
    .order('name')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button asChild>
          <Link href="/customers/new">+ Add Customer</Link>
        </Button>
      </div>
      <CustomerTable customers={customers ?? []} />
    </div>
  )
}
