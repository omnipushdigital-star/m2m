import * as XLSX from 'xlsx'
import type { MonthlyRecord, Customer } from './types'

export type ReportRow = MonthlyRecord & { customer: Pick<Customer, 'name' | 'nam_name' | 'product_vertical'> }

export function buildReportWorkbook(rows: ReportRow[], month: string): XLSX.WorkBook {
  const data = rows.map((r) => ({
    'Customer': r.customer.name,
    'NAM': r.customer.nam_name ?? '',
    'Vertical': r.customer.product_vertical ?? '',
    'Activations': r.activations,
    'Deactivations': r.deactivations,
    'Plan Changes': r.plan_changes,
    'Active SIMs': r.active_sims,
    'ABF (₹ Cr)': r.abf_amount,
    'Revenue (₹ Cr)': r.revenue_realised,
    'Commissioning Pending': r.commissioning_pending,
    'Notes': r.notes ?? '',
  }))

  data.push({
    'Customer': 'TOTAL',
    'NAM': '',
    'Vertical': '',
    'Activations': rows.reduce((s, r) => s + r.activations, 0),
    'Deactivations': rows.reduce((s, r) => s + r.deactivations, 0),
    'Plan Changes': rows.reduce((s, r) => s + r.plan_changes, 0),
    'Active SIMs': rows.reduce((s, r) => s + r.active_sims, 0),
    'ABF (₹ Cr)': parseFloat(rows.reduce((s, r) => s + r.abf_amount, 0).toFixed(3)),
    'Revenue (₹ Cr)': parseFloat(rows.reduce((s, r) => s + r.revenue_realised, 0).toFixed(3)),
    'Commissioning Pending': rows.reduce((s, r) => s + r.commissioning_pending, 0),
    'Notes': '',
  })

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 40 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
    { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Report ${month}`)
  return wb
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename)
}
