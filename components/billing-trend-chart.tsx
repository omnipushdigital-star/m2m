'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

export function BillingTrendChart({
  data,
}: {
  data: { month: string; abf: number; revenue: number }[]
}) {
  function fmtTooltip(v: ValueType | undefined, name: NameType | undefined) {
    const label = name === 'abf' ? 'ABF Outstanding' : 'Revenue Collected'
    return [`₹${Number(v ?? 0).toFixed(2)} Cr`, label]
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v.toFixed(1)}Cr`} />
          <Tooltip formatter={fmtTooltip} />
          <Legend formatter={(v) => v === 'abf' ? 'ABF Outstanding' : 'Revenue Collected'} />
          <Bar dataKey="abf"     name="abf"     fill="#f57c00" radius={[3,3,0,0]} />
          <Bar dataKey="revenue" name="revenue" fill="#2e7d32" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
