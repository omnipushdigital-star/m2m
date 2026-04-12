import { getSupabase } from '@/lib/supabase'
import { getRole } from '@/lib/supabase-server'
import { PlanTable } from '@/components/plan-table'

export default async function PlansPage() {
  const supabase = getSupabase()
  const role = await getRole()
  const isAdmin = role === 'admin'

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('plan_name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Plan Management</h1>
      <PlanTable plans={plans ?? []} isAdmin={isAdmin} />
    </div>
  )
}
