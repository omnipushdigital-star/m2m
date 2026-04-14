import { getSupabase } from '@/lib/supabase'
import { SimSnapshotClient, type CustomerEntry, type PlanEntry } from './sim-snapshot-client'

type RawRow = {
  customer_name_raw: string
  customer_id:       string | null
  match_status:      string
  total_sims:        number
  by_plan:           Record<string, number> | null
  customers:         { name: string } | { name: string }[] | null
}

function getCustomerName(row: RawRow): string {
  if (!row.customers) return row.customer_name_raw
  if (Array.isArray(row.customers)) return row.customers[0]?.name ?? row.customer_name_raw
  return row.customers.name ?? row.customer_name_raw
}

// Merge rows that share the same customer_id
function consolidate(rows: RawRow[]): RawRow[] {
  const map = new Map<string, RawRow>()
  rows.forEach(row => {
    const key = row.customer_id ? `id:${row.customer_id}` : `raw:${row.customer_name_raw}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...row, by_plan: row.by_plan ? { ...row.by_plan } : null })
    } else {
      existing.total_sims += row.total_sims
      if (row.by_plan) {
        if (!existing.by_plan) existing.by_plan = {}
        Object.entries(row.by_plan).forEach(([plan, cnt]) => {
          existing.by_plan![plan] = (existing.by_plan![plan] ?? 0) + cnt
        })
      }
    }
  })
  return Array.from(map.values())
}

export async function SimSnapshotPanel() {
  const supabase = getSupabase()

  // Latest uploaded month
  const { data: monthsData } = await supabase
    .from('sim_customer_summary')
    .select('upload_month')
    .order('upload_month', { ascending: false })
    .limit(1)

  const latestMonth = monthsData?.[0]?.upload_month
  if (!latestMonth) return null

  const { data: rawRows } = await supabase
    .from('sim_customer_summary')
    .select('customer_name_raw, customer_id, match_status, total_sims, by_plan, customers(name)')
    .eq('upload_month', latestMonth)

  if (!rawRows || rawRows.length === 0) return null

  const rows    = consolidate(rawRows as unknown as RawRow[])
  const matched = rows.filter(r => r.match_status === 'matched')

  // ── Plan totals ──────────────────────────────────────────────────────────
  const planMap: Record<string, number> = {}
  matched.forEach(r => {
    if (!r.by_plan) return
    Object.entries(r.by_plan).forEach(([plan, cnt]) => {
      planMap[plan] = (planMap[plan] ?? 0) + cnt
    })
  })
  const plans: PlanEntry[] = Object.entries(planMap)
    .sort((a, b) => b[1] - a[1])
    .map(([plan, total]) => ({ plan, total }))

  const totalSims = plans.reduce((s, p) => s + p.total, 0)

  // ── Customer list ────────────────────────────────────────────────────────
  const customers: CustomerEntry[] = matched
    .sort((a, b) => b.total_sims - a.total_sims)
    .map(r => ({
      id:        r.customer_id,
      name:      getCustomerName(r),
      totalSims: r.total_sims,
      byPlan:    r.by_plan ?? {},
    }))

  return (
    <SimSnapshotClient
      plans={plans}
      customers={customers}
      totalSims={totalSims}
      month={latestMonth}
    />
  )
}
