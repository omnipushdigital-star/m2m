-- NAM Registry Table
-- Canonical list of NAMs (National Account Managers)
-- This is the foundation for per-NAM RBAC when individual logins are created.
--
-- RBAC flow (future):
--   1. Create Supabase Auth user for NAM with email = nams.email
--   2. Set user_metadata: { role: 'nam', nam_name: nams.name }
--   3. Add RLS policies to tables:
--        customers:             WHERE nam_name = auth.jwt()->'user_metadata'->>'nam_name'
--        funnel_opportunities:  WHERE nam_name = auth.jwt()->'user_metadata'->>'nam_name'
--        monthly_records:       WHERE customer_id IN (SELECT id FROM customers WHERE nam_name = ...)
--        sim_customer_summary:  WHERE customer_id IN (SELECT id FROM customers WHERE nam_name = ...)

CREATE TABLE IF NOT EXISTS nams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name        TEXT NOT NULL UNIQUE,   -- must match nam_name values in customers + funnel_opportunities
  display_name TEXT,                  -- full/formal name if different from name key
  email       TEXT UNIQUE,            -- future: maps to Supabase Auth user email
  phone       TEXT,
  designation TEXT DEFAULT 'NAM',     -- NAM / Senior NAM / Team Lead / etc.

  -- Auth readiness
  user_id     UUID UNIQUE,            -- populated when Supabase Auth user is created
  role        TEXT DEFAULT 'nam',     -- 'nam' | 'admin' | 'viewer'
  active      BOOLEAN DEFAULT true,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: admins can manage, NAMs can read their own record
ALTER TABLE nams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON nams FOR ALL USING (true) WITH CHECK (true);

-- Seed from existing unique nam_name values in customers table
-- Run this AFTER the table is created to auto-populate from live data:
--
--   INSERT INTO nams (name)
--   SELECT DISTINCT nam_name FROM customers WHERE nam_name IS NOT NULL
--   ON CONFLICT (name) DO NOTHING;
--
--   INSERT INTO nams (name)
--   SELECT DISTINCT nam_name FROM funnel_opportunities WHERE nam_name IS NOT NULL
--   ON CONFLICT (name) DO NOTHING;
