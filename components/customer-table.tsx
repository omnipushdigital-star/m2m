'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import { downloadExcel } from '@/lib/export-excel'
import type { Customer, CustomerPlan } from '@/lib/types'

type CustomerRow = Customer & { customer_plans: CustomerPlan[] }

export function CustomerTable({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.nam_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function handleExport() {
    downloadExcel(filtered.map(c => ({
      'Customer Name':    c.name,
      'City':             c.city ?? '',
      'NAM':              c.nam_name ?? '',
      'Vertical':         c.product_vertical ?? '',
      'Plans':            c.customer_plans.length,
      'Committed Qty':    c.quantity ?? '',
      'Commissioned Qty': c.commissioned_qty ?? '',
      'Billing Cycle':    c.billing_cycle ?? '',
      'PO Date':          c.po_date ?? '',
      'Contract (Y)':     c.contract_period ?? '',
      'Vendor':           c.vendor_name ?? '',
    })), `Customers_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by customer name or NAM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{ background: '#2e7d32' }}
        >
          <Download className="w-3.5 h-3.5" />
          Export Excel ({filtered.length})
        </button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Customer Name</th>
              <th className="px-4 py-2 text-left font-medium">City</th>
              <th className="px-4 py-2 text-left font-medium">NAM</th>
              <th className="px-4 py-2 text-left font-medium">Plans</th>
              <th className="px-4 py-2 text-right font-medium">Committed Qty</th>
              <th className="px-4 py-2 text-right font-medium">Vertical</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{c.city ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{c.nam_name ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className="text-slate-600">{c.customer_plans.length} plan(s)</span>
                </td>
                <td className="px-4 py-2 text-right">{c.quantity?.toLocaleString() ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  {c.product_vertical ? (
                    <Badge variant="outline">{c.product_vertical}</Badge>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{filtered.length} of {customers.length} customers</p>
    </div>
  )
}
