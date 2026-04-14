-- ── Full SIM inventory — current state only, no history ──────────────────────
-- ~1.6M rows, constant size (upsert on IMSI, never grows month-over-month)
-- Active SIM = last_seen_month = latest upload month (no status column needed)
-- Run in Supabase SQL Editor

-- Drop previous attempt tables if they exist
DROP TABLE IF EXISTS sim_customer_summary CASCADE;
DROP TABLE IF EXISTS sim_change_log       CASCADE;
DROP TABLE IF EXISTS sim_inventory        CASCADE;

-- One row per IMSI — upserted every upload
CREATE TABLE IF NOT EXISTS sim_inventory (
  imsi              TEXT PRIMARY KEY,
  caf_no            TEXT,
  sim_no            TEXT,
  customer_name_raw TEXT,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  match_status      TEXT NOT NULL DEFAULT 'pending',  -- 'matched' | 'pending'
  service_center    TEXT,
  plan              TEXT,
  apn               TEXT,
  first_seen_month  TEXT NOT NULL,   -- YYYY-MM when first seen
  last_seen_month   TEXT NOT NULL,   -- YYYY-MM of latest upload — source of truth for active status
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS sim_inv_month_idx    ON sim_inventory(last_seen_month);
CREATE INDEX IF NOT EXISTS sim_inv_customer_idx ON sim_inventory(customer_id);
CREATE INDEX IF NOT EXISTS sim_inv_match_idx    ON sim_inventory(match_status);
CREATE INDEX IF NOT EXISTS sim_inv_custname_idx ON sim_inventory(customer_name_raw);
CREATE INDEX IF NOT EXISTS sim_inv_plan_idx     ON sim_inventory(plan);

-- Allow browser (anon key) to read and write — internal admin tool
ALTER TABLE sim_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON sim_inventory FOR ALL USING (true) WITH CHECK (true);

-- customer_caf_mapping already exists from 20260413 migration — leave it
