'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

type NamDataPoint = { nam: string; abf: number; revenue: number }

export function NamAbfChart({ data }: { data: NamDataPoint[] }) {
  function fmtTooltip(v: ValueType | undefined, name: NameType | undefined) {
    const label = name === 'abf' ? 'ABF' : 'Revenue'
    return [`₹${Number(v ?? 0).toFixed(3)} Cr`, label]
  }

  function fmtLegend(value: string) {
    return value === 'abf' ? 'ABF Outstanding' : 'Revenue Collected'
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 80, bottom: 8, left: 8 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <YAxis
            dataKey="nam"
            type="category"
            width={100}
            tick={{ fontSize: 11 }}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `₹${v.toFixed(1)}Cr`}
          />
          <Tooltip formatter={fmtTooltip} />
          <Legend formatter={fmtLegend} />
          <Bar
            dataKey="abf"
            name="abf"
            fill="#f57c00"
            radius={[0, 3, 3, 0]}
            label={{ position: 'right', formatter: (v: unknown) => typeof v === 'number' ? v.toFixed(2) : '', fontSize: 10 }}
          />
          <Bar
            dataKey="revenue"
            name="revenue"
            fill="#2e7d32"
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
