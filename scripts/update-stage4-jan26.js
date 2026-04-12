// Re-seeds Stage 4 funnel_opportunities from GGN_Lead to Bill_14012026.xlsx
// Run: node scripts/update-stage4-jan26.js

const XLSX     = require('xlsx')
const path     = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL     = 'https://fvkiaiiuookighromliv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a2lhaWl1b29raWdocm9tbGl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY5NTU5NywiZXhwIjoyMDkxMjcxNTk3fQ.CZpV33W8sfb8GZniTH-pclBSkagN-PXN1AUbT1mYAcI'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const FILE = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM', 'AGENDA MEETING APRIL 24', 'agenda data', 'GGN_Lead to Bill_14012026.xlsx')

const MON = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' }

function parseDate(d) {
  if (!d || d === '') return null
  const m = String(d).match(/(\d{1,2})-([A-Z]{3})-(\d{2,4})/)
  if (!m) return null
  const yr = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${yr}-${MON[m[2]]}-${String(m[1]).padStart(2,'0')}`
}

function num(v)  { const n = parseFloat(v); return isNaN(n) ? null : n }
function int(v)  { const n = parseInt(v);   return isNaN(n) ? null : n }
function str(v)  { const s = String(v||'').trim(); return s || null }

async function main() {
  // ── Parse Excel ───────────────────────────────────────────────────────────
  console.log('📊  Reading Excel (Total sheet)...')
  const wb   = XLSX.readFile(FILE)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Total'], { header: 1, defval: '' })

  // Header row (row 0):
  // 0:S.No. 1:OppId 2:Unit 3:City 4:Customer 5:MSME 6:MSME_ID 7:BizType 8:CustType
  // 9:MainCategory 10:CustCategory 11:NAM 12:CP 13:Tender 14:Year 15:Week 16:Cluster
  // 17:Product 18:Qty 19:Details 20:BaseTariff 21:AfterDisc 22:AfterNego 23:POValue
  // 24:RevRealised 25:MovedToStage4 26:PODate 27:POLetterNo 28:AdditionalPay
  // 29:ContractPeriod 30:CommissiondQty 31:BilledAmt 32:CommissionedStatus
  // 33:CommissionedOn 34:VendorName 35:AnnualizedValue 36:BillingCycle
  // 37:QtyCommissioned 38:CommissioningPending 39:ABFGenerated 40:ReasonPendancy 41:ProductVertical

  const records = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[1] || typeof r[1] !== 'number') continue   // skip header / summary rows

    records.push({
      sno:                int(r[0]),
      opp_id:             int(r[1]),
      unit:               str(r[2]) || 'GGN',
      city:               str(r[3]),
      customer_name:      str(r[4]),
      msme:               str(r[5]),
      msme_id:            str(r[6]),
      business_type:      str(r[7]),
      customer_type:      str(r[8]),
      main_category:      str(r[9]),
      customer_category:  str(r[10]),
      nam_name:           str(r[11]),
      cp_name:            str(r[12]),
      tender_negotiation: str(r[13]),
      year:               int(r[14]),
      week_number:        int(r[15]),
      cluster_connectivity: str(r[16]),
      product_name:       str(r[17]),
      quantity:           int(r[18]),
      product_details:    str(r[19]),
      base_tariff:        num(r[20]),
      after_discount:     num(r[21]),
      after_negotiation:  num(r[22]),
      po_value:           num(r[23]),
      revenue_realised:   num(r[24]),
      po_date:            parseDate(r[26]),
      po_letter_number:   str(r[27]),
      additional_payment: num(r[28]),
      contract_period:    int(r[29]),
      billed_amount:      num(r[31]),
      commissioned_status: str(r[32]),
      commissioned_on:    str(r[33]),
      vendor_name:        str(r[34]),
      annualized_value:   num(r[35]),    // NEW
      billing_cycle:      str(r[36]),    // NEW
      commissioned_qty:   int(r[37]),    // "Qty Commissioned" - col 37
      abf_generated_total: num(r[39]),   // NEW
      remarks_current:    str(r[40]),    // Reason for pendancy
      product_vertical:   str(r[41]),    // NEW  CM/EB/CFA
      funnel_stage:       4,
    })
  }
  console.log(`   Parsed ${records.length} records`)

  // ── Delete existing Stage 4 ───────────────────────────────────────────────
  console.log('🗑️   Clearing existing Stage 4 records...')
  const { error: delErr } = await supabase.from('funnel_opportunities').delete().eq('funnel_stage', 4)
  if (delErr) { console.error('Delete error:', delErr.message); process.exit(1) }

  // ── Insert ────────────────────────────────────────────────────────────────
  console.log('📥  Inserting records...')
  const { error: insErr } = await supabase.from('funnel_opportunities').insert(records)
  if (insErr) { console.error('Insert error:', insErr.message); process.exit(1) }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalPO  = records.reduce((s, r) => s + (r.po_value || 0), 0)
  const totalABF = records.reduce((s, r) => s + (r.abf_generated_total || 0), 0)
  console.log(`\n✅  Done! ${records.length} Stage 4 opportunities loaded.`)
  console.log(`   Total PO Value:       ₹${totalPO.toFixed(2)} Cr`)
  console.log(`   Total ABF Generated:  ₹${totalABF.toFixed(2)} Cr`)

  // Multi-opp customers
  const custOpps = {}
  for (const r of records) {
    if (!custOpps[r.customer_name]) custOpps[r.customer_name] = []
    custOpps[r.customer_name].push(r)
  }
  const multiOpp = Object.entries(custOpps).filter(([, v]) => v.length > 1)
  if (multiOpp.length) {
    console.log('\n📋  Customers with multiple POs:')
    for (const [name, opps] of multiOpp) {
      const totalSims = opps.reduce((s, o) => s + (o.commissioned_qty || 0), 0)
      const totalAbf  = opps.reduce((s, o) => s + (o.abf_generated_total || 0), 0)
      console.log(`\n   ${name}: ${opps.length} POs | ${totalSims.toLocaleString()} SIMs | ₹${totalAbf.toFixed(3)} Cr ABF`)
      for (const o of opps) {
        const monthly = o.annualized_value ? (o.annualized_value / 12).toFixed(3) : '—'
        console.log(`      Opp ${o.opp_id} | PO ${o.po_date} | ${(o.commissioned_qty||0).toLocaleString()} SIMs | ABF ₹${(o.abf_generated_total||0).toFixed(3)} Cr | Monthly ~₹${monthly} Cr`)
      }
    }
  }
}

main().catch(console.error)
