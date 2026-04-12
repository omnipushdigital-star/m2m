'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

type DataPoint = { month: string; abf: number; revenue: number }

export function BillingTrendChart({ data }: { data: DataPoint[] }) {
  const enriched = data.map(d => ({
    ...d,
    efficiency: d.abf > 0 ? parseFloat(((d.revenue / d.abf) * 100).toFixed(1)) : 0,
  }))

  function fmtTooltip(v: ValueType | undefined, name: NameType | undefined) {
    if (name === 'efficiency') {
      return [`${Number(v ?? 0).toFixed(1)}%`, 'Collection Efficiency %']
    }
    const label = name === 'abf' ? 'ABF Outstanding' : 'Revenue Collected'
    return [`₹${Number(v ?? 0).toFixed(2)} Cr`, label]
  }

  function fmtLegend(value: string) {
    if (value === 'abf') return 'ABF Outstanding'
    if (value === 'revenue') return 'Revenue Collected'
    if (value === 'efficiency') return 'Collection Efficiency %'
    return value
  }

  return (
    <div className="h-56 md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={enriched} margin={{ top: 8, right: 40, bottom: 8, left: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `₹${v.toFixed(1)}Cr`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            domain={[0, 120]}
          />
          <Tooltip formatter={fmtTooltip} />
          <Legend formatter={fmtLegend} />
          <Bar yAxisId="left" dataKey="abf"      name="abf"        fill="#f57c00" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="left" dataKey="revenue"  name="revenue"    fill="#2e7d32" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="right"
            dataKey="efficiency"
            name="efficiency"
            stroke="#1565c0"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
