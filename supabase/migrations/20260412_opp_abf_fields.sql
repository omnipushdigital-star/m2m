-- Add opportunity-level ABF tracking fields
ALTER TABLE funnel_opportunities
  ADD COLUMN IF NOT EXISTS annualized_value   DECIMAL(14,4),   -- ₹ Cr / year from this PO
  ADD COLUMN IF NOT EXISTS abf_generated_total DECIMAL(14,4),  -- Cumulative ABF ₹ Cr since PO date
  ADD COLUMN IF NOT EXISTS product_vertical   VARCHAR(10),     -- CM / EB / CFA
  ADD COLUMN IF NOT EXISTS billing_cycle      VARCHAR(20),     -- Monthly / Quarterly / Annually
  ADD COLUMN IF NOT EXISTS revenue_realised   DECIMAL(14,4);   -- Revenue collected from this lead
