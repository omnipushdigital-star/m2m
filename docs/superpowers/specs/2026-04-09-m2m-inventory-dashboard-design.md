# M2M Inventory & Billing Dashboard — Design Spec
**Date:** 2026-04-09
**Stack:** Next.js 14 (App Router), TypeScript, Supabase, Shadcn/UI, Tailwind CSS
**Deployment:** Vercel
**Repo:** https://github.com/omnipushdigital-star/m2m
**Database:** Supabase project `fvkiaiiuookighromliv`

---

## 1. Purpose

A single-user local dashboard to manage M2M SIM inventory and billing data for customers who have been issued M2M SIMs on different plans. The system tracks monthly activations, deactivations, plan changes, and ABF (Amount Billed For) per customer, and generates monthly reports.

---

## 2. Data Model

### `plans`
M2M plan catalog. Pre-seeded from 18 plans in `M2M HR Data 09042026.xlsx`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto |
| plan_name | text | e.g. "Plan 8 M2M Bootstrap" |
| data_limit | text | e.g. "100 MB" |
| sms_limit | text | e.g. "200 SMS" |
| created_at | timestamptz | auto |

### `customers`
One row per customer PO. All fields from Lead-to-Bill report.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto |
| opp_id | text | Opportunity ID |
| s_no | integer | Serial number |
| unit | text | e.g. "GGN" |
| city | text | e.g. "GURGAON" |
| name | text | Customer name |
| msme | text | |
| msme_id | text | |
| business_type | text | NEW / NEW EXIST / RENEWAL |
| customer_type | text | PLATINUM / OTHERS |
| main_category | text | PRIVATE / GOVT / PSU |
| category | text | SV / MIN / ITES / MFG / LOG / HOS / OTH |
| nam_name | text | Name of Account Manager |
| cp_name | text | Channel Partner name |
| tender_negotiation | text | Negotiation / Port-in |
| year | integer | |
| week_number | integer | |
| cluster | text | |
| product_name | text | e.g. "IoT/M2M e-SIMs (EMERGING)" |
| quantity | integer | Committed quantity from PO |
| details | text | Product details description |
| base_tariff | numeric | |
| after_discount | numeric | |
| after_negotiation | numeric | |
| po_value | numeric | |
| revenue_realised | numeric | |
| moved_to_stage4_on | date | |
| po_date | date | |
| po_letter_number | text | |
| additional_payment | numeric | |
| contract_period | integer | In years |
| commissioned_qty | integer | |
| billed_amount | numeric | |
| commissioned_status | text | Full / Nil / partial |
| commissioned_on | date | |
| vendor_name | text | e.g. "BSNL" |
| annualized_value | numeric | |
| billing_cycle | text | Monthly / Quarterly / Annually |
| qty_commissioned | integer | |
| commissioning_pending | integer | |
| abf_generated | numeric | |
| reason_for_pendancy | text | |
| product_vertical | text | CM / EB / CFA |
| created_at | timestamptz | auto |

### `customer_plans`
Current plan assignments per customer. A customer can have SIMs on multiple plans.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto |
| customer_id | uuid FK → customers.id | |
| plan_id | uuid FK → plans.id | |
| sim_count | integer | Current active SIMs on this plan |
| created_at | timestamptz | auto |

### `monthly_records`
One row per customer per month. Manually entered.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto |
| customer_id | uuid FK → customers.id | |
| month | text | Format: YYYY-MM (e.g. "2026-04") |
| activations | integer | New SIMs activated this month |
| deactivations | integer | SIMs deactivated this month |
| plan_changes | integer | SIMs that changed plan |
| active_sims | integer | Total active SIMs at end of month |
| abf_amount | numeric | Amount Billed For (₹ crores), manually entered |
| revenue_realised | numeric | Revenue realised this month |
| commissioning_pending | integer | SIMs still pending commissioning |
| notes | text | Any remarks |
| created_at | timestamptz | auto |

**Constraint:** unique(customer_id, month) — prevents duplicate entries.

---

## 3. Pages & Navigation

Top navigation bar with links to all 5 sections.

### `GET /` — Dashboard Overview
- Summary cards:
  - Total Customers
  - Total Active SIMs (sum of latest monthly_record.active_sims per customer)
  - Total ABF This Month (sum of current month's abf_amount)
  - Total Commissioning Pending
- Bar chart: Month-wise ABF trend (last 6 months, all customers combined)
- Table: Top 10 customers by active SIMs

### `GET /customers` — Customer List
- Searchable (by name), sortable data table
- Columns: Name | City | NAM | Plan(s) | Commissioned Qty | Active SIMs | ABF Last Month | Product Vertical
- "Add New Customer" button → opens full Lead-to-Bill form in a dialog/sheet

### `GET /customers/[id]` — Customer Detail
- Customer info card (collapsible sections: Basic Info, PO Details, Tariff, Commissioning)
- Plan assignment section: which plans assigned + current SIM count per plan (editable)
- Month-by-month progress table:
  - Columns: Month | Activations | Deactivations | Plan Changes | Active SIMs | ABF (₹ Cr) | Revenue (₹ Cr) | Pending | Notes | Actions
  - Sorted descending by month
- "Add Monthly Entry" button → form dialog to enter data for a new month

### `GET /reports` — Monthly Report
- Month selector (dropdown, defaults to current month)
- Report table: all customers that have a record for the selected month
  - Columns: Customer | NAM | Activations | Deactivations | Plan Changes | Active SIMs | ABF (₹ Cr) | Revenue (₹ Cr) | Pending
  - Totals row at bottom
- "Export to Excel" button → downloads `.xlsx` file using the `xlsx` package

### `GET /plans` — Plan Management
- Table of all plans (pre-seeded from Excel)
- Add new plan button
- Edit/delete existing plans

---

## 4. Key Flows

### Adding a New Customer
1. Click "Add New Customer" on `/customers`
2. Full form opens (grouped: Basic Info → PO Details → Tariff → Commissioning)
3. On save: row inserted into `customers` table
4. Redirect to `/customers/[id]` where user can assign plans

### Editing a Customer
1. Go to `/customers/[id]`
2. Click "Edit" button on the customer info card
3. Same form as Add New Customer, pre-filled with existing data
4. All fields editable including name (for fixing truncated names from seed data)
5. On save: `customers` row updated

### Monthly Data Entry
1. Go to `/customers/[id]`
2. Click "Add Monthly Entry"
3. Form opens, pre-filled with current month
4. Enter: Activations, Deactivations, Plan Changes, Active SIMs, ABF Amount, Revenue Realised, Commissioning Pending, Notes
5. On save: row inserted into `monthly_records` with unique(customer_id, month) constraint
6. Table updates immediately

### Monthly Report Generation
1. Go to `/reports`
2. Select month
3. Table populates from `monthly_records` joined with `customers`
4. Click "Export to Excel" → `.xlsx` file downloaded with all rows + totals

### Initial Data Seed
- 18 plans from `M2M HR Data 09042026.xlsx` seeded into `plans` table
- 96 customers from the Excel seeded into `customers` table (best-effort name matching)
- Their April 2026 SIM counts seeded as `customer_plans` entries
- A seed script (`scripts/seed.js`) handles this using the `xlsx` + `@supabase/supabase-js` packages

---

## 5. Technical Architecture

```
/app
  layout.tsx          — root layout with nav bar
  page.tsx            — Dashboard
  /customers
    page.tsx          — Customer list
    [id]/page.tsx     — Customer detail
  /reports
    page.tsx          — Monthly report
  /plans
    page.tsx          — Plan management

/components
  /ui                 — Shadcn/UI components
  customer-form.tsx   — Add/edit customer form
  monthly-entry-form.tsx
  monthly-report-table.tsx
  dashboard-cards.tsx
  abf-chart.tsx

/lib
  supabase.ts         — Supabase server + client instances
  types.ts            — TypeScript types for all DB tables
  export.ts           — Excel export using xlsx

/scripts
  seed.js             — Seeds plans + customers from Excel file
```

**Data fetching:** Server Components fetch directly from Supabase using the server client. Forms use Server Actions to insert/update data.

**No authentication** — public access, single user.

---

## 6. Initial Seed Data

From `M2M HR Data 09042026.xlsx`:
- **18 plans** → `plans` table
- **96 customers** → `customers` table (name seeded as-is from Excel, may be truncated — name field is editable from Customer Detail page; remaining fields filled in manually or left null)
- **SIM counts** → `customer_plans` table (customer_id, plan_id, sim_count)
- **April 2026 snapshot** → one `monthly_records` row per customer for `2026-04` with active_sims from Excel; all other fields (activations, deactivations, ABF) left as 0/null pending manual entry

---

## 7. Out of Scope

- User authentication / login
- Real-time notifications
- Excel import for ongoing monthly data (all entry is manual via forms)
- Multi-unit support (fixed to GGN/Gurgaon for now)
