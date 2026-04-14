import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { getRole } from '@/lib/supabase-server'
import { SimUploadClient } from '@/components/sim-upload-client'

export const dynamic = 'force-dynamic'

export default async function SimUploadPage() {
  const role = await getRole()
  if (role !== 'admin') redirect('/')

  const supabase = getSupabase()
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .order('name')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SIM Inventory Upload</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload the monthly M2M SIM active dump (tab or comma delimited text file).
          New SIMs are activated, missing SIMs are marked deactivated, and plan/APN changes are tracked.
        </p>
      </div>
      <SimUploadClient customers={customers ?? []} />
    </div>
  )
}
