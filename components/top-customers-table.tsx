import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

const RANK_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#ffd700', text: '#7a5500' },
  2: { bg: '#c0c0c0', text: '#444444' },
  3: { bg: '#cd7f32', text: '#ffffff' },
}

const VERTICAL_COLORS: Record<string, { bg: string; color: string }> = {
  CM:  { bg: '#1a237e', color: 'white' },
  EB:  { bg: '#f57c00', color: 'white' },
  CFA: { bg: '#2e7d32', color: 'white' },
}

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_COLORS[rank] ?? { bg: '#64748b', text: 'white' }
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
      style={{ background: style.bg, color: style.text }}
    >
      {rank}
    </span>
  )
}

function VerticalBadge({ vertical }: { vertical: string }) {
  const style = VERTICAL_COLORS[vertical] ?? { bg: '#64748b', color: 'white' }
  return (
    <span
      className="inline-block text-xs font-semibold px-2 py-0.5 rounded"
      style={{ background: style.bg, color: style.color }}
    >
      {vertical}
    </span>
  )
}

export async function TopCustomersTable() {
  const supabase = getSupabase()

  const [
    { data: simRecords },
    { data: abfRecords },
  ] = await Promise.all([
    supabase
      .from('monthly_records')
      .select('customer_id, active_sims, month')
      .order('month', { ascending: false }),
    supabase
      .from('monthly_records')
      .select('customer_id, abf_amount')
      .gte('month', '2025-04')
      .lte('month', '2026-03'),
  ])

  // Latest active_sims per customer
  const latestPerCustomer = new Map<string, number>()
  for (const r of simRecords ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) {
      latestPerCustomer.set(r.customer_id, r.active_sims ?? 0)
    }
  }

  // FY 2025-26 ABF per customer
  const abfPerCustomer = new Map<string, number>()
  for (const r of abfRecords ?? []) {
    abfPerCustomer.set(
      r.customer_id,
      (abfPerCustomer.get(r.customer_id) ?? 0) + (r.abf_amount ?? 0),
    )
  }

  const topEntries = Array.from(latestPerCustomer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const topIds = topEntries.map(([id]) => id)
  const maxSims = topEntries[0]?.[1] ?? 1

  if (topIds.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, product_vertical')
    .in('id', topIds)

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? [])

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide">#</th>
            <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Customer</th>
            <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Vertical</th>
            <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Active SIMs</th>
            <th className="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Total ABF (₹ Cr) FY 25-26</th>
          </tr>
        </thead>
        <tbody>
          {topEntries.map(([id, sims], i) => {
            const rank = i + 1
            const c = customerMap.get(id)
            const abf = abfPerCustomer.get(id) ?? 0
            const barPct = maxSims > 0 ? (sims / maxSims) * 100 : 0

            return (
              <tr key={id} className="border-t hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5">
                  <RankBadge rank={rank} />
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/customers/${id}`}
                    className="font-medium text-blue-700 hover:underline hover:text-blue-900"
                  >
                    {c?.name ?? id}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  {c?.product_vertical
                    ? <VerticalBadge vertical={c.product_vertical} />
                    : <span className="text-slate-400">—</span>
                  }
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="font-semibold text-slate-800">
                    {sims.toLocaleString('en-IN')}
                  </div>
                  {/* Mini SIM count progress bar */}
                  <div className="mt-1 h-1 rounded-full bg-slate-200 ml-auto w-20 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, background: '#1565c0' }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-medium" style={{ color: '#f57c00' }}>
                  {abf.toFixed(3)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
