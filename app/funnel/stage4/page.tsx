import { getSupabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Stage 4 PO Closed' }

const categoryColors: Record<string, string> = {
  GOVT:    '#1a237e',
  PRIVATE: '#f57c00',
  PSU:     '#2e7d32',
}

export default async function Stage4Page() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('funnel_opportunities')
    .select('*')
    .eq('funnel_stage', 4)
    .order('po_value', { ascending: false })

  if (error || !data) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-slate-400">
        No Stage 4 data found. Run the Supabase SQL migration then: <code>node scripts/seed-funnel.js</code>
      </div>
    )
  }

  const totalPO     = data.reduce((s, r) => s + (r.po_value ?? 0), 0)
  const totalQty    = data.reduce((s, r) => s + (r.quantity ?? 0), 0)
  const privateCount = data.filter(r => r.main_category === 'PRIVATE').length
  const govtCount   = data.filter(r => r.main_category === 'GOVT' || r.main_category === 'PSU').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-block w-1.5 h-6 rounded" style={{ background: '#2e7d32' }} />
          Stage 4 — PO Received / Closed
        </h1>
        <p className="text-sm text-slate-500 mt-1">Orders confirmed with PO — March 2026</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Deals', value: String(data.length), color: '#1a237e' },
          { label: 'Total PO Value (₹ Cr)', value: totalPO.toFixed(2), color: '#2e7d32' },
          { label: 'Total Quantity', value: Number(totalQty).toLocaleString('en-IN'), color: '#f57c00' },
          { label: 'Private / Govt', value: `${privateCount} / ${govtCount}`, color: '#283593' },
        ].map(c => (
          <div key={c.label} className="rounded-lg border-0 shadow-sm bg-white p-4" style={{ borderTop: `4px solid ${c.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto bg-white">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Customer</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">NAM</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Category</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Product</th>
              <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wide">Qty</th>
              <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wide">PO Value (₹ Cr)</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">PO Date</th>
              <th className="px-3 py-2.5 text-center font-semibold text-xs uppercase tracking-wide">Contract (Y)</th>
              <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wide">Comm. Qty</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Status</th>
              <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Business Type</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-3 py-2 font-semibold text-slate-800 max-w-xs truncate" title={r.customer_name}>
                  {r.customer_name}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.nam_name ?? '—'}</td>
                <td className="px-3 py-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                    style={{ background: categoryColors[r.main_category ?? ''] ?? '#9e9e9e' }}
                  >
                    {r.main_category ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate" title={r.product_name ?? ''}>
                  {r.product_name ?? '—'}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {r.quantity ? Number(r.quantity).toLocaleString('en-IN') : '—'}
                </td>
                <td className="px-3 py-2 text-right font-bold" style={{ color: '#2e7d32' }}>
                  {r.po_value != null ? Number(r.po_value).toFixed(2) : '—'}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.po_date ?? '—'}</td>
                <td className="px-3 py-2 text-center">{r.contract_period ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {r.commissioned_qty ? Number(r.commissioned_qty).toLocaleString('en-IN') : '—'}
                </td>
                <td className="px-3 py-2">
                  {r.commissioned_status ? (
                    <Badge
                      className="text-xs"
                      style={{
                        background: r.commissioned_status === 'Full' ? '#e8f5e9' : '#fff3e0',
                        color: r.commissioned_status === 'Full' ? '#2e7d32' : '#e65100',
                        border: 'none',
                      }}
                    >
                      {r.commissioned_status}
                    </Badge>
                  ) : '—'}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="text-xs">{r.business_type ?? '—'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
