import { getSupabase } from '@/lib/supabase'
import { LtbReportClient } from '@/components/ltb-report-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lead to Bill Report' }

export default async function LtbPage() {
  const supabase = getSupabase()

  // Fetch all funnel opportunities (both stages) with full fields
  const { data: opps } = await supabase
    .from('funnel_opportunities')
    .select('*')
    .order('nam_name')
    .order('customer_name')

  // Fetch customers with monthly billing data
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, nam_name, product_vertical')

  // Fetch monthly records for current FY (Apr 25 – present)
  const { data: monthly } = await supabase
    .from('monthly_records')
    .select('customer_id, month, abf_amount, revenue_realised, active_sims')
    .gte('month', '2025-04')
    .order('month')

  return (
    <LtbReportClient
      opps={opps ?? []}
      customers={customers ?? []}
      monthly={monthly ?? []}
    />
  )
}
