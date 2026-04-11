import { getSupabase } from '@/lib/supabase'

type NamRow = {
  nam: string
  s1Count: number
  s1Value: number
  s4Count: number
  s4Value: number
}

export async function NamFunnelPanel() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('funnel_opportunities')
    .select('nam_name, funnel_stage, base_tariff, po_value')

  // Graceful: table may not exist yet
  if (error || !data?.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-slate-400">
        Sales funnel data not loaded yet.<br />
        Run the Supabase SQL migration and seed-funnel.js to enable this panel.
      </div>
    )
  }

  const namMap = new Map<string, NamRow>()
  for (const r of data) {
    const nam = r.nam_name || 'Unknown'
    if (!namMap.has(nam)) namMap.set(nam, { nam, s1Count: 0, s1Value: 0, s4Count: 0, s4Value: 0 })
    const row = namMap.get(nam)!
    if (r.funnel_stage === 1) {
      row.s1Count++
      row.s1Value += r.base_tariff ?? 0
    } else if (r.funnel_stage === 4) {
      row.s4Count++
      row.s4Value += r.po_value ?? 0
    }
  }

  const rows = Array.from(namMap.values()).sort((a, b) => b.s4Value - a.s4Value)

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide">
            <th className="px-3 py-2 text-left font-semibold">NAM</th>
            <th className="px-3 py-2 text-center font-semibold" style={{ background: '#fff3e0' }}>Stage 1 Opps</th>
            <th className="px-3 py-2 text-right font-semibold" style={{ background: '#fff3e0' }}>Pipeline (₹ Cr)</th>
            <th className="px-3 py-2 text-center font-semibold" style={{ background: '#e8f5e9' }}>Stage 4 Opps</th>
            <th className="px-3 py-2 text-right font-semibold" style={{ background: '#e8f5e9' }}>PO Value (₹ Cr)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.nam} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-3 py-2 font-semibold text-slate-700">{r.nam}</td>
              <td className="px-3 py-2 text-center">{r.s1Count}</td>
              <td className="px-3 py-2 text-right font-medium" style={{ color: '#f57c00' }}>
                {r.s1Value.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-center font-medium">{r.s4Count}</td>
              <td className="px-3 py-2 text-right font-bold" style={{ color: '#2e7d32' }}>
                {r.s4Value.toFixed(2)}
              </td>
            </tr>
          ))}
          <tr className="border-t font-bold bg-slate-100">
            <td className="px-3 py-2">TOTAL</td>
            <td className="px-3 py-2 text-center">{rows.reduce((s, r) => s + r.s1Count, 0)}</td>
            <td className="px-3 py-2 text-right" style={{ color: '#f57c00' }}>
              {rows.reduce((s, r) => s + r.s1Value, 0).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-center">{rows.reduce((s, r) => s + r.s4Count, 0)}</td>
            <td className="px-3 py-2 text-right" style={{ color: '#2e7d32' }}>
              {rows.reduce((s, r) => s + r.s4Value, 0).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
