import { getSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const cardAccents = [
  '#1a237e', // navy  — customers
  '#f57c00', // orange — active SIMs
  '#2e7d32', // green  — ABF this month
  '#283593', // navy-light — commissioning
]

export async function DashboardCards() {
  const supabase = getSupabase()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [
    { count: customerCount },
    { data: currentMonthRecords },
    { data: allLatestRecords },
    { data: fy2526Records },
    { data: fy2425Records },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('monthly_records').select('abf_amount, commissioning_pending, active_sims').eq('month', currentMonth),
    supabase.from('monthly_records').select('customer_id, active_sims, commissioning_pending').order('month', { ascending: false }),
    supabase.from('monthly_records').select('abf_amount').gte('month', '2026-04').lte('month', '2027-03'),
    supabase.from('monthly_records').select('abf_amount').gte('month', '2025-04').lte('month', '2026-03'),
  ])

  const latestPerCustomer = new Map<string, { active_sims: number; commissioning_pending: number }>()
  for (const r of allLatestRecords ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) {
      latestPerCustomer.set(r.customer_id, {
        active_sims: r.active_sims ?? 0,
        commissioning_pending: r.commissioning_pending ?? 0,
      })
    }
  }
  const totalActiveSims    = Array.from(latestPerCustomer.values()).reduce((s, r) => s + r.active_sims, 0)
  const totalAbfThisMonth  = (currentMonthRecords ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalPending       = (currentMonthRecords ?? []).reduce((s, r) => s + (r.commissioning_pending ?? 0), 0)
  const totalAbfFY2627     = (fy2526Records ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalAbfLastFY     = (fy2425Records ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)

  const topCards = [
    { title: 'Total Customers',       value: customerCount ?? 0, format: 'count'   as const },
    { title: 'Total Active SIMs',     value: totalActiveSims,     format: 'count'   as const },
    { title: 'ABF This Month (₹ Cr)', value: totalAbfThisMonth,   format: 'decimal' as const },
    { title: 'Commissioning Pending', value: totalPending,        format: 'count'   as const },
  ]

  const fyCards = [
    {
      title: 'Total ABF — FY 2026-27 (₹ Cr)',
      value: totalAbfFY2627,
      color: '#f57c00',
      sub: 'Current FY · Apr 2026 – Mar 2027',
    },
    {
      title: 'Total ABF — FY 2025-26 (₹ Cr)',
      value: totalAbfLastFY,
      color: '#1565c0',
      sub: 'Last FY · Apr 2025 – Mar 2026',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Row 1: operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topCards.map((card, i) => (
          <Card
            key={card.title}
            className="overflow-hidden border-0 shadow-sm"
            style={{ borderTop: `4px solid ${cardAccents[i]}` }}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: cardAccents[i] }}
              >
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-slate-800">
                {card.format === 'decimal'
                  ? card.value.toFixed(3)
                  : card.value.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: FY ABF comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fyCards.map(card => (
          <Card
            key={card.title}
            className="overflow-hidden border-0 shadow-sm"
            style={{ borderTop: `4px solid ${card.color}` }}
          >
            <CardHeader className="pb-1">
              <CardTitle
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: card.color }}
              >
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <p className="text-3xl font-extrabold text-slate-800">
                {card.value.toFixed(3)}
              </p>
              <span className="text-xs text-slate-400 mb-1">{card.sub}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
