-- ── SIM Inventory tables ──────────────────────────────────────────────────────
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/fvkiaiiuookighromliv/sql/new

-- Current state of every SIM (one row per IMSI)
CREATE TABLE IF NOT EXISTS sim_inventory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id      TEXT,
  caf_no           TEXT NOT NULL,
  imsi             TEXT NOT NULL,
  sim_no           TEXT,
  customer_name_raw TEXT,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_center   TEXT,
  plan             TEXT,
  apn              TEXT,
  status           TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'deleted'
  match_status     TEXT NOT NULL DEFAULT 'unmatched', -- 'matched' | 'pending' | 'unmatched'
  first_seen_month TEXT NOT NULL,   -- YYYY-MM
  last_seen_month  TEXT NOT NULL,   -- YYYY-MM
  deleted_month    TEXT,            -- YYYY-MM when dropped from file
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sim_inventory_imsi_idx   ON sim_inventory(imsi);
CREATE INDEX        IF NOT EXISTS sim_inventory_caf_idx    ON sim_inventory(caf_no);
CREATE INDEX        IF NOT EXISTS sim_inventory_cust_idx   ON sim_inventory(customer_id);
CREATE INDEX        IF NOT EXISTS sim_inventory_status_idx ON sim_inventory(status);
CREATE INDEX        IF NOT EXISTS sim_inventory_month_idx  ON sim_inventory(last_seen_month);
CREATE INDEX        IF NOT EXISTS sim_inventory_match_idx  ON sim_inventory(match_status);

-- Change log — one row per change event per IMSI
CREATE TABLE IF NOT EXISTS sim_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imsi        TEXT NOT NULL,
  change_type TEXT NOT NULL,  -- 'activated' | 'plan_changed' | 'apn_changed' | 'deactivated'
  old_plan    TEXT,
  new_plan    TEXT,
  old_apn     TEXT,
  new_apn     TEXT,
  change_month TEXT NOT NULL, -- YYYY-MM
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sim_history_imsi_idx  ON sim_history(imsi);
CREATE INDEX IF NOT EXISTS sim_history_month_idx ON sim_history(change_month);
CREATE INDEX IF NOT EXISTS sim_history_type_idx  ON sim_history(change_type);

-- Manual customer name overrides (CAF No + raw name → customer_id)
CREATE TABLE IF NOT EXISTS customer_caf_mapping (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caf_no           TEXT NOT NULL,
  customer_name_raw TEXT NOT NULL,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS caf_mapping_unique_idx
  ON customer_caf_mapping(caf_no, customer_name_raw);
