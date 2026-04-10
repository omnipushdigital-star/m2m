'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function upsertCustomerPlan(customerId: string, planId: string, simCount: number) {
  const supabase = getSupabase()
  const { error } = await supabase.from('customer_plans').upsert(
    { customer_id: customerId, plan_id: planId, sim_count: simCount },
    { onConflict: 'customer_id,plan_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}

export async function removeCustomerPlan(id: string, customerId: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('customer_plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}
