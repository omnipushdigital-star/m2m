import { getSupabase } from '@/lib/supabase'
import { FunnelTable } from '@/components/funnel-table'

export const metadata = { title: 'Stage 4 PO Closed' }
export const dynamic = 'force-dynamic'

export default async function Stage4Page() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('funnel_opportunities')
    .select('*')
    .eq('funnel_stage', 4)
    .order('po_value', { ascending: false })

  if (error || !data?.length) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-slate-400">
        No Stage 4 data found. Run: <code>node scripts/update-stage4-jan26.js</code>
      </div>
    )
  }

  const totalPO      = data.reduce((s, r) => s + (r.po_value ?? 0), 0)
  const totalQty     = data.reduce((s, r) => s + (r.quantity ?? 0), 0)
  const totalCommQty = data.reduce((s, r) => s + (r.commissioned_qty ?? 0), 0)
  const totalAbfGen  = data.reduce((s, r) => s + (r.abf_generated_total ?? 0), 0)
  const totalMonthly = data.reduce((s, r) => {
    if (!r.annualized_value) return s
    const frac = (r.quantity && r.commissioned_qty) ? Math.min(r.commissioned_qty / r.quantity, 1) : 1
    return s + (r.annualized_value / 12) * frac
  }, 0)
  const privateCount = data.filter(r => r.main_category === 'PRIVATE').length
  const govtPsuCount = data.filter(r => r.main_category === 'GOVT' || r.main_category === 'PSU').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-block w-1.5 h-6 rounded" style={{ background: '#2e7d32' }} />
          Stage 4 — PO Received / Active Leads
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          All active POs with commissioned SIMs · {data.length} opportunities across all FYs
        </p>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Active POs',          value: String(data.length),                                color: '#1a237e' },
          { label: 'Total PO Value (₹ Cr)',      value: totalPO.toFixed(2),                                color: '#2e7d32' },
          { label: 'Total Qty Committed',        value: Number(totalQty).toLocaleString('en-IN'),          color: '#f57c00' },
          { label: 'Total Commissioned',         value: Number(totalCommQty).toLocaleString('en-IN'),      color: '#283593' },
        ].map(c => (
          <div key={c.label} className="rounded-lg shadow-sm bg-white p-4" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Monthly ABF (₹ Cr)',         value: totalMonthly.toFixed(3),                           color: '#0d47a1' },
          { label: 'Total ABF Generated (₹ Cr)', value: totalAbfGen.toFixed(3),                            color: '#6a1b9a' },
          { label: 'Private Customers',          value: String(privateCount),                              color: '#f57c00' },
          { label: 'Govt / PSU',                 value: String(govtPsuCount),                              color: '#1a237e' },
        ].map(c => (
          <div key={c.label} className="rounded-lg shadow-sm bg-white p-4" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <FunnelTable data={data} stage={4} />
    </div>
  )
}
