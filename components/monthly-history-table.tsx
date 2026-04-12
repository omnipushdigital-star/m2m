'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MonthlyEntryForm } from './monthly-entry-form'
import { deleteMonthlyRecord } from '@/actions/monthly-records'
import type { MonthlyRecord } from '@/lib/types'

export function MonthlyHistoryTable({
  records,
  customerId,
  isAdmin = false,
}: {
  records: MonthlyRecord[]
  customerId: string
  isAdmin?: boolean
}) {
  const [editing, setEditing] = useState<MonthlyRecord | null>(null)

  if (records.length === 0) {
    return <p className="text-sm text-slate-500">No monthly records yet. Click &quot;+ Add Monthly Entry&quot; to get started.</p>
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Month</th>
              <th className="px-3 py-2 text-right font-medium">Activations</th>
              <th className="px-3 py-2 text-right font-medium">Deactivations</th>
              <th className="px-3 py-2 text-right font-medium">Plan Changes</th>
              <th className="px-3 py-2 text-right font-medium">Active SIMs</th>
              <th className="px-3 py-2 text-right font-medium">ABF (₹ Cr)</th>
              <th className="px-3 py-2 text-right font-medium">Revenue (₹ Cr)</th>
              <th className="px-3 py-2 text-right font-medium">Pending</th>
              <th className="px-3 py-2 text-left font-medium">Notes</th>
              {isAdmin && <th className="px-3 py-2 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-medium">{r.month}</td>
                <td className="px-3 py-2 text-right text-green-700">{r.activations}</td>
                <td className="px-3 py-2 text-right text-red-600">{r.deactivations}</td>
                <td className="px-3 py-2 text-right text-blue-600">{r.plan_changes}</td>
                <td className="px-3 py-2 text-right font-medium">{r.active_sims.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{r.abf_amount.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{r.revenue_realised.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{r.commissioning_pending.toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{r.notes ?? '—'}</td>
                {isAdmin && (
                  <td className="px-3 py-2 text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (confirm(`Delete record for ${r.month}?`)) deleteMonthlyRecord(r.id, customerId)
                    }}>Del</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Monthly Entry — {editing?.month}</DialogTitle>
          </DialogHeader>
          {editing && (
            <MonthlyEntryForm
              customerId={customerId}
              record={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
