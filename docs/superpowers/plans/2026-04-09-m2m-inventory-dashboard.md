# M2M Inventory & Billing Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 App Router dashboard for M2M SIM inventory and billing management backed by Supabase, deployed on Vercel via GitHub.

**Architecture:** Server Components fetch data directly from Supabase. Server Actions handle all mutations. No authentication — single-user private dashboard. Seed script populates initial data from Excel file.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (`@supabase/supabase-js`), Shadcn/UI, Tailwind CSS, Recharts, xlsx, Vitest

**Spec:** `docs/superpowers/specs/2026-04-09-m2m-inventory-dashboard-design.md`

---

## File Map

```
app/
  layout.tsx                    root layout with nav
  page.tsx                      Dashboard
  customers/
    page.tsx                    Customer list
    [id]/page.tsx               Customer detail
  reports/page.tsx              Monthly report
  plans/page.tsx                Plan management
components/
  nav.tsx                       Top navigation (client)
  dashboard-cards.tsx           Summary metric cards (server)
  abf-chart.tsx                 ABF bar chart (client — recharts)
  top-customers-table.tsx       Top 10 customers table (server)
  customer-table.tsx            Customer list with search (client)
  customer-form.tsx             Add/edit customer form (client)
  customer-plan-section.tsx     Plan assignment UI (client)
  monthly-entry-form.tsx        Add monthly record form (client)
  monthly-history-table.tsx     Per-customer month history (server)
  monthly-report-table.tsx      Monthly report with export (client)
  plan-table.tsx                Plan management table (client)
  plan-form.tsx                 Add/edit plan form (client)
lib/
  supabase.ts                   Supabase client factory
  types.ts                      TypeScript types for all DB tables
  export.ts                     Excel export utility
actions/
  customers.ts                  Server Actions: create/update customer
  monthly-records.ts            Server Actions: create/update monthly record
  customer-plans.ts             Server Actions: upsert customer plan
  plans.ts                      Server Actions: create/update/delete plan
scripts/
  seed.js                       Seed plans + customers from Excel
supabase/
  schema.sql                    Full database schema
__tests__/
  export.test.ts                Tests for Excel export utility
```

---

## Task 1: Project Setup & Dependencies

**Files:**
- Create: `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` (via scaffolding)
- Create: `.env.local`
- Create: `.gitignore` additions

- [ ] **Step 1: Scaffold Next.js project in the current directory**

Run from `D:\Claude Projects\M2M INVENTORY`:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*" --use-npm
```
When prompted "would you like to overwrite package.json", choose **yes**. This replaces the temporary package.json from earlier.

Expected output: `Success! Created m2m-inventory`

- [ ] **Step 2: Install Supabase, Recharts, and Vitest**

```bash
npm install @supabase/supabase-js recharts
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install xlsx
```

- [ ] **Step 3: Initialize Shadcn/UI**

```bash
npx shadcn@latest init
```
Select: **Default** style, **Slate** base color, **yes** for CSS variables.

- [ ] **Step 4: Add Shadcn components**

```bash
npx shadcn@latest add button card input label select dialog sheet table form badge separator tabs accordion
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create `.env.local`**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://fvkiaiiuookighromliv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get the anon key from: Supabase Dashboard → Project Settings → API → `anon public` key.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with Shadcn, Supabase, Recharts"
```

---

## Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write the schema file**

Create `supabase/schema.sql`:
```sql
-- Disable RLS for all tables (single-user, no auth needed)

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null,
  data_limit text,
  sms_limit text,
  created_at timestamptz default now()
);
alter table plans disable row level security;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  opp_id text,
  s_no integer,
  unit text,
  city text,
  name text not null,
  msme text,
  msme_id text,
  business_type text,
  customer_type text,
  main_category text,
  category text,
  nam_name text,
  cp_name text,
  tender_negotiation text,
  year integer,
  week_number integer,
  cluster text,
  product_name text,
  quantity integer,
  details text,
  base_tariff numeric,
  after_discount numeric,
  after_negotiation numeric,
  po_value numeric,
  revenue_realised numeric,
  moved_to_stage4_on date,
  po_date date,
  po_letter_number text,
  additional_payment numeric,
  contract_period integer,
  commissioned_qty integer,
  billed_amount numeric,
  commissioned_status text,
  commissioned_on date,
  vendor_name text,
  annualized_value numeric,
  billing_cycle text,
  qty_commissioned integer,
  commissioning_pending integer,
  abf_generated numeric,
  reason_for_pendancy text,
  product_vertical text,
  created_at timestamptz default now()
);
alter table customers disable row level security;

create table if not exists customer_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  plan_id uuid references plans(id) on delete restrict,
  sim_count integer not null default 0,
  created_at timestamptz default now(),
  unique(customer_id, plan_id)
);
alter table customer_plans disable row level security;

create table if not exists monthly_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  month text not null,
  activations integer default 0,
  deactivations integer default 0,
  plan_changes integer default 0,
  active_sims integer default 0,
  abf_amount numeric default 0,
  revenue_realised numeric default 0,
  commissioning_pending integer default 0,
  notes text,
  created_at timestamptz default now(),
  unique(customer_id, month)
);
alter table monthly_records disable row level security;
```

- [ ] **Step 2: Run the schema in Supabase**

1. Open Supabase Dashboard → project `fvkiaiiuookighromliv`
2. Go to **SQL Editor**
3. Paste the full contents of `supabase/schema.sql`
4. Click **Run**

Expected: "Success. No rows returned" for each statement.

- [ ] **Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm 4 tables appear: `plans`, `customers`, `customer_plans`, `monthly_records`.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase schema for plans, customers, customer_plans, monthly_records"
```

---

## Task 3: TypeScript Types & Supabase Client

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase.ts`

- [ ] **Step 1: Write types**

Create `lib/types.ts`:
```typescript
export type Plan = {
  id: string
  plan_name: string
  data_limit: string | null
  sms_limit: string | null
  created_at: string
}

export type Customer = {
  id: string
  opp_id: string | null
  s_no: number | null
  unit: string | null
  city: string | null
  name: string
  msme: string | null
  msme_id: string | null
  business_type: string | null
  customer_type: string | null
  main_category: string | null
  category: string | null
  nam_name: string | null
  cp_name: string | null
  tender_negotiation: string | null
  year: number | null
  week_number: number | null
  cluster: string | null
  product_name: string | null
  quantity: number | null
  details: string | null
  base_tariff: number | null
  after_discount: number | null
  after_negotiation: number | null
  po_value: number | null
  revenue_realised: number | null
  moved_to_stage4_on: string | null
  po_date: string | null
  po_letter_number: string | null
  additional_payment: number | null
  contract_period: number | null
  commissioned_qty: number | null
  billed_amount: number | null
  commissioned_status: string | null
  commissioned_on: string | null
  vendor_name: string | null
  annualized_value: number | null
  billing_cycle: string | null
  qty_commissioned: number | null
  commissioning_pending: number | null
  abf_generated: number | null
  reason_for_pendancy: string | null
  product_vertical: string | null
  created_at: string
}

export type CustomerPlan = {
  id: string
  customer_id: string
  plan_id: string
  sim_count: number
  created_at: string
  plan?: Plan
}

export type MonthlyRecord = {
  id: string
  customer_id: string
  month: string
  activations: number
  deactivations: number
  plan_changes: number
  active_sims: number
  abf_amount: number
  revenue_realised: number
  commissioning_pending: number
  notes: string | null
  created_at: string
}

export type CustomerWithPlans = Customer & {
  customer_plans: CustomerPlan[]
  monthly_records: MonthlyRecord[]
}
```

- [ ] **Step 2: Write Supabase client factory**

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts lib/supabase.ts
git commit -m "feat: add TypeScript types and Supabase client factory"
```

---

## Task 4: Root Layout & Navigation

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/nav.tsx`

- [ ] **Step 1: Write the nav component**

Create `components/nav.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/reports', label: 'Reports' },
  { href: '/plans', label: 'Plans' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-8">
        <span className="font-semibold text-sm text-slate-900">M2M Dashboard</span>
        <nav className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'M2M Inventory Dashboard',
  description: 'M2M SIM inventory and billing management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify layout renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm nav bar appears with 4 links. All links should be clickable (pages will 404 until built).

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx components/nav.tsx
git commit -m "feat: add root layout and navigation bar"
```

---

## Task 5: Plans Page

**Files:**
- Create: `actions/plans.ts`
- Create: `components/plan-form.tsx`
- Create: `components/plan-table.tsx`
- Create: `app/plans/page.tsx`

- [ ] **Step 1: Write Server Actions for plans**

Create `actions/plans.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function createPlan(formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('plans').insert({
    plan_name: formData.get('plan_name') as string,
    data_limit: (formData.get('data_limit') as string) || null,
    sms_limit: (formData.get('sms_limit') as string) || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function updatePlan(id: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('plans').update({
    plan_name: formData.get('plan_name') as string,
    data_limit: (formData.get('data_limit') as string) || null,
    sms_limit: (formData.get('sms_limit') as string) || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function deletePlan(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}
```

- [ ] **Step 2: Write the plan form component**

Create `components/plan-form.tsx`:
```typescript
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
```

- [ ] **Step 3: Write the plan table component**

Create `components/plan-table.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PlanForm } from './plan-form'
import { deletePlan } from '@/actions/plans'
import type { Plan } from '@/lib/types'

export function PlanTable({ plans }: { plans: Plan[] }) {
  const [editing, setEditing] = useState<Plan | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Plans ({plans.length})</h2>
        <Button size="sm" onClick={() => setAdding(true)}>+ Add Plan</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Plan Name</th>
              <th className="px-4 py-2 text-left font-medium">Data</th>
              <th className="px-4 py-2 text-left font-medium">SMS</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-t">
                <td className="px-4 py-2 font-medium">{plan.plan_name}</td>
                <td className="px-4 py-2 text-slate-600">{plan.data_limit ?? <Badge variant="outline">—</Badge>}</td>
                <td className="px-4 py-2 text-slate-600">{plan.sms_limit ?? <Badge variant="outline">—</Badge>}</td>
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
```

- [ ] **Step 4: Write the plans page**

Create `app/plans/page.tsx`:
```typescript
import { getSupabase } from '@/lib/supabase'
import { PlanTable } from '@/components/plan-table'

export default async function PlansPage() {
  const supabase = getSupabase()
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('plan_name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Plan Management</h1>
      <PlanTable plans={plans ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Navigate to `http://localhost:3000/plans`. Confirm:
- Page loads (no data yet)
- "+ Add Plan" button opens dialog
- Form has 3 fields: Plan Name, Data Limit, SMS Limit

- [ ] **Step 6: Commit**

```bash
git add actions/plans.ts components/plan-form.tsx components/plan-table.tsx app/plans/page.tsx
git commit -m "feat: add plans page with CRUD"
```

---

## Task 6: Customer List Page

**Files:**
- Create: `components/customer-table.tsx`
- Create: `app/customers/page.tsx`

- [ ] **Step 1: Write the customer table component**

Create `components/customer-table.tsx`:
```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Customer, CustomerPlan } from '@/lib/types'

type CustomerRow = Customer & { customer_plans: CustomerPlan[] }

export function CustomerTable({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.nam_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by customer name or NAM..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
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
```

- [ ] **Step 2: Write the customers list page**

Create `app/customers/page.tsx`:
```typescript
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { CustomerTable } from '@/components/customer-table'
import { Button } from '@/components/ui/button'

export default async function CustomersPage() {
  const supabase = getSupabase()
  const { data: customers } = await supabase
    .from('customers')
    .select('*, customer_plans(id, plan_id, sim_count)')
    .order('name')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button asChild>
          <Link href="/customers/new">+ Add Customer</Link>
        </Button>
      </div>
      <CustomerTable customers={customers ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/customer-table.tsx app/customers/page.tsx
git commit -m "feat: add customer list page with search"
```

---

## Task 7: Add/Edit Customer Form

**Files:**
- Create: `actions/customers.ts`
- Create: `components/customer-form.tsx`
- Create: `app/customers/new/page.tsx`

- [ ] **Step 1: Write Server Actions for customers**

Create `actions/customers.ts`:
```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

function parseCustomerForm(formData: FormData) {
  const str = (key: string) => (formData.get(key) as string) || null
  const num = (key: string) => {
    const v = formData.get(key) as string
    return v ? parseFloat(v) : null
  }
  const int = (key: string) => {
    const v = formData.get(key) as string
    return v ? parseInt(v) : null
  }
  return {
    opp_id: str('opp_id'),
    s_no: int('s_no'),
    unit: str('unit'),
    city: str('city'),
    name: formData.get('name') as string,
    msme: str('msme'),
    msme_id: str('msme_id'),
    business_type: str('business_type'),
    customer_type: str('customer_type'),
    main_category: str('main_category'),
    category: str('category'),
    nam_name: str('nam_name'),
    cp_name: str('cp_name'),
    tender_negotiation: str('tender_negotiation'),
    year: int('year'),
    week_number: int('week_number'),
    cluster: str('cluster'),
    product_name: str('product_name'),
    quantity: int('quantity'),
    details: str('details'),
    base_tariff: num('base_tariff'),
    after_discount: num('after_discount'),
    after_negotiation: num('after_negotiation'),
    po_value: num('po_value'),
    revenue_realised: num('revenue_realised'),
    moved_to_stage4_on: str('moved_to_stage4_on'),
    po_date: str('po_date'),
    po_letter_number: str('po_letter_number'),
    additional_payment: num('additional_payment'),
    contract_period: int('contract_period'),
    commissioned_qty: int('commissioned_qty'),
    billed_amount: num('billed_amount'),
    commissioned_status: str('commissioned_status'),
    commissioned_on: str('commissioned_on'),
    vendor_name: str('vendor_name'),
    annualized_value: num('annualized_value'),
    billing_cycle: str('billing_cycle'),
    qty_commissioned: int('qty_commissioned'),
    commissioning_pending: int('commissioning_pending'),
    abf_generated: num('abf_generated'),
    reason_for_pendancy: str('reason_for_pendancy'),
    product_vertical: str('product_vertical'),
  }
}

export async function createCustomer(formData: FormData) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .insert(parseCustomerForm(formData))
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  redirect(`/customers/${data.id}`)
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('customers')
    .update(parseCustomerForm(formData))
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${id}`)
  revalidatePath('/customers')
}
```

- [ ] **Step 2: Write the customer form component**

Create `components/customer-form.tsx`:
```typescript
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
```

- [ ] **Step 3: Write the Add New Customer page**

Create `app/customers/new/page.tsx`:
```typescript
import { CustomerForm } from '@/components/customer-form'

export default function NewCustomerPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>
      <CustomerForm />
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Navigate to `http://localhost:3000/customers/new`. Confirm:
- Form has 4 accordion sections (Basic Info, PO Details, Tariff, Commissioning)
- Basic Info and PO Details open by default
- All fields are present

- [ ] **Step 5: Commit**

```bash
git add actions/customers.ts components/customer-form.tsx app/customers/new/page.tsx
git commit -m "feat: add customer create/edit form with accordion sections"
```

---

## Task 8: Customer Detail Page & Plan Assignment

**Files:**
- Create: `actions/customer-plans.ts`
- Create: `components/customer-plan-section.tsx`
- Create: `app/customers/[id]/page.tsx`

- [ ] **Step 1: Write Server Actions for customer plans**

Create `actions/customer-plans.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function upsertCustomerPlan(customerId: string, planId: string, simCount: number) {
  const supabase = getSupabase()
  const { error } = await supabase.from('customer_plans').upsert(
    { customer_id: customerId, plan_id: planId, sim_count: simCount },
    { onConflict: 'customer_id,plan_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}

export async function removeCustomerPlan(id: string, customerId: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('customer_plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}
```

- [ ] **Step 2: Write the customer plan section component**

Create `components/customer-plan-section.tsx`:
```typescript
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
```

- [ ] **Step 3: Write the customer detail page**

Create `app/customers/[id]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { CustomerPlanSection } from '@/components/customer-plan-section'
import { CustomerForm } from '@/components/customer-form'
import { MonthlyEntryForm } from '@/components/monthly-entry-form'
import { MonthlyHistoryTable } from '@/components/monthly-history-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabase()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!customer) notFound()

  const { data: customerPlans } = await supabase
    .from('customer_plans')
    .select('*, plan:plans(*)')
    .eq('customer_id', params.id)

  const { data: allPlans } = await supabase
    .from('plans')
    .select('*')
    .order('plan_name')

  const { data: monthlyRecords } = await supabase
    .from('monthly_records')
    .select('*')
    .eq('customer_id', params.id)
    .order('month', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/customers" className="text-sm text-slate-500 hover:underline">← Customers</Link>
          <h1 className="text-2xl font-bold mt-1">{customer.name}</h1>
          <div className="flex gap-2 mt-1">
            {customer.product_vertical && <Badge>{customer.product_vertical}</Badge>}
            {customer.billing_cycle && <Badge variant="outline">{customer.billing_cycle}</Badge>}
            {customer.commissioned_status && <Badge variant="outline">{customer.commissioned_status}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Edit Customer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
              </DialogHeader>
              <CustomerForm customer={customer} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button>+ Add Monthly Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Monthly Entry</DialogTitle>
              </DialogHeader>
              <MonthlyEntryForm customerId={params.id} existingMonths={(monthlyRecords ?? []).map(r => r.month)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="monthly">Monthly History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="NAM" value={customer.nam_name} />
            <InfoCard label="City" value={customer.city} />
            <InfoCard label="PO Date" value={customer.po_date} />
            <InfoCard label="PO Number" value={customer.po_letter_number} />
            <InfoCard label="Committed Qty" value={customer.quantity?.toLocaleString()} />
            <InfoCard label="Commissioned Qty" value={customer.commissioned_qty?.toLocaleString()} />
            <InfoCard label="Pending" value={customer.commissioning_pending?.toLocaleString()} />
            <InfoCard label="ABF Generated (₹ Cr)" value={customer.abf_generated?.toFixed(3)} />
            <InfoCard label="Base Tariff" value={customer.base_tariff?.toFixed(4)} />
            <InfoCard label="After Negotiation" value={customer.after_negotiation?.toFixed(4)} />
            <InfoCard label="Billing Cycle" value={customer.billing_cycle} />
            <InfoCard label="Contract Period" value={customer.contract_period ? `${customer.contract_period}Y` : null} />
            <InfoCard label="Vendor" value={customer.vendor_name} />
            <InfoCard label="Product" value={customer.product_name} />
            <InfoCard label="Vertical" value={customer.product_vertical} />
            <InfoCard label="CP Name" value={customer.cp_name} />
          </div>
          {customer.details && (
            <div className="rounded-md border p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Details</p>
              <p className="text-sm">{customer.details}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="pt-4">
          <CustomerPlanSection
            customerId={params.id}
            customerPlans={(customerPlans ?? []) as any}
            allPlans={allPlans ?? []}
          />
        </TabsContent>

        <TabsContent value="monthly" className="pt-4">
          <MonthlyHistoryTable records={monthlyRecords ?? []} customerId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value ?? '—'}</p>
    </div>
  )
}
```

- [ ] **Step 4: Commit (placeholder — monthly components come next task)**

```bash
git add actions/customer-plans.ts components/customer-plan-section.tsx app/customers/[id]/page.tsx
git commit -m "feat: add customer detail page with plan assignment"
```

---

## Task 9: Monthly Entry Form & History Table

**Files:**
- Create: `actions/monthly-records.ts`
- Create: `components/monthly-entry-form.tsx`
- Create: `components/monthly-history-table.tsx`

- [ ] **Step 1: Write Server Actions for monthly records**

Create `actions/monthly-records.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'

export async function createMonthlyRecord(customerId: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('monthly_records').insert({
    customer_id: customerId,
    month: formData.get('month') as string,
    activations: parseInt(formData.get('activations') as string) || 0,
    deactivations: parseInt(formData.get('deactivations') as string) || 0,
    plan_changes: parseInt(formData.get('plan_changes') as string) || 0,
    active_sims: parseInt(formData.get('active_sims') as string) || 0,
    abf_amount: parseFloat(formData.get('abf_amount') as string) || 0,
    revenue_realised: parseFloat(formData.get('revenue_realised') as string) || 0,
    commissioning_pending: parseInt(formData.get('commissioning_pending') as string) || 0,
    notes: (formData.get('notes') as string) || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}

export async function updateMonthlyRecord(id: string, customerId: string, formData: FormData) {
  const supabase = getSupabase()
  const { error } = await supabase.from('monthly_records').update({
    activations: parseInt(formData.get('activations') as string) || 0,
    deactivations: parseInt(formData.get('deactivations') as string) || 0,
    plan_changes: parseInt(formData.get('plan_changes') as string) || 0,
    active_sims: parseInt(formData.get('active_sims') as string) || 0,
    abf_amount: parseFloat(formData.get('abf_amount') as string) || 0,
    revenue_realised: parseFloat(formData.get('revenue_realised') as string) || 0,
    commissioning_pending: parseInt(formData.get('commissioning_pending') as string) || 0,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}

export async function deleteMonthlyRecord(id: string, customerId: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('monthly_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/customers/${customerId}`)
}
```

- [ ] **Step 2: Write the monthly entry form**

Create `components/monthly-entry-form.tsx`:
```typescript
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMonthlyRecord, updateMonthlyRecord } from '@/actions/monthly-records'
import type { MonthlyRecord } from '@/lib/types'

function currentMonth() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

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

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (record) {
        await updateMonthlyRecord(record.id, customerId, formData)
      } else {
        await createMonthlyRecord(customerId, formData)
      }
      onDone?.()
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
            defaultValue={currentMonth()}
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
          <Label htmlFor="abf_amount">ABF Amount (₹ Cr)</Label>
          <Input id="abf_amount" name="abf_amount" type="number" step="0.001" defaultValue={record?.abf_amount ?? 0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="revenue_realised">Revenue Realised (₹ Cr)</Label>
          <Input id="revenue_realised" name="revenue_realised" type="number" step="0.001" defaultValue={record?.revenue_realised ?? 0} />
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

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : record ? 'Update Entry' : 'Add Entry'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Write the monthly history table**

Create `components/monthly-history-table.tsx`:
```typescript
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
}: {
  records: MonthlyRecord[]
  customerId: string
}) {
  const [editing, setEditing] = useState<MonthlyRecord | null>(null)

  if (records.length === 0) {
    return <p className="text-sm text-slate-500">No monthly records yet. Click "+ Add Monthly Entry" to get started.</p>
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
              <th className="px-3 py-2 text-right font-medium">Actions</th>
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
                <td className="px-3 py-2 text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm(`Delete record for ${r.month}?`)) deleteMonthlyRecord(r.id, customerId)
                  }}>Del</Button>
                </td>
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
```

- [ ] **Step 4: Verify end-to-end after seed (skip for now — verify after Task 12)**

This will be verified after the seed script runs. Continue to next task.

- [ ] **Step 5: Commit**

```bash
git add actions/monthly-records.ts components/monthly-entry-form.tsx components/monthly-history-table.tsx
git commit -m "feat: add monthly entry form and history table"
```

---

## Task 10: Dashboard Page

**Files:**
- Create: `components/dashboard-cards.tsx`
- Create: `components/abf-chart.tsx`
- Create: `components/top-customers-table.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write dashboard summary cards**

Create `components/dashboard-cards.tsx`:
```typescript
import { getSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function DashboardCards() {
  const supabase = getSupabase()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [{ count: customerCount }, { data: currentMonthRecords }, { data: allLatestRecords }] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('monthly_records').select('abf_amount, commissioning_pending, active_sims').eq('month', currentMonth),
    supabase.from('monthly_records').select('customer_id, active_sims, commissioning_pending').order('month', { ascending: false }),
  ])

  // Get latest record per customer for active SIM total
  const latestPerCustomer = new Map<string, typeof allLatestRecords extends (infer T)[] | null ? T : never>()
  for (const r of allLatestRecords ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) latestPerCustomer.set(r.customer_id, r)
  }
  const totalActiveSims = [...latestPerCustomer.values()].reduce((s, r) => s + (r.active_sims ?? 0), 0)

  const totalAbfThisMonth = (currentMonthRecords ?? []).reduce((s, r) => s + (r.abf_amount ?? 0), 0)
  const totalPending = (currentMonthRecords ?? []).reduce((s, r) => s + (r.commissioning_pending ?? 0), 0)

  const cards = [
    { title: 'Total Customers', value: customerCount ?? 0, format: 'count' },
    { title: 'Total Active SIMs', value: totalActiveSims, format: 'count' },
    { title: `ABF This Month (₹ Cr)`, value: totalAbfThisMonth, format: 'decimal' },
    { title: 'Commissioning Pending', value: totalPending, format: 'count' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {card.format === 'decimal'
                ? card.value.toFixed(3)
                : card.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write the ABF chart**

Create `components/abf-chart.tsx`:
```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function AbfChart({ data }: { data: { month: string; abf: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v.toFixed(1)}Cr`} />
          <Tooltip formatter={(v: number) => [`₹${v.toFixed(3)} Cr`, 'ABF']} />
          <Bar dataKey="abf" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Write top customers table**

Create `components/top-customers-table.tsx`:
```typescript
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export async function TopCustomersTable() {
  const supabase = getSupabase()
  const { data: records } = await supabase
    .from('monthly_records')
    .select('customer_id, active_sims, month')
    .order('month', { ascending: false })

  const latestPerCustomer = new Map<string, number>()
  for (const r of records ?? []) {
    if (!latestPerCustomer.has(r.customer_id)) {
      latestPerCustomer.set(r.customer_id, r.active_sims ?? 0)
    }
  }

  const topIds = [...latestPerCustomer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  if (topIds.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, product_vertical')
    .in('id', topIds)

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? [])

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-4 py-2 text-left font-medium">Customer</th>
            <th className="px-4 py-2 text-left font-medium">Vertical</th>
            <th className="px-4 py-2 text-right font-medium">Active SIMs</th>
          </tr>
        </thead>
        <tbody>
          {topIds.map((id, i) => {
            const c = customerMap.get(id)
            return (
              <tr key={id} className="border-t">
                <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                <td className="px-4 py-2">
                  <Link href={`/customers/${id}`} className="text-blue-600 hover:underline">
                    {c?.name ?? id}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{c?.product_vertical ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {(latestPerCustomer.get(id) ?? 0).toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Write the dashboard page**

Replace `app/page.tsx`:
```typescript
import { Suspense } from 'react'
import { getSupabase } from '@/lib/supabase'
import { DashboardCards } from '@/components/dashboard-cards'
import { AbfChart } from '@/components/abf-chart'
import { TopCustomersTable } from '@/components/top-customers-table'

async function AbfChartData() {
  const supabase = getSupabase()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  const fromMonth = sixMonthsAgo.toISOString().slice(0, 7)

  const { data } = await supabase
    .from('monthly_records')
    .select('month, abf_amount')
    .gte('month', fromMonth)

  const monthTotals = new Map<string, number>()
  for (const r of data ?? []) {
    monthTotals.set(r.month, (monthTotals.get(r.month) ?? 0) + (r.abf_amount ?? 0))
  }

  const chartData = [...monthTotals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, abf]) => ({ month, abf }))

  return <AbfChart data={chartData} />
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />)}</div>}>
        <DashboardCards />
      </Suspense>
      <div>
        <h2 className="text-lg font-semibold mb-3">ABF Trend — Last 6 Months (₹ Cr)</h2>
        <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}>
          <AbfChartData />
        </Suspense>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Top 10 Customers by Active SIMs</h2>
        <Suspense fallback={<div className="h-48 rounded-lg bg-slate-100 animate-pulse" />}>
          <TopCustomersTable />
        </Suspense>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard-cards.tsx components/abf-chart.tsx components/top-customers-table.tsx app/page.tsx
git commit -m "feat: add dashboard with summary cards, ABF chart, and top customers"
```

---

## Task 11: Monthly Report & Excel Export

**Files:**
- Create: `lib/export.ts`
- Create: `__tests__/export.test.ts`
- Create: `components/monthly-report-table.tsx`
- Create: `app/reports/page.tsx`

- [ ] **Step 1: Write the export utility**

Create `lib/export.ts`:
```typescript
import * as XLSX from 'xlsx'
import type { MonthlyRecord, Customer } from './types'

export type ReportRow = MonthlyRecord & { customer: Pick<Customer, 'name' | 'nam_name' | 'product_vertical'> }

export function buildReportWorkbook(rows: ReportRow[], month: string): XLSX.WorkBook {
  const data = rows.map((r) => ({
    'Customer': r.customer.name,
    'NAM': r.customer.nam_name ?? '',
    'Vertical': r.customer.product_vertical ?? '',
    'Activations': r.activations,
    'Deactivations': r.deactivations,
    'Plan Changes': r.plan_changes,
    'Active SIMs': r.active_sims,
    'ABF (₹ Cr)': r.abf_amount,
    'Revenue (₹ Cr)': r.revenue_realised,
    'Commissioning Pending': r.commissioning_pending,
    'Notes': r.notes ?? '',
  }))

  // Totals row
  data.push({
    'Customer': 'TOTAL',
    'NAM': '',
    'Vertical': '',
    'Activations': rows.reduce((s, r) => s + r.activations, 0),
    'Deactivations': rows.reduce((s, r) => s + r.deactivations, 0),
    'Plan Changes': rows.reduce((s, r) => s + r.plan_changes, 0),
    'Active SIMs': rows.reduce((s, r) => s + r.active_sims, 0),
    'ABF (₹ Cr)': parseFloat(rows.reduce((s, r) => s + r.abf_amount, 0).toFixed(3)),
    'Revenue (₹ Cr)': parseFloat(rows.reduce((s, r) => s + r.revenue_realised, 0).toFixed(3)),
    'Commissioning Pending': rows.reduce((s, r) => s + r.commissioning_pending, 0),
    'Notes': '',
  })

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 40 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
    { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Report ${month}`)
  return wb
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename)
}
```

- [ ] **Step 2: Write failing tests for the export utility**

Create `__tests__/export.test.ts`:
```typescript
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
    expect(data).toHaveLength(3) // 2 data rows + 1 totals row
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
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm run test
```

Expected output:
```
✓ __tests__/export.test.ts (4)
  ✓ buildReportWorkbook > creates a workbook with correct sheet name
  ✓ buildReportWorkbook > has correct number of rows including totals row
  ✓ buildReportWorkbook > calculates totals correctly
  ✓ buildReportWorkbook > includes all customer fields

Test Files  1 passed (1)
Tests       4 passed (4)
```

- [ ] **Step 4: Write the monthly report table component**

Create `components/monthly-report-table.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { buildReportWorkbook, downloadWorkbook } from '@/lib/export'
import type { ReportRow } from '@/lib/export'

export function MonthlyReportTable({
  rows,
  month,
  allMonths,
}: {
  rows: ReportRow[]
  month: string
  allMonths: string[]
}) {
  const router = useRouter()

  const totals = {
    activations: rows.reduce((s, r) => s + r.activations, 0),
    deactivations: rows.reduce((s, r) => s + r.deactivations, 0),
    plan_changes: rows.reduce((s, r) => s + r.plan_changes, 0),
    active_sims: rows.reduce((s, r) => s + r.active_sims, 0),
    abf_amount: rows.reduce((s, r) => s + r.abf_amount, 0),
    revenue_realised: rows.reduce((s, r) => s + r.revenue_realised, 0),
    commissioning_pending: rows.reduce((s, r) => s + r.commissioning_pending, 0),
  }

  function handleExport() {
    const wb = buildReportWorkbook(rows, month)
    downloadWorkbook(wb, `M2M-Report-${month}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={month}
          onChange={(e) => router.push(`/reports?month=${e.target.value}`)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <Button onClick={handleExport} disabled={rows.length === 0} variant="outline">
          Export to Excel
        </Button>
        <span className="text-sm text-slate-500">{rows.length} customer(s) with records</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No records found for {month}.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">NAM</th>
                <th className="px-3 py-2 text-right font-medium">Activations</th>
                <th className="px-3 py-2 text-right font-medium">Deactivations</th>
                <th className="px-3 py-2 text-right font-medium">Plan Changes</th>
                <th className="px-3 py-2 text-right font-medium">Active SIMs</th>
                <th className="px-3 py-2 text-right font-medium">ABF (₹ Cr)</th>
                <th className="px-3 py-2 text-right font-medium">Revenue (₹ Cr)</th>
                <th className="px-3 py-2 text-right font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{r.customer.name}</td>
                  <td className="px-3 py-2 text-slate-600">{r.customer.nam_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-green-700">{r.activations}</td>
                  <td className="px-3 py-2 text-right text-red-600">{r.deactivations}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{r.plan_changes}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.active_sims.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.abf_amount.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{r.revenue_realised.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{r.commissioning_pending.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 bg-slate-100">
              <tr>
                <td className="px-3 py-2 font-bold" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right font-bold text-green-700">{totals.activations}</td>
                <td className="px-3 py-2 text-right font-bold text-red-600">{totals.deactivations}</td>
                <td className="px-3 py-2 text-right font-bold text-blue-600">{totals.plan_changes}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.active_sims.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.abf_amount.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.revenue_realised.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-bold">{totals.commissioning_pending.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write the reports page**

Create `app/reports/page.tsx`:
```typescript
import { getSupabase } from '@/lib/supabase'
import { MonthlyReportTable } from '@/components/monthly-report-table'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const supabase = getSupabase()

  // Get all distinct months that have records
  const { data: monthRows } = await supabase
    .from('monthly_records')
    .select('month')
    .order('month', { ascending: false })

  const allMonths = [...new Set((monthRows ?? []).map((r) => r.month))]
  if (allMonths.length === 0) {
    allMonths.push(new Date().toISOString().slice(0, 7))
  }

  const month = searchParams.month ?? allMonths[0]

  const { data: records } = await supabase
    .from('monthly_records')
    .select('*, customer:customers(name, nam_name, product_vertical)')
    .eq('month', month)
    .order('created_at')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Monthly Report</h1>
      <MonthlyReportTable
        rows={(records ?? []) as any}
        month={month}
        allMonths={allMonths}
      />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/export.ts __tests__/export.test.ts components/monthly-report-table.tsx app/reports/page.tsx
git commit -m "feat: add monthly report page with Excel export"
```

---

## Task 12: Seed Script

**Files:**
- Create: `scripts/seed.js`

- [ ] **Step 1: Write the seed script**

Create `scripts/seed.js`:
```javascript
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function parsePlanDetails(planName) {
  const dataMatch = planName.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i)
  const smsMatch = planName.match(/(\d+(?:\.\d+)?)\s*SMS/i)
  return {
    data_limit: dataMatch ? `${dataMatch[1]} ${dataMatch[2].toUpperCase()}` : null,
    sms_limit: smsMatch ? `${smsMatch[1]} SMS` : null,
  }
}

async function seed() {
  const wb = XLSX.readFile('./M2M HR Data 09042026.xlsx')
  const ws = wb.Sheets['Sheet1']
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Combine both column sets
  const rows = []
  for (let i = 1; i < data.length; i++) {
    const r = data[i]
    if (r[0] && r[1]) rows.push({ name: String(r[0]).trim(), plan: String(r[1]).trim(), count: Number(r[2]) || 0 })
    if (r[5] && r[6]) rows.push({ name: String(r[5]).trim(), plan: String(r[6]).trim(), count: Number(r[7]) || 0 })
  }

  // --- Seed plans ---
  const uniquePlanNames = [...new Set(rows.map((r) => r.plan))]
  console.log(`Inserting ${uniquePlanNames.length} plans...`)
  const plansToInsert = uniquePlanNames.map((name) => ({ plan_name: name, ...parsePlanDetails(name) }))
  const { data: insertedPlans, error: planError } = await supabase.from('plans').insert(plansToInsert).select('id, plan_name')
  if (planError) { console.error('Plan insert error:', planError); process.exit(1) }
  const planMap = new Map(insertedPlans.map((p) => [p.plan_name, p.id]))
  console.log(`✓ ${insertedPlans.length} plans inserted`)

  // --- Seed customers ---
  const uniqueCustomerNames = [...new Set(rows.map((r) => r.name))]
  console.log(`Inserting ${uniqueCustomerNames.length} customers...`)
  const customersToInsert = uniqueCustomerNames.map((name) => ({ name }))
  const { data: insertedCustomers, error: custError } = await supabase.from('customers').insert(customersToInsert).select('id, name')
  if (custError) { console.error('Customer insert error:', custError); process.exit(1) }
  const customerMap = new Map(insertedCustomers.map((c) => [c.name, c.id]))
  console.log(`✓ ${insertedCustomers.length} customers inserted`)

  // --- Seed customer_plans ---
  const customerPlansToInsert = rows.map((r) => ({
    customer_id: customerMap.get(r.name),
    plan_id: planMap.get(r.plan),
    sim_count: r.count,
  })).filter((cp) => cp.customer_id && cp.plan_id)

  console.log(`Inserting ${customerPlansToInsert.length} customer-plan assignments...`)
  const { error: cpError } = await supabase.from('customer_plans').insert(customerPlansToInsert)
  if (cpError) { console.error('CustomerPlan insert error:', cpError); process.exit(1) }
  console.log(`✓ ${customerPlansToInsert.length} customer-plan assignments inserted`)

  // --- Seed monthly_records for 2026-04 snapshot ---
  // Aggregate total SIMs per customer across all plans
  const simTotals = new Map()
  for (const r of rows) {
    const custId = customerMap.get(r.name)
    if (custId) simTotals.set(custId, (simTotals.get(custId) ?? 0) + r.count)
  }

  const monthlyToInsert = [...simTotals.entries()].map(([customer_id, active_sims]) => ({
    customer_id,
    month: '2026-04',
    activations: 0,
    deactivations: 0,
    plan_changes: 0,
    active_sims,
    abf_amount: 0,
    revenue_realised: 0,
    commissioning_pending: 0,
    notes: 'Initial snapshot from M2M HR Data 09042026.xlsx',
  }))

  console.log(`Inserting ${monthlyToInsert.length} April 2026 snapshot records...`)
  const { error: mrError } = await supabase.from('monthly_records').insert(monthlyToInsert)
  if (mrError) { console.error('MonthlyRecord insert error:', mrError); process.exit(1) }
  console.log(`✓ ${monthlyToInsert.length} monthly records inserted`)

  console.log('\n✅ Seed complete!')
}

seed().catch(console.error)
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` scripts:
```json
"seed": "node scripts/seed.js"
```

- [ ] **Step 3: Run the seed script**

```bash
npm run seed
```

Expected output:
```
Inserting 19 plans...
✓ 19 plans inserted
Inserting 96 customers...
✓ 96 customers inserted
Inserting 195 customer-plan assignments...
✓ 195 customer-plan assignments inserted
Inserting 96 April 2026 snapshot records...
✓ 96 monthly records inserted

✅ Seed complete!
```

- [ ] **Step 4: Verify in the app**

1. Navigate to `http://localhost:3000/plans` — should show 19 plans
2. Navigate to `http://localhost:3000/customers` — should show 96 customers
3. Navigate to `http://localhost:3000` — Dashboard should show total SIMs count
4. Navigate to `http://localhost:3000/reports?month=2026-04` — should show all 96 customers with their SIM counts

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.js package.json
git commit -m "feat: add seed script to load Excel data into Supabase"
```

---

## Task 13: Deploy to Vercel

**Files:**
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Push all commits to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Connect repo to Vercel**

1. Go to https://vercel.com/new
2. Import repository `omnipushdigital-star/m2m`
3. Framework will be auto-detected as Next.js
4. Do **not** deploy yet — add env vars first

- [ ] **Step 3: Add environment variables in Vercel**

In Vercel project settings → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL = https://fvkiaiiuookighromliv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <your anon key from Supabase Dashboard → Project Settings → API>
```

Apply to: Production, Preview, Development.

- [ ] **Step 4: Deploy**

Click **Deploy**. Wait for build to complete (~2 minutes).

Expected: Build succeeds, deployment URL shown (e.g. `m2m-xxx.vercel.app`).

- [ ] **Step 5: Verify production deployment**

Open the deployment URL. Test:
1. `/plans` — 19 plans visible
2. `/customers` — 96 customers visible, search works
3. Click a customer → detail page loads with SIM count
4. `/reports?month=2026-04` — report table shows all customers
5. Click "Export to Excel" → downloads `.xlsx` file

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: finalize deployment config"
git push origin main
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 4 DB tables: plans, customers, customer_plans, monthly_records
- ✅ 5 pages: /, /customers, /customers/[id], /reports, /plans
- ✅ Add/Edit Customer form with all Lead-to-Bill fields (4 accordion sections)
- ✅ Monthly data entry form (manual, per customer per month)
- ✅ Monthly history table with edit/delete
- ✅ Dashboard: 4 summary cards, ABF trend chart, top 10 customers
- ✅ Monthly report with totals row and Excel export
- ✅ Customer plan assignment (multi-plan per customer)
- ✅ ABF in ₹ Cr throughout
- ✅ Seed from Excel (96 customers, 19 plans, April 2026 snapshot)
- ✅ Edit customer (name and all fields) from Customer Detail page
- ✅ No authentication
- ✅ Vercel deployment

**Type consistency verified:**
- `ReportRow` defined in `lib/export.ts` and used in `components/monthly-report-table.tsx` ✅
- `MonthlyRecord`, `Customer`, `CustomerPlan`, `Plan` used consistently across actions and components ✅
- `getSupabase()` factory used in all server files ✅
- `revalidatePath` called after every mutation ✅
