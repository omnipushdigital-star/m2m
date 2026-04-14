-- ── Lightweight SIM summary tables (R2 stores raw file, Supabase stores summaries)
-- ~38 rows per upload — well within free tier limits
-- Run in Supabase SQL Editor

DROP TABLE IF EXISTS sim_inventory        CASCADE;
DROP TABLE IF EXISTS sim_customer_summary CASCADE;
DROP TABLE IF EXISTS sim_change_log       CASCADE;

-- Per-customer monthly summary (~38 rows per upload)
CREATE TABLE IF NOT EXISTS sim_customer_summary (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name_raw TEXT    NOT NULL,
  customer_id       UUID    REFERENCES customers(id) ON DELETE SET NULL,
  match_status      TEXT    NOT NULL DEFAULT 'pending',
  upload_month      TEXT    NOT NULL,
  total_sims        INTEGER NOT NULL DEFAULT 0,
  by_plan           JSONB,
  by_apn            JSONB,
  by_service_center JSONB,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sim_summary_unique_idx  ON sim_customer_summary(customer_name_raw, upload_month);
CREATE INDEX        IF NOT EXISTS sim_summary_month_idx   ON sim_customer_summary(upload_month);
CREATE INDEX        IF NOT EXISTS sim_summary_custid_idx  ON sim_customer_summary(customer_id);
CREATE INDEX        IF NOT EXISTS sim_summary_match_idx   ON sim_customer_summary(match_status);

ALTER TABLE sim_customer_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON sim_customer_summary FOR ALL USING (true) WITH CHECK (true);

-- Monthly change log per customer
CREATE TABLE IF NOT EXISTS sim_change_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_month      TEXT    NOT NULL,
  customer_name_raw TEXT    NOT NULL,
  customer_id       UUID    REFERENCES customers(id) ON DELETE SET NULL,
  total_sims        INTEGER NOT NULL DEFAULT 0,
  prev_total_sims   INTEGER,
  net_change        INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sim_changelog_unique_idx ON sim_change_log(customer_name_raw, upload_month);
CREATE INDEX        IF NOT EXISTS sim_changelog_month_idx  ON sim_change_log(upload_month);

ALTER TABLE sim_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON sim_change_log FOR ALL USING (true) WITH CHECK (true);
