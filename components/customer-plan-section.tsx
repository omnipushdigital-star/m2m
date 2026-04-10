'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertCustomerPlan, removeCustomerPlan } from '@/actions/customer-plans'
import type { Plan, CustomerPlan } from '@/lib/types'

export function CustomerPlanSection({
  customerId,
  customerPlans,
  allPlans,
}: {
  customerId: string
  customerPlans: (CustomerPlan & { plan: Plan })[]
  allPlans: Plan[]
}) {
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [simCount, setSimCount] = useState('')

  const assignedPlanIds = new Set(customerPlans.map((cp) => cp.plan_id))
  const availablePlans = allPlans.filter((p) => !assignedPlanIds.has(p.id))

  async function handleAssign() {
    if (!selectedPlanId || !simCount) return
    await upsertCustomerPlan(customerId, selectedPlanId, parseInt(simCount))
    setSelectedPlanId('')
    setSimCount('')
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Plan Assignments</h3>

      {customerPlans.length > 0 ? (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Plan</th>
                <th className="px-4 py-2 text-right font-medium">SIM Count</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customerPlans.map((cp) => (
                <tr key={cp.id} className="border-t">
                  <td className="px-4 py-2">{cp.plan.plan_name}</td>
                  <td className="px-4 py-2 text-right font-medium">{cp.sim_count.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeCustomerPlan(cp.id, customerId)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-slate-50">
                <td className="px-4 py-2 font-medium">Total</td>
                <td className="px-4 py-2 text-right font-bold">
                  {customerPlans.reduce((s, cp) => s + cp.sim_count, 0).toLocaleString()}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No plans assigned yet.</p>
      )}

      {availablePlans.length > 0 && (
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <Label>Assign Plan</Label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— Select Plan —</option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>{p.plan_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>SIM Count</Label>
            <Input
              type="number"
              className="w-32"
              value={simCount}
              onChange={(e) => setSimCount(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button onClick={handleAssign} disabled={!selectedPlanId || !simCount}>Assign</Button>
        </div>
      )}
    </div>
  )
}
