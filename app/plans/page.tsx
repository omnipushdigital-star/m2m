import { getSupabase } from '@/lib/supabase'
import { PlanTable } from '@/components/plan-table'

export default async function PlansPage() {
  const supabase = getSupabase()
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('plan_name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Plan Management</h1>
      <PlanTable plans={plans ?? []} />
    </div>
  )
}
