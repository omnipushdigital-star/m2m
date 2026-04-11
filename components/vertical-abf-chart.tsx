'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

const COLORS: Record<string, string> = {
  CM: '#f57c00',
  EB: '#1a237e',
  CFA: '#2e7d32',
  Other: '#9e9e9e',
}

export function VerticalAbfChart({
  data,
}: {
  data: { vertical: string; abf: number; revenue: number }[]
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v.toFixed(0)}Cr`} />
          <YAxis type="category" dataKey="vertical" tick={{ fontSize: 12, fontWeight: 600 }} />
          <Tooltip
            formatter={(v: ValueType | undefined, name: NameType | undefined) => [`₹${Number(v ?? 0).toFixed(2)} Cr`, name === 'abf' ? 'ABF Outstanding' : 'Revenue Collected']}
          />
          <Bar dataKey="abf" name="abf" radius={[0,3,3,0]}>
            {data.map((d) => (
              <Cell key={d.vertical} fill={COLORS[d.vertical] ?? COLORS.Other} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
