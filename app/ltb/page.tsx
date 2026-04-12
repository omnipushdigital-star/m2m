import { getSupabase } from '@/lib/supabase'
import { LtbReportClient } from '@/components/ltb-report-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lead to Bill Report' }

export default async function LtbPage() {
  const supabase = getSupabase()

  const [{ data: opps }, { data: customers }, { data: monthly }] = await Promise.all([
    supabase
      .from('funnel_opportunities')
      .select('id, opp_id, customer_name, nam_name, main_category, business_type, funnel_stage, product_name, product_details, product_vertical, quantity, base_tariff, after_discount, after_negotiation, po_value, contract_period, commissioned_qty, commissioned_status, po_date, remarks_current, commitment, stage_week1, stage_week2, stage_week3, stage_week4, stage_current, annualized_value, abf_generated_total, billing_cycle')
      .order('nam_name')
      .order('customer_name'),

    supabase
      .from('customers')
      .select('id, name, nam_name, product_vertical'),

    // Fetch all months so billing summary is complete
    supabase
      .from('monthly_records')
      .select('customer_id, month, abf_amount, revenue_realised, active_sims')
      .order('month'),
  ])

  return (
    <LtbReportClient
      opps={opps ?? []}
      customers={customers ?? []}
      monthly={monthly ?? []}
    />
  )
}
