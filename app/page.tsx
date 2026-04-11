import { Suspense } from 'react'
import { getSupabase } from '@/lib/supabase'
import { DashboardCards } from '@/components/dashboard-cards'
import { AbfChart } from '@/components/abf-chart'
import { TopCustomersTable } from '@/components/top-customers-table'

async function AbfChartData() {
  const supabase = getSupabase()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  const fromMonth = sixMonthsAgo.toISOString().slice(0, 7)

  const { data } = await supabase
    .from('monthly_records')
    .select('month, abf_amount')
    .gte('month', fromMonth)

  const monthTotals = new Map<string, number>()
  for (const r of data ?? []) {
    monthTotals.set(r.month, (monthTotals.get(r.month) ?? 0) + (r.abf_amount ?? 0))
  }

  const chartData = Array.from(monthTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, abf]) => ({ month, abf }))

  return <AbfChart data={chartData} />
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      {/* ── KPI Cards ── */}
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        }
      >
        <DashboardCards />
      </Suspense>

      {/* ── ABF Chart ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded" style={{ background: '#f57c00' }} />
          ABF Trend — Last 6 Months (₹ Cr)
        </h2>
        <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}>
          <AbfChartData />
        </Suspense>
      </div>

      {/* ── Top Customers ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded" style={{ background: '#2e7d32' }} />
          Top 10 Customers by Active SIMs
        </h2>
        <Suspense fallback={<div className="h-48 rounded-lg bg-slate-100 animate-pulse" />}>
          <TopCustomersTable />
        </Suspense>
      </div>

    </div>
  )
}
