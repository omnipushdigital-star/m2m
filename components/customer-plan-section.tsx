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
  isAdmin = false,
  dumpByPlan,
  dumpMonth,
}: {
  customerId:   string
  customerPlans: (CustomerPlan & { plan: Plan })[]
  allPlans:     Plan[]
  isAdmin?:     boolean
  dumpByPlan?:  Record<string, number>
  dumpMonth?:   string
}) {
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [simCount, setSimCount] = useState('')

  const assignedPlanIds = new Set(customerPlans.map((cp) => cp.plan_id))
  const availablePlans  = allPlans.filter((p) => !assignedPlanIds.has(p.id))

  async function handleAssign() {
    if (!selectedPlanId || !simCount) return
    await upsertCustomerPlan(customerId, selectedPlanId, parseInt(simCount))
    setSelectedPlanId('')
    setSimCount('')
  }

  const hasDump        = !!dumpByPlan && Object.keys(dumpByPlan).length > 0
  const billingTotal   = customerPlans.reduce((s, cp) => s + cp.sim_count, 0)
  const dumpTotal      = hasDump ? Object.values(dumpByPlan!).reduce((s, v) => s + v, 0) : null

  // All plan names: union of assigned plans + dump plans
  const dumpPlanNames  = hasDump ? Object.keys(dumpByPlan!) : []
  const assignedNames  = new Set(customerPlans.map(cp => cp.plan.plan_name))
  const dumpOnlyPlans  = dumpPlanNames.filter(p => !assignedNames.has(p))

  function varianceClass(billing: number, dump: number | undefined) {
    if (dump === undefined) return ''
    const diff = Math.abs(billing - dump)
    if (diff === 0) return 'text-emerald-600'
    const pct = diff / Math.max(billing, dump)
    if (pct <= 0.05) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Plan Assignments</h3>
        {hasDump && dumpMonth && (
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
            Dump data: {dumpMonth}
          </span>
        )}
      </div>

      {customerPlans.length > 0 || hasDump ? (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Plan</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-600">
                  Billing SIMs
                  <p className="text-xs font-normal text-slate-400">manually entered</p>
                </th>
                {hasDump && (
                  <th className="px-4 py-2.5 text-right font-semibold text-blue-700">
                    Actual SIMs
                    <p className="text-xs font-normal text-blue-400">from dump</p>
                  </th>
                )}
                {hasDump && (
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600">
                    Variance
                    <p className="text-xs font-normal text-slate-400">billing − dump</p>
                  </th>
                )}
                {isAdmin && <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {/* Plans that exist in billing (customer_plans) */}
              {customerPlans.map((cp) => {
                const dumpCount = dumpByPlan?.[cp.plan.plan_name]
                const variance  = dumpCount !== undefined ? cp.sim_count - dumpCount : null
                return (
                  <tr key={cp.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{cp.plan.plan_name}</td>
                    <td className="px-4 py-2.5 text-right font-medium font-mono">
                      {cp.sim_count.toLocaleString('en-IN')}
                    </td>
                    {hasDump && (
                      <td className="px-4 py-2.5 text-right font-medium font-mono text-blue-700">
                        {dumpCount !== undefined ? dumpCount.toLocaleString('en-IN') : <span className="text-slate-300">—</span>}
                      </td>
                    )}
                    {hasDump && (
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${varianceClass(cp.sim_count, dumpCount)}`}>
                        {variance !== null
                          ? (variance >= 0 ? '+' : '') + variance.toLocaleString('en-IN')
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="destructive" onClick={() => removeCustomerPlan(cp.id, customerId)}>
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}

              {/* Plans found in dump but NOT in billing */}
              {hasDump && dumpOnlyPlans.map((plan) => {
                const dumpCount = dumpByPlan![plan]
                return (
                  <tr key={`dump-${plan}`} className="border-t bg-blue-50/40 hover:bg-blue-50">
                    <td className="px-4 py-2.5 text-slate-700 italic">
                      {plan}
                      <span className="ml-2 text-xs text-blue-500 not-italic font-medium">dump only</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300 font-mono">—</td>
                    {hasDump && (
                      <td className="px-4 py-2.5 text-right font-medium font-mono text-blue-700">
                        {dumpCount.toLocaleString('en-IN')}
                      </td>
                    )}
                    {hasDump && (
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-red-600">
                        −{dumpCount.toLocaleString('en-IN')}
                      </td>
                    )}
                    {isAdmin && <td />}
                  </tr>
                )
              })}

              {/* Totals row */}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-2.5 text-slate-700">Total</td>
                <td className="px-4 py-2.5 text-right font-bold font-mono">
                  {billingTotal.toLocaleString('en-IN')}
                </td>
                {hasDump && (
                  <td className="px-4 py-2.5 text-right font-bold font-mono text-blue-700">
                    {dumpTotal!.toLocaleString('en-IN')}
                  </td>
                )}
                {hasDump && (() => {
                  const varT = billingTotal - dumpTotal!
                  const cls  = Math.abs(varT) === 0 ? 'text-emerald-600' : Math.abs(varT / dumpTotal!) <= 0.05 ? 'text-amber-600' : 'text-red-600'
                  return (
                    <td className={`px-4 py-2.5 text-right font-bold font-mono ${cls}`}>
                      {(varT >= 0 ? '+' : '') + varT.toLocaleString('en-IN')}
                    </td>
                  )
                })()}
                {isAdmin && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No plans assigned yet.</p>
      )}

      {isAdmin && availablePlans.length > 0 && (
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
