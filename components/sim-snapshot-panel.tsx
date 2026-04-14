import { getSupabase } from '@/lib/supabase'

type SimRow = {
  customer_name_raw: string
  customer_id: string | null
  match_status: string
  total_sims: number
  by_plan: Record<string, number> | null
  customers: { name: string } | null
}

// Consolidate rows that share the same customer_id
function consolidate(rows: SimRow[]): SimRow[] {
  const map = new Map<string, SimRow>()
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

  // Get the latest uploaded month
  const { data: monthsData } = await supabase
    .from('sim_customer_summary')
    .select('upload_month')
    .order('upload_month', { ascending: false })
    .limit(1)

  const latestMonth = monthsData?.[0]?.upload_month
  if (!latestMonth) return null

  // Fetch all rows for that month with customer names
  const { data: rawRows } = await supabase
    .from('sim_customer_summary')
    .select('customer_name_raw, customer_id, match_status, total_sims, by_plan, customers(name)')
    .eq('upload_month', latestMonth)

  if (!rawRows || rawRows.length === 0) return null

  // Consolidate duplicates
  const rows = consolidate(rawRows as unknown as SimRow[])
  const matched = rows.filter(r => r.match_status === 'matched')

  // ── Plan totals ─────────────────────────────────────────────────
  const planMap: Record<string, number> = {}
  matched.forEach(r => {
    if (!r.by_plan) return
    Object.entries(r.by_plan).forEach(([plan, cnt]) => {
      planMap[plan] = (planMap[plan] ?? 0) + cnt
    })
  })
  const plansSorted = Object.entries(planMap).sort((a, b) => b[1] - a[1])
  const totalSims   = plansSorted.reduce((s, [, v]) => s + v, 0)
  const maxPlanSims = plansSorted[0]?.[1] ?? 1

  // ── Top customers ────────────────────────────────────────────────
  const topCustomers = [...matched]
    .sort((a, b) => b.total_sims - a.total_sims)
    .slice(0, 10)

  function fmt(n: number) {
    return n.toLocaleString('en-IN')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded bg-[#1565c0]" />
          SIM Inventory Snapshot
        </h2>
        <span className="text-xs bg-[#1565c0]/10 text-[#1565c0] font-semibold px-3 py-1 rounded-full">
          {latestMonth} · {fmt(totalSims)} SIMs
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Plan-wise breakdown ── */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Plan-wise SIM Count</p>
            <p className="text-xs text-slate-400">{plansSorted.length} plans</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {plansSorted.map(([plan, count]) => {
              const barW = Math.round((count / maxPlanSims) * 100)
              const sharePct = totalSims > 0 ? ((count / totalSims) * 100).toFixed(1) : '0'
              return (
                <div key={plan} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{plan}</p>
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-[#1565c0]"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className="text-sm font-mono font-semibold text-slate-800">{fmt(count)}</p>
                    <p className="text-xs text-slate-400">{sharePct}%</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">TOTAL</span>
            <span className="text-sm font-mono font-bold text-slate-800">{fmt(totalSims)}</span>
          </div>
        </div>

        {/* ── Customer-wise breakdown ── */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Top 10 Customers by SIM Count</p>
            <p className="text-xs text-slate-400">{matched.length} customers</p>
          </div>
          <div className="divide-y divide-slate-50">
            {topCustomers.map((row, i) => {
              const name    = row.customers?.name ?? row.customer_name_raw
              const barW    = Math.round((row.total_sims / (topCustomers[0]?.total_sims ?? 1)) * 100)
              const sharePct = totalSims > 0 ? ((row.total_sims / totalSims) * 100).toFixed(1) : '0'
              return (
                <div key={row.customer_id ?? row.customer_name_raw} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                  <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{name}</p>
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-[#2e7d32]"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className="text-sm font-mono font-semibold text-slate-800">{fmt(row.total_sims)}</p>
                    <p className="text-xs text-slate-400">{sharePct}%</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">TOTAL (matched)</span>
            <span className="text-sm font-mono font-bold text-slate-800">{fmt(matched.reduce((s, r) => s + r.total_sims, 0))}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
