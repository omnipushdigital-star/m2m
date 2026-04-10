'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { buildReportWorkbook, downloadWorkbook } from '@/lib/export'
import type { ReportRow } from '@/lib/export'

export function MonthlyReportTable({
  rows,
  month,
  allMonths,
}: {
  rows: ReportRow[]
  month: string
  allMonths: string[]
}) {
  const router = useRouter()

  const totals = {
    activations: rows.reduce((s, r) => s + r.activations, 0),
    deactivations: rows.reduce((s, r) => s + r.deactivations, 0),
    plan_changes: rows.reduce((s, r) => s + r.plan_changes, 0),
    active_sims: rows.reduce((s, r) => s + r.active_sims, 0),
    abf_amount: rows.reduce((s, r) => s + r.abf_amount, 0),
    revenue_realised: rows.reduce((s, r) => s + r.revenue_realised, 0),
    commissioning_pending: rows.reduce((s, r) => s + r.commissioning_pending, 0),
  }

  function handleExport() {
    const wb = buildReportWorkbook(rows, month)
    downloadWorkbook(wb, `M2M-Report-${month}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={month}
          onChange={(e) => router.push(`/reports?month=${e.target.value}`)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <Button onClick={handleExport} disabled={rows.length === 0} variant="outline">
          Export to Excel
        </Button>
        <span className="text-sm text-slate-500">{rows.length} customer(s) with records</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No records found for {month}.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">NAM</th>
                <th className="px-3 py-2 text-right font-medium">Activations</th>
                <th className="px-3 py-2 text-right font-medium">Deactivations</th>
                <th className="px-3 py-2 text-right font-medium">Plan Changes</th>
                <th className="px-3 py-2 text-right font-medium">Active SIMs</th>
                <th className="px-3 py-2 text-right font-medium">ABF (₹ Cr)</th>
                <th className="px-3 py-2 text-right font-medium">Revenue (₹ Cr)</th>
                <th className="px-3 py-2 text-right font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{r.customer.name}</td>
                  <td className="px-3 py-2 text-slate-600">{r.customer.nam_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-green-700">{r.activations}</td>
                  <td className="px-3 py-2 text-right text-red-600">{r.deactivations}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{r.plan_changes}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.active_sims.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.abf_amount.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{r.revenue_realised.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{r.commissioning_pending.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 bg-slate-100">
              <tr>
                <td className="px-3 py-2 font-bold" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right font-bold text-green-700">{totals.activations}</td>
                <td className="px-3 py-2 text-right font-bold text-red-600">{totals.deactivations}</td>
                <td className="px-3 py-2 text-right font-bold text-blue-600">{totals.plan_changes}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.active_sims.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.abf_amount.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.revenue_realised.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.commissioning_pending.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
