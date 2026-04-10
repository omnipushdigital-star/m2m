import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export async function TopCustomersTable() {
  const supabase = getSupabase()
  const { data: records } = await supabase
    .from('monthly_records')
    .select('customer_id, active_sims, month')
    .order('month', { ascending: false })

  const latestPerCustomer = new Map<string, number>()
  for (const r of records ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) {
      latestPerCustomer.set(r.customer_id, r.active_sims ?? 0)
    }
  }

  const topIds = Array.from(latestPerCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  if (topIds.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, product_vertical')
    .in('id', topIds)

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? [])

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-4 py-2 text-left font-medium">Customer</th>
            <th className="px-4 py-2 text-left font-medium">Vertical</th>
            <th className="px-4 py-2 text-right font-medium">Active SIMs</th>
          </tr>
        </thead>
        <tbody>
          {topIds.map((id, i) => {
            const c = customerMap.get(id)
            return (
              <tr key={id} className="border-t">
                <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                <td className="px-4 py-2">
                  <Link href={`/customers/${id}`} className="text-blue-600 hover:underline">
                    {c?.name ?? id}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{c?.product_vertical ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {(latestPerCustomer.get(id) ?? 0).toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
