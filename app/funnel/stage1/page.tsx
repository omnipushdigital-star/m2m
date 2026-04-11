import { getSupabase } from '@/lib/supabase'
import { FunnelTable } from '@/components/funnel-table'

export const metadata = { title: 'Stage 1 Pipeline' }

export default async function Stage1Page() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('funnel_opportunities')
    .select('*')
    .eq('funnel_stage', 1)
    .order('base_tariff', { ascending: false })

  if (error || !data?.length) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-slate-400">
        No Stage 1 data found. Run: <code>node scripts/seed-funnel.js</code>
      </div>
    )
  }

  const totalPipeline  = data.reduce((s, r) => s + (r.base_tariff ?? 0), 0)
  const totalCommitment = data.reduce((s, r) => s + (r.commitment ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-block w-1.5 h-6 rounded" style={{ background: '#f57c00' }} />
          Stage 1 — Active Pipeline
        </h1>
        <p className="text-sm text-slate-500 mt-1">Opportunities in negotiation / proposal stage — March 2026</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Opportunities',  value: String(data.length),           color: '#1a237e' },
          { label: 'Pipeline Value (₹ Cr)', value: totalPipeline.toFixed(2),      color: '#f57c00' },
          { label: 'Total Commitment',      value: String(totalCommitment),        color: '#2e7d32' },
        ].map(c => (
          <div key={c.label} className="rounded-lg shadow-sm bg-white p-4" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <FunnelTable data={data} stage={1} />
    </div>
  )
}
