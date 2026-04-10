import { getSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function DashboardCards() {
  const supabase = getSupabase()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [{ count: customerCount }, { data: currentMonthRecords }, { data: allLatestRecords }] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('monthly_records').select('abf_amount, commissioning_pending, active_sims').eq('month', currentMonth),
    supabase.from('monthly_records').select('customer_id, active_sims, commissioning_pending').order('month', { ascending: false }),
  ])

  const latestPerCustomer = new Map<string, { active_sims: number; commissioning_pending: number }>()
  for (const r of allLatestRecords ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) {
      latestPerCustomer.set(r.customer_id, { active_sims: r.active_sims ?? 0, commissioning_pending: r.commissioning_pending ?? 0 })
    }
  }
  const totalActiveSims = [...latestPerCustomer.values()].reduce((s, r) => s + r.active_sims, 0)

  const totalAbfThisMonth = (currentMonthRecords ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalPending = (currentMonthRecords ?? []).reduce((s, r) => s + (r.commissioning_pending ?? 0), 0)

  const cards = [
    { title: 'Total Customers', value: customerCount ?? 0, format: 'count' as const },
    { title: 'Total Active SIMs', value: totalActiveSims, format: 'count' as const },
    { title: 'ABF This Month (₹ Cr)', value: totalAbfThisMonth, format: 'decimal' as const },
    { title: 'Commissioning Pending', value: totalPending, format: 'count' as const },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {card.format === 'decimal'
                ? card.value.toFixed(3)
                : card.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
