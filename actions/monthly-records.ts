'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function createMonthlyRecord(customerId: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('monthly_records').insert({
    customer_id: customerId,
    month: formData.get('month') as string,
    activations: parseInt(formData.get('activations') as string) || 0,
    deactivations: parseInt(formData.get('deactivations') as string) || 0,
    plan_changes: parseInt(formData.get('plan_changes') as string) || 0,
    active_sims: parseInt(formData.get('active_sims') as string) || 0,
    abf_amount: parseFloat(formData.get('abf_amount') as string) || 0,
    revenue_realised: parseFloat(formData.get('revenue_realised') as string) || 0,
    commissioning_pending: parseInt(formData.get('commissioning_pending') as string) || 0,
    notes: (formData.get('notes') as string) || null,
  })
  if (error) {
    if (error.code === '23505') throw new Error('A record for this month already exists.')
    throw new Error(error.message)
  }
  revalidatePath(`/customers/${customerId}`)
}

export async function updateMonthlyRecord(id: string, customerId: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('monthly_records').update({
    activations: parseInt(formData.get('activations') as string) || 0,
    deactivations: parseInt(formData.get('deactivations') as string) || 0,
    plan_changes: parseInt(formData.get('plan_changes') as string) || 0,
    active_sims: parseInt(formData.get('active_sims') as string) || 0,
    abf_amount: parseFloat(formData.get('abf_amount') as string) || 0,
    revenue_realised: parseFloat(formData.get('revenue_realised') as string) || 0,
    commissioning_pending: parseInt(formData.get('commissioning_pending') as string) || 0,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}

export async function deleteMonthlyRecord(id: string, customerId: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('monthly_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}
