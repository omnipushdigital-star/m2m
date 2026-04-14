-- Add composite index for fast finalize queries
CREATE INDEX IF NOT EXISTS sim_inv_status_month_idx
  ON sim_inventory(status, last_seen_month);

-- RPC function: marks deactivated SIMs entirely inside PostgreSQL
-- Avoids REST layer statement timeout on large tables
CREATE OR REPLACE FUNCTION finalize_sim_upload(p_month TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE sim_inventory
     SET status     = 'deleted',
         updated_at = NOW()
   WHERE status           = 'active'
     AND last_seen_month != p_month;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
