'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

function parseCustomerForm(formData: FormData) {
  const str = (key: string) => (formData.get(key) as string) || null
  const num = (key: string) => {
    const v = formData.get(key) as string
    return v ? parseFloat(v) : null
  }
  const int = (key: string) => {
    const v = formData.get(key) as string
    return v ? parseInt(v) : null
  }
  return {
    opp_id: str('opp_id'),
    s_no: int('s_no'),
    unit: str('unit'),
    city: str('city'),
    name: formData.get('name') as string,
    msme: str('msme'),
    msme_id: str('msme_id'),
    business_type: str('business_type'),
    customer_type: str('customer_type'),
    main_category: str('main_category'),
    category: str('category'),
    nam_name: str('nam_name'),
    cp_name: str('cp_name'),
    tender_negotiation: str('tender_negotiation'),
    year: int('year'),
    week_number: int('week_number'),
    cluster: str('cluster'),
    product_name: str('product_name'),
    quantity: int('quantity'),
    details: str('details'),
    base_tariff: num('base_tariff'),
    after_discount: num('after_discount'),
    after_negotiation: num('after_negotiation'),
    po_value: num('po_value'),
    revenue_realised: num('revenue_realised'),
    moved_to_stage4_on: str('moved_to_stage4_on'),
    po_date: str('po_date'),
    po_letter_number: str('po_letter_number'),
    additional_payment: num('additional_payment'),
    contract_period: int('contract_period'),
    commissioned_qty: int('commissioned_qty'),
    billed_amount: num('billed_amount'),
    commissioned_status: str('commissioned_status'),
    commissioned_on: str('commissioned_on'),
    vendor_name: str('vendor_name'),
    annualized_value: num('annualized_value'),
    billing_cycle: str('billing_cycle'),
    qty_commissioned: int('qty_commissioned'),
    commissioning_pending: int('commissioning_pending'),
    abf_generated: num('abf_generated'),
    reason_for_pendancy: str('reason_for_pendancy'),
    product_vertical: str('product_vertical'),
  }
}

export async function createCustomer(formData: FormData) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .insert(parseCustomerForm(formData))
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  redirect(`/customers/${data.id}`)
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('customers')
    .update(parseCustomerForm(formData))
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${id}`)
  revalidatePath('/customers')
}
