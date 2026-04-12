'use client'

import { Download } from 'lucide-react'
import { downloadExcel } from '@/lib/export-excel'

type LeadRow = {
  opp_id: number | null
  product_name: string | null
  product_vertical: string | null
  po_date: string | null
  po_value: number | null
  contract_period: number | null
  quantity: number | null
  commissioned_qty: number | null
  annualized_value: number | null
  abf_generated_total: number | null
  commissioned_status: string | null
  billing_cycle: string | null
}

export function ActiveLeadsExport({ leads, customerName }: { leads: LeadRow[]; customerName: string }) {
  function handleExport() {
    downloadExcel(leads.map(l => {
      const frac = (l.quantity && l.commissioned_qty) ? Math.min(l.commissioned_qty / l.quantity, 1) : 1
      const mAbf = l.annualized_value ? parseFloat(((l.annualized_value / 12) * frac).toFixed(3)) : ''
      return {
        'Opp ID':               l.opp_id ?? '',
        'Product':              l.product_name ?? '',
        'Vertical':             l.product_vertical ?? '',
        'PO Date':              l.po_date ?? '',
        'PO Value (₹ Cr)':      l.po_value ?? '',
        'Contract (Y)':         l.contract_period ?? '',
        'Qty Committed':        l.quantity ?? '',
        'Qty Commissioned':     l.commissioned_qty ?? '',
        'Monthly ABF (₹ Cr)':   mAbf,
        'ABF Generated (₹ Cr)': l.abf_generated_total ?? '',
        'Status':               l.commissioned_status ?? '',
        'Billing Cycle':        l.billing_cycle ?? '',
      }
    }), `ActiveLeads_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90"
      style={{ background: '#2e7d32' }}
    >
      <Download className="w-3.5 h-3.5" />
      Export Excel
    </button>
  )
}
