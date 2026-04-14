import { getSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function momPct(cur: number, prev: number): { pct: number; up: boolean } {
  const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0
  return { pct, up: pct >= 0 }
}

function MomIndicator({ cur, prev }: { cur: number; prev: number }) {
  // If no previous month data at all, show nothing
  if (prev === 0 && cur === 0) return null
  const { pct, up } = momPct(cur, prev)
  if (pct === 0 && prev === 0) return null
  return (
    <p className={`text-xs mt-1 font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? `▲ +${pct}%` : `▼ ${pct}%`} vs last month
    </p>
  )
}

export async function DashboardCards() {
  const supabase = getSupabase()
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Compute previous month
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  const prevMonth = d.toISOString().slice(0, 7)

  const [
    { count: customerCount },
    { data: currentMonthRecords },
    { data: previousMonthRecords },
    { data: fy2627Records },
    { data: fy2526Records },
    { data: allLatestRecords },
    { data: prevMonthSimRecords },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase
      .from('monthly_records')
      .select('abf_amount, revenue_realised')
      .eq('month', currentMonth),
    supabase
      .from('monthly_records')
      .select('abf_amount, revenue_realised')
      .eq('month', prevMonth),
    supabase
      .from('monthly_records')
      .select('abf_amount')
      .gte('month', '2026-04')
      .lte('month', '2027-03'),
    supabase
      .from('monthly_records')
      .select('abf_amount, revenue_realised')
      .gte('month', '2025-04')
      .lte('month', '2026-03'),
    supabase
      .from('monthly_records')
      .select('customer_id, active_sims, month')
      .order('month', { ascending: false }),
    supabase
      .from('monthly_records')
      .select('active_sims')
      .eq('month', prevMonth),
  ])

  // Latest active_sims per customer
  const latestPerCustomer = new Map<string, number>()
  for (const r of allLatestRecords ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) {
      latestPerCustomer.set(r.customer_id, r.active_sims ?? 0)
    }
  }
  const totalActiveSims = Array.from(latestPerCustomer.values()).reduce((s, v) => s + v, 0)
  const totalPrevMonthSims = (prevMonthSimRecords ?? []).reduce((s, r) => s + (r.active_sims ?? 0), 0)

  // Current month aggregates
  const totalAbfCurMonth = (currentMonthRecords ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalRevCurMonth = (currentMonthRecords ?? []).reduce((s, r) => s + (r.revenue_realised ?? 0), 0)

  // Previous month aggregates
  const totalAbfPrevMonth = (previousMonthRecords ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalRevPrevMonth = (previousMonthRecords ?? []).reduce((s, r) => s + (r.revenue_realised ?? 0), 0)

  // FY aggregates
  const totalAbfFY2627 = (fy2627Records ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalAbfFY2526 = (fy2526Records ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalRevFY2526 = (fy2526Records ?? []).reduce((s, r) => s + (r.revenue_realised ?? 0), 0)

  // Efficiency
  const efficiencyFY2526 = totalAbfFY2526 > 0 ? (totalRevFY2526 / totalAbfFY2526) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Row 1: 4 operational KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 — Total Customers */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #1a237e' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1a237e' }}>
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-800">
              {(customerCount ?? 0).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        {/* Card 2 — Active SIMs */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #f57c00' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f57c00' }}>
              Active SIMs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-800">
              {totalActiveSims.toLocaleString('en-IN')}
            </p>
            <MomIndicator cur={totalActiveSims} prev={totalPrevMonthSims} />
          </CardContent>
        </Card>

        {/* Card 3 — ABF This Month */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #f57c00' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f57c00' }}>
              ABF This Month (₹ Cr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-800">
              {totalAbfCurMonth.toFixed(3)}
            </p>
            <MomIndicator cur={totalAbfCurMonth} prev={totalAbfPrevMonth} />
          </CardContent>
        </Card>

        {/* Card 4 — Revenue This Month */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #2e7d32' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2e7d32' }}>
              Revenue This Month (₹ Cr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-slate-800">
              {totalRevCurMonth.toFixed(3)}
            </p>
            <MomIndicator cur={totalRevCurMonth} prev={totalRevPrevMonth} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: 3 FY summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 5 — FY 2026-27 ABF */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #f57c00' }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f57c00' }}>
              Total ABF — FY 2026-27 (₹ Cr)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-3xl font-extrabold text-slate-800">
              {totalAbfFY2627.toFixed(3)}
            </p>
            <span className="text-xs text-slate-400 mb-1">Current FY · Apr 2026 – Mar 2027</span>
          </CardContent>
        </Card>

        {/* Card 6 — FY 2025-26 ABF */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #1565c0' }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1565c0' }}>
              Total ABF — FY 2025-26 (₹ Cr)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-3xl font-extrabold text-slate-800">
              {totalAbfFY2526.toFixed(3)}
            </p>
            <span className="text-xs text-slate-400 mb-1">Last FY · Apr 2025 – Mar 2026</span>
          </CardContent>
        </Card>

        {/* Card 7 — Revenue Efficiency FY 2025-26 */}
        <Card className="overflow-hidden border-0 shadow-sm" style={{ borderTop: '4px solid #2e7d32' }}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2e7d32' }}>
              Revenue Efficiency — FY 2025-26
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-3xl font-extrabold text-slate-800">
              {efficiencyFY2526.toFixed(1)}%
            </p>
            <span className="text-xs text-slate-400 mb-1">Revenue collected vs ABF generated</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
