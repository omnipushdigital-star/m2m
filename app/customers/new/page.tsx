import { redirect } from 'next/navigation'
import { getRole } from '@/lib/supabase-server'
import { CustomerForm } from '@/components/customer-form'

export default async function NewCustomerPage() {
  const role = await getRole()
  if (role !== 'admin') redirect('/customers')

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>
      <CustomerForm />
    </div>
  )
}
