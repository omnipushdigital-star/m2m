'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function addNam(formData: FormData) {
  const supabase = getSupabase()

  const { error } = await supabase.from('nams').insert({
    name:         (formData.get('name') as string).trim().toUpperCase(),
    display_name: (formData.get('display_name') as string).trim() || null,
    email:        (formData.get('email') as string).trim().toLowerCase() || null,
    phone:        (formData.get('phone') as string).trim() || null,
    designation:  formData.get('designation') as string || 'NAM',
    active:       formData.get('active') === 'true',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/nams')
}

export async function updateNam(id: string, formData: FormData) {
  const supabase = getSupabase()

  const { error } = await supabase.from('nams').update({
    display_name: (formData.get('display_name') as string).trim() || null,
    email:        (formData.get('email') as string).trim().toLowerCase() || null,
    phone:        (formData.get('phone') as string).trim() || null,
    designation:  formData.get('designation') as string || 'NAM',
    active:       formData.get('active') === 'true',
    updated_at:   new Date().toISOString(),
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/nams')
}
