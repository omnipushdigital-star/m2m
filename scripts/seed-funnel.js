/**
 * Seed script: loads Stage 1 and Stage 4 funnel data from Excel into Supabase
 * Run: node scripts/seed-funnel.js
 *
 * Set CLEAR_FIRST = true to delete existing funnel_opportunities rows before seeding.
 */

const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const CLEAR_FIRST = true

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const FILE_STAGE4 = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM',
  'AGENDA MEETING APRIL 24', 'agenda data', 'stage 4 - March 2026.xls')

const FILE_STAGE1 = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM',
  'AGENDA MEETING APRIL 24', 'agenda data', 'STAGE 1 - March 26.xls')

// Convert Excel date serial → ISO date string (or return null)
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null
  // Excel epoch: Dec 30, 1899 (accounting for 1900 leap-year bug)
  const msPerDay = 86400000
  const excelEpoch = new Date(1899, 11, 30).getTime()
  const d = new Date(excelEpoch + serial * msPerDay)
  return d.toISOString().slice(0, 10)
}

function num(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function int(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

function str(v) {
  if (v === '' || v === null || v === undefined) return null
  return String(v).trim() || null
}

// ── Stage 4 parser ────────────────────────────────────────────────────────────
// Columns (0-indexed):
// 0  S.No.         1  Opp Id         2  Unit           3  City
// 4  Name of Customer  5  MSME       6  MSME ID        7  Business Type
// 8  Customer Type 9  Main Customer Category  10 Customer Category
// 11 Name of NAM   12 CP Name        13 Tender/Negotiation  14 Year
// 15 Week Number   16 Cluster        17 Name of Product  18 Quantity
// 19 Details       20 Base Tariff    21 After Discount  22 After Negotiation
// 23 PO Value      24 Revenue Realised  25 MovedToStage4 on  26 PO Date
// 27 PO Letter No  28 Additional Payment  29 Contract Period  30 Commissioned Qty
// 31 Billed Amount  32 Commissioned Status  33 Commissioned on  34 Vendor Name
function parseStage4(rows) {
  return rows.slice(1).filter(r => r[4]).map(r => ({
    funnel_stage:        4,
    sno:                 int(r[0]),
    opp_id:              int(r[1]),
    unit:                str(r[2]),
    city:                str(r[3]),
    customer_name:       str(r[4]),
    msme:                str(r[5]),
    msme_id:             str(r[6]),
    business_type:       str(r[7]),
    customer_type:       str(r[8]),
    main_category:       str(r[9]),
    customer_category:   str(r[10]),
    nam_name:            str(r[11]),
    cp_name:             str(r[12]),
    tender_negotiation:  str(r[13]),
    year:                int(r[14]),
    week_number:         int(r[15]),
    cluster_connectivity: str(r[16]),
    product_name:        str(r[17]),
    quantity:            int(r[18]),
    product_details:     str(r[19]),
    base_tariff:         num(r[20]),
    after_discount:      num(r[21]),
    after_negotiation:   num(r[22]),
    po_value:            num(r[23]),
    revenue_realised:    num(r[24]),
    moved_to_stage4_on:  excelDateToISO(r[25]),
    po_date:             str(r[26]),
    po_letter_number:    str(r[27]),
    additional_payment:  num(r[28]),
    contract_period:     int(r[29]),
    commissioned_qty:    int(r[30]),
    billed_amount:       num(r[31]),
    commissioned_status: str(r[32]),
    commissioned_on:     str(r[33]),
    vendor_name:         str(r[34]),
  }))
}

// ── Stage 1 parser ────────────────────────────────────────────────────────────
// Columns (0-indexed):
// 0  S.No.  1  Opp Id  2  Unit  3  City  4  Name of Customer
// 5  MSME   6  MSME ID  7  Business Type  8  Customer Type
// 9  Main Customer Category  10 Customer Category  11 Name of NAM
// 12 CP Name  13 Tender/Negotiation  14 Year  15 Week Number
// 16 Stage in Week4  17 Remarks4  18 Stage in Week3  19 Remarks3
// 20 Stage in Week2  21 Remarks2  22 Stage in Week1  23 Remarks1
// 24 Stage in Current week  25 Current Remarks
// 26 Cluster  27 Name of Product  28 Quantity  29 Details
// 30 Base Tariff  31 After Discount  32 After Negotiation  33 PO Value
// 34 Additional Payment  35 Commitment
function parseStage1(rows) {
  return rows.slice(1).filter(r => r[4]).map(r => ({
    funnel_stage:        1,
    sno:                 int(r[0]),
    opp_id:              int(r[1]),
    unit:                str(r[2]),
    city:                str(r[3]),
    customer_name:       str(r[4]),
    msme:                str(r[5]),
    msme_id:             str(r[6]),
    business_type:       str(r[7]),
    customer_type:       str(r[8]),
    main_category:       str(r[9]),
    customer_category:   str(r[10]),
    nam_name:            str(r[11]),
    cp_name:             str(r[12]),
    tender_negotiation:  str(r[13]),
    year:                int(r[14]),
    week_number:         int(r[15]),
    stage_week4:         int(r[16]),
    remarks_week4:       str(r[17]),
    stage_week3:         int(r[18]),
    remarks_week3:       str(r[19]),
    stage_week2:         int(r[20]),
    remarks_week2:       str(r[21]),
    stage_week1:         int(r[22]),
    remarks_week1:       str(r[23]),
    stage_current:       int(r[24]),
    remarks_current:     str(r[25]),
    cluster_connectivity: str(r[26]),
    product_name:        str(r[27]),
    quantity:            int(r[28]),
    product_details:     str(r[29]),
    base_tariff:         num(r[30]),
    after_discount:      num(r[31]),
    after_negotiation:   num(r[32]),
    po_value:            num(r[33]),
    additional_payment:  num(r[34]),
    commitment:          int(r[35]),
  }))
}

async function main() {
  console.log('\n====== Funnel Seed Script ======\n')

  // ── Read Excel files ──────────────────────────────────────────
  const wb4 = XLSX.readFile(FILE_STAGE4)
  const rows4 = XLSX.utils.sheet_to_json(wb4.Sheets[wb4.SheetNames[0]], { header: 1, defval: '' })
  const records4 = parseStage4(rows4)
  console.log(`Stage 4: ${records4.length} opportunities read`)

  const wb1 = XLSX.readFile(FILE_STAGE1)
  const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { header: 1, defval: '' })
  const records1 = parseStage1(rows1)
  console.log(`Stage 1: ${records1.length} opportunities read`)

  const all = [...records4, ...records1]
  console.log(`Total: ${all.length} records\n`)

  // ── Clear existing data ───────────────────────────────────────
  if (CLEAR_FIRST) {
    const { error: delErr } = await supabase.from('funnel_opportunities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (delErr) { console.error('Clear error:', delErr); process.exit(1) }
    console.log('Cleared existing funnel_opportunities rows')
  }

  // ── Insert in batches ─────────────────────────────────────────
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH)
    const { error } = await supabase.from('funnel_opportunities').insert(batch)
    if (error) { console.error(`Insert error at batch ${i}:`, error); process.exit(1) }
    inserted += batch.length
    process.stdout.write(`  Inserted ${inserted}/${all.length}\r`)
  }

  console.log(`\n\n✓ Done — ${inserted} records loaded into funnel_opportunities`)

  // ── Quick summary ─────────────────────────────────────────────
  const { data: namSummary } = await supabase
    .from('funnel_opportunities')
    .select('nam_name, funnel_stage')

  const summary = {}
  for (const r of namSummary || []) {
    const k = r.nam_name || 'Unknown'
    if (!summary[k]) summary[k] = { stage1: 0, stage4: 0 }
    if (r.funnel_stage === 1) summary[k].stage1++
    else if (r.funnel_stage === 4) summary[k].stage4++
  }
  console.log('\nNAM-wise breakdown:')
  for (const [nam, c] of Object.entries(summary)) {
    console.log(`  ${nam.padEnd(20)} Stage 1: ${c.stage1}  Stage 4: ${c.stage4}`)
  }
}

main().catch(console.error)
