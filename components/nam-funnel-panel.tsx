import { getSupabase } from '@/lib/supabase'

type NamRow = {
  nam: string
  s1Count: number
  s1Value: number
  s4Count: number
  s4Value: number
}

function WinRateBadge({ rate }: { rate: number }) {
  let bg = '#ef4444'
  let color = 'white'
  if (rate >= 50) { bg = '#2e7d32'; color = 'white' }
  else if (rate >= 30) { bg = '#f57c00'; color = 'white' }

  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {rate.toFixed(0)}%
    </span>
  )
}

export async function NamFunnelPanel() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('funnel_opportunities')
    .select('nam_name, funnel_stage, base_tariff, po_value')

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

  const totalS1 = rows.reduce((s, r) => s + r.s1Count, 0)
  const totalS4 = rows.reduce((s, r) => s + r.s4Count, 0)
  const grandTotal = totalS1 + totalS4
  const totalWinRate = grandTotal > 0 ? (totalS4 / grandTotal) * 100 : 0

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide">
            <th className="px-3 py-2 text-left font-semibold bg-slate-50" rowSpan={2}>NAM</th>
            <th
              className="px-3 py-1.5 text-center font-semibold text-xs"
              style={{ background: '#fff3e0', color: '#e65100' }}
              colSpan={2}
            >
              Stage 1 — Pipeline
            </th>
            <th
              className="px-3 py-1.5 text-center font-semibold text-xs"
              style={{ background: '#e8f5e9', color: '#1b5e20' }}
              colSpan={2}
            >
              Stage 4 — PO Closed
            </th>
            <th className="px-3 py-1.5 text-center font-semibold bg-slate-50 text-xs">
              Conversion
            </th>
          </tr>
          <tr className="text-xs uppercase tracking-wide">
            <th className="px-3 py-1.5 text-center font-medium" style={{ background: '#fff3e0' }}>Opps</th>
            <th className="px-3 py-1.5 text-right font-medium" style={{ background: '#fff3e0' }}>Pipeline (₹ Cr)</th>
            <th className="px-3 py-1.5 text-center font-medium" style={{ background: '#e8f5e9' }}>Opps</th>
            <th className="px-3 py-1.5 text-right font-medium" style={{ background: '#e8f5e9' }}>PO Value (₹ Cr)</th>
            <th className="px-3 py-1.5 text-center font-medium bg-slate-50">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const total = r.s1Count + r.s4Count
            const winRate = total > 0 ? (r.s4Count / total) * 100 : 0
            const pipelineFill = total > 0 ? (r.s1Count / total) * 100 : 0

            return (
              <tr key={r.nam} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-700">{r.nam}</div>
                  {/* Pipeline fill bar */}
                  <div className="mt-1 h-1 rounded-full bg-slate-200 w-20 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pipelineFill}%`,
                        background: '#f57c00',
                      }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{r.s1Count}</td>
                <td className="px-3 py-2 text-right font-medium" style={{ color: '#f57c00' }}>
                  {r.s1Value.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center font-medium">{r.s4Count}</td>
                <td className="px-3 py-2 text-right font-bold" style={{ color: '#2e7d32' }}>
                  {r.s4Value.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center">
                  <WinRateBadge rate={winRate} />
                </td>
              </tr>
            )
          })}
          <tr className="border-t font-bold bg-slate-100">
            <td className="px-3 py-2">TOTAL</td>
            <td className="px-3 py-2 text-center">{totalS1}</td>
            <td className="px-3 py-2 text-right" style={{ color: '#f57c00' }}>
              {rows.reduce((s, r) => s + r.s1Value, 0).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-center">{totalS4}</td>
            <td className="px-3 py-2 text-right" style={{ color: '#2e7d32' }}>
              {rows.reduce((s, r) => s + r.s4Value, 0).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-center">
              <WinRateBadge rate={totalWinRate} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
