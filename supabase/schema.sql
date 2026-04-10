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
