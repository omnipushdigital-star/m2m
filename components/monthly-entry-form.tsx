'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMonthlyRecord, updateMonthlyRecord } from '@/actions/monthly-records'
import type { MonthlyRecord } from '@/lib/types'

export function MonthlyEntryForm({
  customerId,
  record,
  existingMonths = [],
  onDone,
}: {
  customerId: string
  record?: MonthlyRecord
  existingMonths?: string[]
  onDone?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        if (record) {
          await updateMonthlyRecord(record.id, customerId, formData)
        } else {
          await createMonthlyRecord(customerId, formData)
        }
        onDone?.()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to save entry.')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="month">Month *</Label>
        {record ? (
          <Input id="month" name="month" type="month" defaultValue={record.month} readOnly className="bg-slate-50" />
        ) : (
          <select
            id="month"
            name="month"
            required
            defaultValue={(() => {
              const d = new Date()
              for (let i = 0; i < 24; i++) {
                const dt = new Date(d.getFullYear(), d.getMonth() - i, 1)
                const val = dt.toISOString().slice(0, 7)
                if (!existingMonths.includes(val)) return val
              }
              return ''
            })()}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {Array.from({ length: 24 }, (_, i) => {
              const d = new Date()
              d.setMonth(d.getMonth() - i)
              const val = d.toISOString().slice(0, 7)
              return (
                <option key={val} value={val} disabled={existingMonths.includes(val)}>
                  {val}{existingMonths.includes(val) ? ' (already entered)' : ''}
                </option>
              )
            })}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="activations">Activations</Label>
          <Input id="activations" name="activations" type="number" defaultValue={record?.activations ?? 0} min={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="deactivations">Deactivations</Label>
          <Input id="deactivations" name="deactivations" type="number" defaultValue={record?.deactivations ?? 0} min={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="plan_changes">Plan Changes</Label>
          <Input id="plan_changes" name="plan_changes" type="number" defaultValue={record?.plan_changes ?? 0} min={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="active_sims">Active SIMs</Label>
          <Input id="active_sims" name="active_sims" type="number" defaultValue={record?.active_sims ?? 0} min={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="abf_amount">ABF Amount (₹) <span className="text-slate-400 font-normal text-xs">— enter in Rupees</span></Label>
          <Input id="abf_amount" name="abf_amount" type="number" step="1"
            defaultValue={record ? Math.round((record.abf_amount ?? 0) * 1e7) : 0} min={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="revenue_realised">Revenue Realised (₹) <span className="text-slate-400 font-normal text-xs">— enter in Rupees</span></Label>
          <Input id="revenue_realised" name="revenue_realised" type="number" step="1"
            defaultValue={record ? Math.round((record.revenue_realised ?? 0) * 1e7) : 0} min={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="commissioning_pending">Commissioning Pending</Label>
          <Input id="commissioning_pending" name="commissioning_pending" type="number" defaultValue={record?.commissioning_pending ?? 0} min={0} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={record?.notes ?? ''}
          rows={2}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : record ? 'Update Entry' : 'Add Entry'}
      </Button>
    </form>
  )
}
