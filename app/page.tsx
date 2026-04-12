export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getSupabase } from '@/lib/supabase'
import { DashboardCards } from '@/components/dashboard-cards'
import { BillingTrendChart } from '@/components/billing-trend-chart'
import { VerticalAbfChart } from '@/components/vertical-abf-chart'
import { TopCustomersTable } from '@/components/top-customers-table'
import { NamFunnelPanel } from '@/components/nam-funnel-panel'
import { NamAbfChart } from '@/components/nam-abf-chart'

// ── Section heading helper ────────────────────────────────────────────────
function SectionHeading({ title, color }: { title: string; color: string }) {
  return (
    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
      <span className="inline-block w-1 h-5 rounded" style={{ background: color }} />
      {title}
    </h2>
  )
}

// ── Billing trend (ABF + Revenue + Efficiency, FY 2025-26 & FY 2026-27) ──
async function BillingTrendData() {
  const supabase = getSupabase()
  const fromMonth = '2025-04'
  const currentMonth = new Date().toISOString().slice(0, 7)

  const { data } = await supabase
    .from('monthly_records')
    .select('month, abf_amount, revenue_realised')
    .gte('month', fromMonth)
    .lte('month', currentMonth)

  const abfMap = new Map<string, number>()
  const revMap = new Map<string, number>()
  for (const r of data ?? []) {
    abfMap.set(r.month, (abfMap.get(r.month) ?? 0) + (r.abf_amount ?? 0))
    revMap.set(r.month, (revMap.get(r.month) ?? 0) + (r.revenue_realised ?? 0))
  }

  const allMonthKeys = Array.from(abfMap.keys()).concat(Array.from(revMap.keys()))
  const months = Array.from(new Set(allMonthKeys)).sort()
  const chartData = months.map(month => ({
    month: month.slice(0, 7),
    abf: abfMap.get(month) ?? 0,
    revenue: revMap.get(month) ?? 0,
  }))

  return <BillingTrendChart data={chartData} />
}

// ── Vertical-wise ABF ─────────────────────────────────────────────────────
async function VerticalAbfData() {
  const supabase = getSupabase()

  const { data: records } = await supabase
    .from('monthly_records')
    .select('customer_id, abf_amount, revenue_realised')
    .gte('month', '2025-04')
    .lte('month', '2026-03')

  const { data: customers } = await supabase
    .from('customers')
    .select('id, product_vertical')

  const verticalMap = new Map(customers?.map(c => [c.id, c.product_vertical ?? 'Other']) ?? [])

  const abfByVertical = new Map<string, number>()
  const revByVertical = new Map<string, number>()
  for (const r of records ?? []) {
    const v = verticalMap.get(r.customer_id) ?? 'Other'
    abfByVertical.set(v, (abfByVertical.get(v) ?? 0) + (r.abf_amount ?? 0))
    revByVertical.set(v, (revByVertical.get(v) ?? 0) + (r.revenue_realised ?? 0))
  }

  const order = ['CM', 'EB', 'CFA', 'Other']
  const chartData = order
    .filter(v => abfByVertical.has(v) || revByVertical.has(v))
    .map(v => ({
      vertical: v,
      abf: abfByVertical.get(v) ?? 0,
      revenue: revByVertical.get(v) ?? 0,
    }))

  return <VerticalAbfChart data={chartData} />
}

// ── NAM-wise ABF & Revenue — FY 2025-26 ──────────────────────────────────
async function NamAbfData() {
  const supabase = getSupabase()

  const [
    { data: records },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from('monthly_records')
      .select('customer_id, abf_amount, revenue_realised')
      .gte('month', '2025-04')
      .lte('month', '2026-03'),
    supabase
      .from('customers')
      .select('id, nam_name'),
  ])

  const namMap = new Map<string, string>()
  for (const c of customers ?? []) {
    if (c.nam_name) namMap.set(c.id, c.nam_name)
  }

  const abfByNam = new Map<string, number>()
  const revByNam = new Map<string, number>()
  for (const r of records ?? []) {
    const nam = namMap.get(r.customer_id)
    if (!nam) continue
    abfByNam.set(nam, (abfByNam.get(nam) ?? 0) + (r.abf_amount ?? 0))
    revByNam.set(nam, (revByNam.get(nam) ?? 0) + (r.revenue_realised ?? 0))
  }

  const chartData = Array.from(abfByNam.keys())
    .filter(nam => nam.trim() !== '')
    .map(nam => ({
      nam,
      abf: abfByNam.get(nam) ?? 0,
      revenue: revByNam.get(nam) ?? 0,
    }))
    .sort((a, b) => b.abf - a.abf)

  return <NamAbfChart data={chartData} />
}

// ── Dashboard page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="space-y-8">

      {/* ── KPI Cards ── */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        <DashboardCards />
      </Suspense>

      {/* ── Billing Trend ── */}
      <div>
        <SectionHeading title="Monthly ABF & Revenue Collection — FY 2025-26 & FY 2026-27 (₹ Cr)" color="#f57c00" />
        <Suspense fallback={<div className="h-72 rounded-lg bg-slate-100 animate-pulse" />}>
          <BillingTrendData />
        </Suspense>
      </div>

      {/* ── NAM-wise ABF & Revenue ── */}
      <div>
        <SectionHeading title="NAM-wise ABF & Revenue — FY 2025-26 (₹ Cr)" color="#2e7d32" />
        <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}>
          <NamAbfData />
        </Suspense>
      </div>

      {/* ── Two column: Vertical ABF + NAM Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeading title="ABF by Product Vertical — FY 2025-26" color="#1a237e" />
          <Suspense fallback={<div className="h-56 rounded-lg bg-slate-100 animate-pulse" />}>
            <VerticalAbfData />
          </Suspense>
        </div>

        <div>
          <SectionHeading title="NAM-wise Sales Funnel Performance" color="#2e7d32" />
          <Suspense fallback={<div className="h-56 rounded-lg bg-slate-100 animate-pulse" />}>
            <NamFunnelPanel />
          </Suspense>
        </div>
      </div>

      {/* ── Top Customers ── */}
      <div>
        <SectionHeading title="Top 10 Customers by Active SIMs" color="#283593" />
        <Suspense fallback={<div className="h-48 rounded-lg bg-slate-100 animate-pulse" />}>
          <TopCustomersTable />
        </Suspense>
      </div>

    </div>
  )
}
