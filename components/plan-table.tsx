'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PlanForm } from './plan-form'
import { deletePlan } from '@/actions/plans'
import type { Plan } from '@/lib/types'

export function PlanTable({ plans, isAdmin = false }: { plans: Plan[]; isAdmin?: boolean }) {
  const [editing, setEditing] = useState<Plan | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Plans ({plans.length})</h2>
        {isAdmin && <Button size="sm" onClick={() => setAdding(true)}>+ Add Plan</Button>}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Plan Name</th>
              <th className="px-4 py-2 text-left font-medium">Data</th>
              <th className="px-4 py-2 text-left font-medium">SMS</th>
              {isAdmin && <th className="px-4 py-2 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-t">
                <td className="px-4 py-2 font-medium">{plan.plan_name}</td>
                <td className="px-4 py-2 text-slate-600">{plan.data_limit ?? <Badge variant="outline">—</Badge>}</td>
                <td className="px-4 py-2 text-slate-600">{plan.sms_limit ?? <Badge variant="outline">—</Badge>}</td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(plan)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (confirm(`Delete plan "${plan.plan_name}"?`)) {
                          await deletePlan(plan.id)
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={adding || !!editing} onOpenChange={(open) => { if (!open) { setAdding(false); setEditing(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Plan' : 'Add Plan'}</DialogTitle>
          </DialogHeader>
          <PlanForm
            plan={editing ?? undefined}
            onDone={() => { setAdding(false); setEditing(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
