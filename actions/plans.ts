'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function createPlan(formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('plans').insert({
    plan_name: formData.get('plan_name') as string,
    data_limit: (formData.get('data_limit') as string) || null,
    sms_limit: (formData.get('sms_limit') as string) || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function updatePlan(id: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('plans').update({
    plan_name: formData.get('plan_name') as string,
    data_limit: (formData.get('data_limit') as string) || null,
    sms_limit: (formData.get('sms_limit') as string) || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function deletePlan(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}
