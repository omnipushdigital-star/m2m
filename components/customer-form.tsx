'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { createCustomer, updateCustomer } from '@/actions/customers'
import type { Customer } from '@/lib/types'

function Field({ label, name, defaultValue, type = 'text', required }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}{required && ' *'}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} />
    </div>
  )
}

function SelectField({ label, name, defaultValue, options }: {
  label: string; name: string; defaultValue?: string | null; options: string[]
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function CustomerForm({ customer }: { customer?: Customer }) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (customer) {
        await updateCustomer(customer.id, formData)
      } else {
        await createCustomer(formData)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Accordion type="multiple" defaultValue={['basic', 'po']}>

        <AccordionItem value="basic">
          <AccordionTrigger>Basic Info</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Field label="Customer Name" name="name" defaultValue={customer?.name} required />
              <Field label="Opp ID" name="opp_id" defaultValue={customer?.opp_id} />
              <Field label="S.No" name="s_no" defaultValue={customer?.s_no} type="number" />
              <Field label="Unit" name="unit" defaultValue={customer?.unit} />
              <Field label="City" name="city" defaultValue={customer?.city} />
              <SelectField label="Business Type" name="business_type" defaultValue={customer?.business_type} options={['NEW', 'NEW EXIST', 'RENEWAL']} />
              <SelectField label="Customer Type" name="customer_type" defaultValue={customer?.customer_type} options={['PLATINUM', 'OTHERS']} />
              <SelectField label="Main Category" name="main_category" defaultValue={customer?.main_category} options={['PRIVATE', 'GOVT', 'PSU']} />
              <SelectField label="Category" name="category" defaultValue={customer?.category} options={['SV', 'MIN', 'ITES', 'MFG', 'LOG', 'HOS', 'OTH']} />
              <Field label="NAM Name" name="nam_name" defaultValue={customer?.nam_name} />
              <Field label="CP Name" name="cp_name" defaultValue={customer?.cp_name} />
              <SelectField label="Tender/Negotiation" name="tender_negotiation" defaultValue={customer?.tender_negotiation} options={['Negotiation', 'Port-in']} />
              <Field label="MSME" name="msme" defaultValue={customer?.msme} />
              <Field label="MSME ID" name="msme_id" defaultValue={customer?.msme_id} />
              <Field label="Cluster" name="cluster" defaultValue={customer?.cluster} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="po">
          <AccordionTrigger>PO Details</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Field label="PO Date" name="po_date" defaultValue={customer?.po_date} type="date" />
              <Field label="PO Letter Number" name="po_letter_number" defaultValue={customer?.po_letter_number} />
              <Field label="PO Value" name="po_value" defaultValue={customer?.po_value} type="number" />
              <Field label="Year" name="year" defaultValue={customer?.year} type="number" />
              <Field label="Week Number" name="week_number" defaultValue={customer?.week_number} type="number" />
              <Field label="Product Name" name="product_name" defaultValue={customer?.product_name} />
              <Field label="Quantity" name="quantity" defaultValue={customer?.quantity} type="number" />
              <Field label="Moved to Stage 4 On" name="moved_to_stage4_on" defaultValue={customer?.moved_to_stage4_on} type="date" />
              <div className="col-span-2 space-y-1">
                <Label htmlFor="details">Details</Label>
                <textarea id="details" name="details" defaultValue={customer?.details ?? ''} rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tariff">
          <AccordionTrigger>Tariff</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Field label="Base Tariff" name="base_tariff" defaultValue={customer?.base_tariff} type="number" />
              <Field label="After Discount" name="after_discount" defaultValue={customer?.after_discount} type="number" />
              <Field label="After Negotiation" name="after_negotiation" defaultValue={customer?.after_negotiation} type="number" />
              <SelectField label="Billing Cycle" name="billing_cycle" defaultValue={customer?.billing_cycle} options={['Monthly', 'Quarterly', 'Annually']} />
              <Field label="Contract Period (years)" name="contract_period" defaultValue={customer?.contract_period} type="number" />
              <Field label="Vendor Name" name="vendor_name" defaultValue={customer?.vendor_name} />
              <Field label="Annualized Value" name="annualized_value" defaultValue={customer?.annualized_value} type="number" />
              <Field label="Additional Payment" name="additional_payment" defaultValue={customer?.additional_payment} type="number" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="commissioning">
          <AccordionTrigger>Commissioning</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Field label="Commissioned Qty" name="commissioned_qty" defaultValue={customer?.commissioned_qty} type="number" />
              <Field label="Billed Amount" name="billed_amount" defaultValue={customer?.billed_amount} type="number" />
              <SelectField label="Commissioned Status" name="commissioned_status" defaultValue={customer?.commissioned_status} options={['Nil', 'Full', 'partial']} />
              <Field label="Commissioned On" name="commissioned_on" defaultValue={customer?.commissioned_on} type="date" />
              <Field label="Qty Commissioned" name="qty_commissioned" defaultValue={customer?.qty_commissioned} type="number" />
              <Field label="Commissioning Pending" name="commissioning_pending" defaultValue={customer?.commissioning_pending} type="number" />
              <Field label="ABF Generated (₹ Cr)" name="abf_generated" defaultValue={customer?.abf_generated} type="number" />
              <Field label="Revenue Realised" name="revenue_realised" defaultValue={customer?.revenue_realised} type="number" />
              <SelectField label="Product Vertical" name="product_vertical" defaultValue={customer?.product_vertical} options={['CM', 'EB', 'CFA']} />
              <div className="col-span-2 space-y-1">
                <Label htmlFor="reason_for_pendancy">Reason for Pendancy</Label>
                <Input id="reason_for_pendancy" name="reason_for_pendancy" defaultValue={customer?.reason_for_pendancy ?? ''} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
      </Button>
    </form>
  )
}
