import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const supabase = getSupabase()

  const [simRes, billingRes, changeRes, planRes] = await Promise.all([
    supabase
      .from('sim_customer_summary')
      .select('customer_name_raw, customer_id, match_status, total_sims, by_plan, by_apn')
      .eq('upload_month', month),

    supabase
      .from('monthly_records')
      .select('customer_id, active_sims, abf_amount, customers(name)')
      .eq('month', month),

    supabase
      .from('sim_change_log')
      .select('upload_month, customer_name_raw, customer_id, total_sims, prev_total_sims, net_change')
      .order('upload_month', { ascending: false })
      .limit(500),

    supabase
      .from('customer_plans')
      .select('customer_id, sim_count, plans(plan_name)'),
  ])

  return NextResponse.json({
    simData:      simRes.data      ?? [],
    billingData:  billingRes.data  ?? [],
    changeLog:    changeRes.data   ?? [],
    customerPlans: planRes.data    ?? [],
  })
}
