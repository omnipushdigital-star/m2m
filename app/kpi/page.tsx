import { getSupabase } from '@/lib/supabase'
import { KpiTracker } from '@/components/kpi-tracker'

export const metadata = { title: 'KPI Tracker' }
export const dynamic = 'force-dynamic'

// ── Quarter date ranges for FY 2025-26 ──────────────────────────────────────
const FY = '2025-26'
const QUARTERS = {
  q1: { from: '2025-04-01', to: '2025-06-30', months: ['2025-04','2025-05','2025-06'] },
  q2: { from: '2025-07-01', to: '2025-09-30', months: ['2025-07','2025-08','2025-09'] },
  q3: { from: '2025-10-01', to: '2025-12-31', months: ['2025-10','2025-11','2025-12'] },
  q4: { from: '2026-01-01', to: '2026-03-31', months: ['2026-01','2026-02','2026-03'] },
}
const FY_FROM = '2025-04-01'
const FY_TO   = '2026-03-31'

function sumPo(rows: { po_value: number | null }[]) {
  return rows.reduce((s, r) => s + (r.po_value ?? 0), 0)
}
function sumAbf(rows: { abf_amount: number | null }[]) {
  return rows.reduce((s, r) => s + (r.abf_amount ?? 0), 0)
}

export default async function KpiPage() {
  const supabase = getSupabase()

  // ── Fetch Stage 4 opportunities (full FY) ──
  const { data: s4all } = await supabase
    .from('funnel_opportunities')
    .select('po_value, po_date, business_type, main_category, product_name, product_vertical')
    .eq('funnel_stage', 4)
    .gte('po_date', FY_FROM)
    .lte('po_date', FY_TO)

  // ── Fetch monthly ABF records (full FY) ──
  const { data: abfAll } = await supabase
    .from('monthly_records')
    .select('abf_amount, month')
    .in('month', [...QUARTERS.q1.months, ...QUARTERS.q2.months, ...QUARTERS.q3.months, ...QUARTERS.q4.months])

  // ── Fetch Stage 1 pipeline (current total) ──
  const { data: s1all } = await supabase
    .from('funnel_opportunities')
    .select('base_tariff')
    .eq('funnel_stage', 1)

  const s4 = s4all ?? []
  const abf = abfAll ?? []
  const s1 = s1all ?? []

  // ── Helper: filter by quarter ──
  function byQ(rows: typeof s4, q: keyof typeof QUARTERS) {
    const { from, to } = QUARTERS[q]
    return rows.filter(r => r.po_date && r.po_date >= from && r.po_date <= to)
  }
  function abfByQ(q: keyof typeof QUARTERS) {
    return abf.filter(r => QUARTERS[q].months.includes(r.month))
  }

  // ── KPI 1: Stage IV — all POs in FY ──
  const stage4 = {
    annual: sumPo(s4),
    q1: sumPo(byQ(s4, 'q1')), q2: sumPo(byQ(s4, 'q2')),
    q3: sumPo(byQ(s4, 'q3')), q4: sumPo(byQ(s4, 'q4')),
  }

  // ── KPI 2: Stage I — current pipeline ──
  const stage1Total = s1.reduce((s, r) => s + (r.base_tariff ?? 0), 0)
  const stage1 = { annual: stage1Total, q1: 0, q2: 0, q3: 0, q4: 0 }

  // ── KPI 3: ABF ──
  const abfKpi = {
    annual: sumAbf(abf),
    q1: sumAbf(abfByQ('q1')), q2: sumAbf(abfByQ('q2')),
    q3: sumAbf(abfByQ('q3')), q4: sumAbf(abfByQ('q4')),
  }

  // ── KPI 4: New Business — exclude renewals ──
  const newBiz = s4.filter(r => (r.business_type ?? '').toLowerCase() !== 'renewal')
  const newBusiness = {
    annual: sumPo(newBiz),
    q1: sumPo(byQ(newBiz, 'q1')), q2: sumPo(byQ(newBiz, 'q2')),
    q3: sumPo(byQ(newBiz, 'q3')), q4: sumPo(byQ(newBiz, 'q4')),
  }

  // ── KPI 5: Cluster BW / DC ──
  const clusterKws = ['cluster','data centre','data center','dc bandwidth','bulk bandwidth']
  const clusterRows = s4.filter(r =>
    clusterKws.some(kw => (r.product_name ?? '').toLowerCase().includes(kw))
  )
  const clusterBw = {
    annual: sumPo(clusterRows),
    q1: sumPo(byQ(clusterRows, 'q1')), q2: sumPo(byQ(clusterRows, 'q2')),
    q3: sumPo(byQ(clusterRows, 'q3')), q4: sumPo(byQ(clusterRows, 'q4')),
  }

  // ── KPI 6: Emerging Areas (IoT / M2M / SDWAN / CNPN / IDC) ──
  const emergingKws = ['iot','m2m','sdwan','cnpn','idc']
  const emergingRows = s4.filter(r =>
    emergingKws.some(kw =>
      (r.product_vertical ?? '').toLowerCase().includes(kw) ||
      (r.product_name ?? '').toLowerCase().includes(kw)
    )
  )
  const emerging = {
    annual: sumPo(emergingRows),
    q1: sumPo(byQ(emergingRows, 'q1')), q2: sumPo(byQ(emergingRows, 'q2')),
    q3: sumPo(byQ(emergingRows, 'q3')), q4: sumPo(byQ(emergingRows, 'q4')),
  }

  // ── KPI 7: Private Business ──
  const privateRows = s4.filter(r => (r.main_category ?? '').toUpperCase() === 'PRIVATE')
  const privateBiz = {
    annual: sumPo(privateRows),
    q1: sumPo(byQ(privateRows, 'q1')), q2: sumPo(byQ(privateRows, 'q2')),
    q3: sumPo(byQ(privateRows, 'q3')), q4: sumPo(byQ(privateRows, 'q4')),
  }

  // ── KPI 8: VSAT ──
  const vsatRows = s4.filter(r => (r.product_name ?? '').toLowerCase().includes('vsat'))
  const vsat = {
    annual: sumPo(vsatRows),
    q1: sumPo(byQ(vsatRows, 'q1')), q2: sumPo(byQ(vsatRows, 'q2')),
    q3: sumPo(byQ(vsatRows, 'q3')), q4: sumPo(byQ(vsatRows, 'q4')),
  }

  // ── KPI 9: Inmarsat ──
  const inmarsatRows = s4.filter(r => (r.product_name ?? '').toLowerCase().includes('inmarsat'))
  const inmarsat = {
    annual: sumPo(inmarsatRows),
    q1: sumPo(byQ(inmarsatRows, 'q1')), q2: sumPo(byQ(inmarsatRows, 'q2')),
    q3: sumPo(byQ(inmarsatRows, 'q3')), q4: sumPo(byQ(inmarsatRows, 'q4')),
  }

  // ── KPI 10: Fiber / Dark Fiber ──
  const fiberRows = s4.filter(r =>
    ['fiber','fibre','dark fiber','dark fibre'].some(kw =>
      (r.product_name ?? '').toLowerCase().includes(kw)
    )
  )
  const fiber = {
    annual: sumPo(fiberRows),
    q1: sumPo(byQ(fiberRows, 'q1')), q2: sumPo(byQ(fiberRows, 'q2')),
    q3: sumPo(byQ(fiberRows, 'q3')), q4: sumPo(byQ(fiberRows, 'q4')),
  }

  const achievements = {
    stage4, stage1, abf: abfKpi, newBusiness,
    clusterBw, emerging, privateBiz, vsat, inmarsat, fiber,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KPI Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">
          GGN Unit · EB Platinum · FY {FY} · Auto-calculated from live data
        </p>
      </div>
      <KpiTracker fy={FY} achievements={achievements} />
    </div>
  )
}
