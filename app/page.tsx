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
      {/* ── BSNL Hero Banner ── */}
      <div
        className="-mx-4 -mt-6 px-4 py-8 mb-2"
        style={{
          background: 'linear-gradient(135deg, #0d1457 0%, #1a237e 55%, #283593 100%)',
          borderBottom: '4px solid #f57c00',
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left — unit identity */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em] mb-1"
              style={{ color: '#f57c00' }}
            >
              Bharat Sanchar Nigam Limited
            </p>
            <h1
              className="text-2xl md:text-3xl font-extrabold text-white tracking-wide leading-tight"
            >
              EB PLATINUM UNIT GURGAON
            </h1>
            <p
              className="text-base font-semibold mt-0.5 tracking-widest"
              style={{ color: '#43a047' }}
            >
              CNTx- N
            </p>
          </div>

          {/* Right — module label */}
          <div className="text-right">
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white"
              style={{ background: '#f57c00' }}
            >
              M2M / IoT SIM Inventory
            </span>
            <p className="text-white/50 text-xs mt-1">Billing &amp; Activation Tracker</p>
          </div>
        </div>
      </div>

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
        <h2
          className="text-lg font-semibold mb-3 flex items-center gap-2"
        >
          <span
            className="inline-block w-1 h-5 rounded"
            style={{ background: '#f57c00' }}
          />
          ABF Trend — Last 6 Months (₹ Cr)
        </h2>
        <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}>
          <AbfChartData />
        </Suspense>
      </div>

      {/* ── Top Customers ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span
            className="inline-block w-1 h-5 rounded"
            style={{ background: '#2e7d32' }}
          />
          Top 10 Customers by Active SIMs
        </h2>
        <Suspense fallback={<div className="h-48 rounded-lg bg-slate-100 animate-pulse" />}>
          <TopCustomersTable />
        </Suspense>
      </div>
    </div>
  )
}
