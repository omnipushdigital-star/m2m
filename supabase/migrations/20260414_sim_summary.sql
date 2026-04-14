-- ── Lightweight SIM summary tables (free-tier friendly) ──────────────────────
-- Replaces sim_inventory (1.6M rows) with per-customer monthly summaries (~38 rows/upload)
-- Run in Supabase SQL Editor

-- Drop the heavy per-IMSI tables if they exist (they were just created, likely empty)
DROP TABLE IF EXISTS sim_history;
DROP TABLE IF EXISTS sim_inventory;

-- Per-customer monthly SIM summary (38 customers × 12 months = ~456 rows/year)
CREATE TABLE IF NOT EXISTS sim_customer_summary (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name_raw TEXT NOT NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  match_status     TEXT NOT NULL DEFAULT 'pending', -- 'matched' | 'pending'
  upload_month     TEXT NOT NULL,   -- YYYY-MM
  total_sims       INTEGER NOT NULL DEFAULT 0,
  by_plan          JSONB,   -- {"Plan A": 1200, "Plan B": 800}
  by_apn           JSONB,   -- {"apn1.bsnl": 1500, "apn2.bsnl": 500}
  by_service_center JSONB,  -- {"Gurgaon": 900, "Delhi": 1100}
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sim_summary_cust_month_idx
  ON sim_customer_summary(customer_name_raw, upload_month);
CREATE INDEX IF NOT EXISTS sim_summary_month_idx    ON sim_customer_summary(upload_month);
CREATE INDEX IF NOT EXISTS sim_summary_custid_idx   ON sim_customer_summary(customer_id);
CREATE INDEX IF NOT EXISTS sim_summary_match_idx    ON sim_customer_summary(match_status);

-- Month-level change log — net counts per customer, not individual IMSIs
CREATE TABLE IF NOT EXISTS sim_change_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_month       TEXT NOT NULL,   -- YYYY-MM
  customer_name_raw  TEXT NOT NULL,
  customer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_sims         INTEGER NOT NULL DEFAULT 0,
  prev_total_sims    INTEGER,         -- NULL on first upload
  net_change         INTEGER,         -- total_sims - prev_total_sims
  new_activations    INTEGER DEFAULT 0,
  deactivations      INTEGER DEFAULT 0,
  plan_changes       INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sim_changelog_cust_month_idx
  ON sim_change_log(customer_name_raw, upload_month);
CREATE INDEX IF NOT EXISTS sim_changelog_month_idx ON sim_change_log(upload_month);

-- Manual customer name overrides (keep this — it's tiny)
-- customer_caf_mapping already exists from previous migration, leave it as-is
