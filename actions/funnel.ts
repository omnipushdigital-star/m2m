'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

// ── Add Stage 1 Opportunity ───────────────────────────────────────────────────

export async function addStage1Opportunity(formData: FormData) {
  const supabase = getSupabase()

  const qty = formData.get('quantity') as string
  const tariff = formData.get('base_tariff') as string

  const { error } = await supabase.from('funnel_opportunities').insert({
    funnel_stage:  1,
    customer_name: (formData.get('customer_name') as string).trim(),
    nam_name:      (formData.get('nam_name') as string).trim() || null,
    main_category: formData.get('main_category') as string || null,
    product_name:  (formData.get('product_name') as string).trim() || null,
    quantity:      qty ? parseInt(qty) : null,
    base_tariff:   tariff ? parseFloat(tariff) : null,
    business_type: formData.get('business_type') as string || null,
    commitment:    formData.get('commitment') ? parseInt(formData.get('commitment') as string) : null,
    remarks_current: (formData.get('remarks_current') as string).trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/funnel/stage1')
}

// ── Move Stage 1 → Stage 4 ───────────────────────────────────────────────────

export async function moveToStage4(id: string, formData: FormData) {
  const supabase = getSupabase()

  const poValue       = formData.get('po_value') as string
  const annualValue   = formData.get('annualized_value') as string
  const commQty       = formData.get('commissioned_qty') as string
  const contractYears = formData.get('contract_period') as string
  const oppId         = formData.get('opp_id') as string

  const { error } = await supabase
    .from('funnel_opportunities')
    .update({
      funnel_stage:        4,
      moved_to_stage4_on:  new Date().toISOString().slice(0, 10),
      opp_id:              oppId ? parseInt(oppId) : null,
      po_date:             (formData.get('po_date') as string) || null,
      po_value:            poValue ? parseFloat(poValue) : null,
      contract_period:     contractYears ? parseInt(contractYears) : null,
      commissioned_qty:    commQty ? parseInt(commQty) : null,
      commissioned_status: formData.get('commissioned_status') as string || null,
      product_vertical:    formData.get('product_vertical') as string || null,
      annualized_value:    annualValue ? parseFloat(annualValue) : null,
      billing_cycle:       formData.get('billing_cycle') as string || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/funnel/stage1')
  revalidatePath('/funnel/stage4')
}

// ── Update Stage 4 Opportunity ───────────────────────────────────────────────

export async function updateStage4Opportunity(id: string, formData: FormData) {
  const supabase = getSupabase()

  const g = (k: string) => (formData.get(k) as string) || null

  const { error } = await supabase
    .from('funnel_opportunities')
    .update({
      // Basic info
      opp_id:              g('opp_id')       ? parseInt(g('opp_id')!)       : null,
      nam_name:            g('nam_name'),
      main_category:       g('main_category'),
      product_name:        g('product_name'),
      product_details:     g('product_details'),
      quantity:            g('quantity')     ? parseInt(g('quantity')!)     : null,
      remarks_current:     g('remarks_current'),
      // PO details
      po_date:             g('po_date'),
      po_value:            g('po_value')     ? parseFloat(g('po_value')!)   : null,
      contract_period:     g('contract_period') ? parseInt(g('contract_period')!) : null,
      // Commissioning
      commissioned_qty:    g('commissioned_qty') ? parseInt(g('commissioned_qty')!) : null,
      commissioned_status: g('commissioned_status'),
      billing_cycle:       g('billing_cycle'),
      product_vertical:    g('product_vertical'),
      // Financial
      annualized_value:    g('annualized_value')    ? parseFloat(g('annualized_value')!)    : null,
      abf_generated_total: g('abf_generated_total') ? parseFloat(g('abf_generated_total')!) : null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/ltb')
  revalidatePath('/funnel/stage4')
}

// ── Update Stage 1 Opportunity ───────────────────────────────────────────────

export async function updateStage1Opportunity(id: string, formData: FormData) {
  const supabase = getSupabase()

  const qty    = formData.get('quantity') as string
  const tariff = formData.get('base_tariff') as string

  const { error } = await supabase
    .from('funnel_opportunities')
    .update({
      customer_name:   (formData.get('customer_name') as string).trim(),
      nam_name:        (formData.get('nam_name') as string).trim() || null,
      main_category:   formData.get('main_category') as string || null,
      product_name:    (formData.get('product_name') as string).trim() || null,
      quantity:        qty ? parseInt(qty) : null,
      base_tariff:     tariff ? parseFloat(tariff) : null,
      business_type:   formData.get('business_type') as string || null,
      commitment:      formData.get('commitment') ? parseInt(formData.get('commitment') as string) : null,
      remarks_current: (formData.get('remarks_current') as string).trim() || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/funnel/stage1')
}
