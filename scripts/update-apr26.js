/**
 * Update April 2026 monthly records with actual billing data
 * CMO → abf_amount (÷ 1 Cr), LPR → revenue_realised (÷ 1 Cr)
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CR = 1e7

// [canonical DB name, CMO in ₹, LPR in ₹]
const APR26 = [
  ['11TECHSQUARE LIMITED',                         929208,  844983],
  ['APM GROUP PRIVATE LIMITED',                    198664,  543],
  ['CONTAINE TECHNOLOGIES LIMITED',                332619,  0],
  ['CRG SERVICES PRIVATE LIMITED',                 29480,   470],
  ['GTROPY PRIVATE LIMITED',                       325242,  325348],
  ['INDIA POST PAYMENTS BANK',                     0,       0],
  ['JIO THINGS LIMITED',                           156,     0],
  ['LYNKIT SOLUTIONS PRIVATE LIMITED',             16714,   16714],
  ['NARCOTICS CONTROL BUREAU',                     108114,  101508],
  ['ONE STACK SOLUTION PRIVATE LIMITED',           0,       0],
  ['SOURCINGBRAINS PRIVATE LIMITED',               582212,  651995],
  ['TAISYS PRIVATE LIMITED',                       13962095, 12698903],
  ['TATA COLLABORATION SERVICES PRIVATEE LIMITED', 1990192, 1960919],
  ['TRANSECUR TELEMATICS PRIVATE LIMITED',         149870,  149888],
  ['TRAXSMART LIMITED',                            114716,  0],
  ['VDK ENGINEERING PRIVATE LIMITED',              0,       0],
  ['VENERA PRIVATE LIMITED',                       397380,  406772],
  ['VODAFONE TECHNOLOGY SOLUTIONS LIMITED',        2292992, 3334519],
  ['VOLTY SOLUTIONS PRIVATE LIMITED',              3135608, 0],
  ['WEBLEO IOT TECHNOLOGIES PRIVATE LIMITED',      0,       0],
  ['WHEELSEYE PRIVATE LIMITED',                    584533,  598704],
  ['MSDE',                                         2000000, 0],
]

async function main() {
  console.log('\n====== Update April 2026 Billing ======\n')

  // Fetch customer id map
  const { data: customers } = await sb.from('customers').select('id, name')
  const nameToId = new Map(customers.map(c => [c.name.toUpperCase(), c.id]))

  let updated = 0, skipped = 0

  for (const [name, cmo, lpr] of APR26) {
    const custId = nameToId.get(name.toUpperCase())
    if (!custId) { console.warn(`  ⚠ No customer found: ${name}`); skipped++; continue }

    const { error } = await sb
      .from('monthly_records')
      .upsert({
        customer_id:      custId,
        month:            '2026-04',
        abf_amount:       cmo / CR,
        revenue_realised: lpr / CR,
        activations:      0,
        deactivations:    0,
        plan_changes:     0,
        commissioning_pending: 0,
        notes: 'April 2026 billing update',
      }, { onConflict: 'customer_id,month', ignoreDuplicates: false })

    if (error) { console.error(`  ✕ ${name}:`, error.message) }
    else { console.log(`  ✓ ${name}  CMO: ₹${cmo.toLocaleString('en-IN')}  LPR: ₹${lpr.toLocaleString('en-IN')}`); updated++ }
  }

  console.log(`\nDone — ${updated} updated, ${skipped} skipped\n`)
}

main().catch(console.error)
