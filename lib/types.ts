export type Plan = {
  id: string
  plan_name: string
  data_limit: string | null
  sms_limit: string | null
  created_at: string
}

export type Customer = {
  id: string
  opp_id: string | null
  s_no: number | null
  unit: string | null
  city: string | null
  name: string
  msme: string | null
  msme_id: string | null
  business_type: string | null
  customer_type: string | null
  main_category: string | null
  category: string | null
  nam_name: string | null
  cp_name: string | null
  tender_negotiation: string | null
  year: number | null
  week_number: number | null
  cluster: string | null
  product_name: string | null
  quantity: number | null
  details: string | null
  base_tariff: number | null
  after_discount: number | null
  after_negotiation: number | null
  po_value: number | null
  revenue_realised: number | null
  moved_to_stage4_on: string | null
  po_date: string | null
  po_letter_number: string | null
  additional_payment: number | null
  contract_period: number | null
  commissioned_qty: number | null
  billed_amount: number | null
  commissioned_status: string | null
  commissioned_on: string | null
  vendor_name: string | null
  annualized_value: number | null
  billing_cycle: string | null
  qty_commissioned: number | null
  commissioning_pending: number | null
  abf_generated: number | null
  reason_for_pendancy: string | null
  product_vertical: string | null
  created_at: string
}

export type CustomerPlan = {
  id: string
  customer_id: string
  plan_id: string
  sim_count: number
  created_at: string
  plan?: Plan
}

export type MonthlyRecord = {
  id: string
  customer_id: string
  month: string
  activations: number
  deactivations: number
  plan_changes: number
  active_sims: number
  abf_amount: number
  revenue_realised: number
  commissioning_pending: number
  notes: string | null
  created_at: string
}

export type CustomerWithPlans = Customer & {
  customer_plans: CustomerPlan[]
  monthly_records: MonthlyRecord[]
}
