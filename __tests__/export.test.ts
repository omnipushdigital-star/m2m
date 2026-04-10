import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildReportWorkbook } from '../lib/export'
import type { ReportRow } from '../lib/export'

const mockRows: ReportRow[] = [
  {
    id: '1', customer_id: 'c1', month: '2026-04',
    activations: 100, deactivations: 10, plan_changes: 5,
    active_sims: 1000, abf_amount: 1.5, revenue_realised: 1.2,
    commissioning_pending: 50, notes: null, created_at: '',
    customer: { name: 'Customer A', nam_name: 'SUDHANSHU', product_vertical: 'CM' },
  },
  {
    id: '2', customer_id: 'c2', month: '2026-04',
    activations: 200, deactivations: 20, plan_changes: 0,
    active_sims: 2000, abf_amount: 2.5, revenue_realised: 2.0,
    commissioning_pending: 100, notes: 'Test note', created_at: '',
    customer: { name: 'Customer B', nam_name: 'MAYA PAREEK', product_vertical: 'EB' },
  },
]

describe('buildReportWorkbook', () => {
  it('creates a workbook with correct sheet name', () => {
    const wb = buildReportWorkbook(mockRows, '2026-04')
    expect(wb.SheetNames).toEqual(['Report 2026-04'])
  })

  it('has correct number of rows including totals row', () => {
    const wb = buildReportWorkbook(mockRows, '2026-04')
    const ws = wb.Sheets['Report 2026-04']
    const data = XLSX.utils.sheet_to_json(ws)
    expect(data).toHaveLength(3)
  })

  it('calculates totals correctly', () => {
    const wb = buildReportWorkbook(mockRows, '2026-04')
    const ws = wb.Sheets['Report 2026-04']
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    const totals = data[data.length - 1]
    expect(totals['Customer']).toBe('TOTAL')
    expect(totals['Activations']).toBe(300)
    expect(totals['Active SIMs']).toBe(3000)
    expect(totals['ABF (₹ Cr)']).toBe(4.0)
  })

  it('includes all customer fields', () => {
    const wb = buildReportWorkbook(mockRows, '2026-04')
    const ws = wb.Sheets['Report 2026-04']
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    expect(data[0]['Customer']).toBe('Customer A')
    expect(data[0]['NAM']).toBe('SUDHANSHU')
    expect(data[1]['Notes']).toBe('Test note')
  })
})
