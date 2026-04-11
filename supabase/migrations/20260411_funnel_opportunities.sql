-- Sales Funnel Opportunities table
-- Covers all stages; stage 1 = active pipeline, stage 4 = PO received/closed

CREATE TABLE IF NOT EXISTS funnel_opportunities (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Identity ────────────────────────────────────────────────
  sno                  integer,
  opp_id               integer,
  unit                 text,
  city                 text,
  customer_name        text NOT NULL,
  msme                 text,
  msme_id              text,

  -- ── Classification ──────────────────────────────────────────
  business_type        text,           -- NEW / RENEWAL / NEW EXIST / NEW RENEWAL
  customer_type        text,           -- PLATINUM / OTHERS
  main_category        text,           -- PRIVATE / GOVT / PSU
  customer_category    text,           -- SV / MFG / OTH / MIN / etc.
  nam_name             text,           -- Name of NAM (SUDHANSHU / RAHUL RAWAT / etc.)
  cp_name              text,
  tender_negotiation   text,           -- Negotiation / Port-in / Tender

  -- ── Timing ──────────────────────────────────────────────────
  year                 integer,
  week_number          integer,

  -- ── Product ─────────────────────────────────────────────────
  cluster_connectivity text,
  product_name         text,
  quantity             bigint,
  product_details      text,

  -- ── Financials (₹ Cr) ───────────────────────────────────────
  base_tariff          numeric(12,5),
  after_discount       numeric(12,5),
  after_negotiation    numeric(12,5),
  po_value             numeric(12,5),
  additional_payment   numeric(12,5),
  revenue_realised     numeric(12,5),

  -- ── Stage ───────────────────────────────────────────────────
  funnel_stage         integer NOT NULL DEFAULT 1,  -- 1 = pipeline, 4 = PO received

  -- ── Stage 1: weekly progress tracking ───────────────────────
  stage_week4          integer,
  remarks_week4        text,
  stage_week3          integer,
  remarks_week3        text,
  stage_week2          integer,
  remarks_week2        text,
  stage_week1          integer,
  remarks_week1        text,
  stage_current        integer,
  remarks_current      text,
  commitment           integer,

  -- ── Stage 4: PO / commissioning details ─────────────────────
  moved_to_stage4_on   date,
  po_date              text,
  po_letter_number     text,
  contract_period      integer,
  commissioned_qty     bigint,
  billed_amount        numeric(12,5),
  commissioned_status  text,
  commissioned_on      text,
  vendor_name          text,

  -- ── Metadata ────────────────────────────────────────────────
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- Index for quick NAM-level filtering
CREATE INDEX IF NOT EXISTS idx_funnel_nam       ON funnel_opportunities (nam_name);
CREATE INDEX IF NOT EXISTS idx_funnel_stage     ON funnel_opportunities (funnel_stage);
CREATE INDEX IF NOT EXISTS idx_funnel_category  ON funnel_opportunities (main_category);
CREATE INDEX IF NOT EXISTS idx_funnel_customer  ON funnel_opportunities (customer_name);

-- Row Level Security (open for service role, same pattern as existing tables)
ALTER TABLE funnel_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON funnel_opportunities FOR ALL USING (true) WITH CHECK (true);
