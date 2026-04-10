'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPlan, updatePlan } from '@/actions/plans'
import type { Plan } from '@/lib/types'

export function PlanForm({ plan, onDone }: { plan?: Plan; onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    if (plan) {
      await updatePlan(plan.id, formData)
    } else {
      await createPlan(formData)
    }
    formRef.current?.reset()
    onDone()
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="plan_name">Plan Name *</Label>
        <Input id="plan_name" name="plan_name" defaultValue={plan?.plan_name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="data_limit">Data Limit</Label>
        <Input id="data_limit" name="data_limit" defaultValue={plan?.data_limit ?? ''} placeholder="e.g. 100 MB" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sms_limit">SMS Limit</Label>
        <Input id="sms_limit" name="sms_limit" defaultValue={plan?.sms_limit ?? ''} placeholder="e.g. 200 SMS" />
      </div>
      <div className="flex gap-2">
        <Button type="submit">{plan ? 'Update' : 'Add'} Plan</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}
