/**
 * Seed billing data: Apr 2025 – Mar 2026 (CMO & LPR per customer per month)
 * CMO (Curr Month Outstanding) → abf_amount  (stored in ₹ Cr)
 * LPR (Last Payment Received)  → revenue_realised (stored in ₹ Cr)
 *
 * Run: node scripts/seed-billing.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CR = 1e7  // divide rupees by 1 Cr to store in ₹ Cr

// ── Months (newest first in source, we reorder as YYYY-MM) ──────────────
const MONTHS = [
  '2025-04','2025-05','2025-06','2025-07','2025-08','2025-09',
  '2025-10','2025-11','2025-12','2026-01','2026-02','2026-03',
]

// ── Billing data: each row = [customerKey, vertical, product, ...24 values]
// 24 values = 12 months × [CMO, LPR], ordered Apr-25 → Mar-26
const RAW = [
  // key,                         vertical  product    Apr25_cmo  Apr25_lpr  May25_cmo  May25_lpr  Jun25_cmo  Jun25_lpr  Jul25_cmo  Jul25_lpr  Aug25_cmo  Aug25_lpr  Sep25_cmo  Sep25_lpr  Oct25_cmo  Oct25_lpr  Nov25_cmo  Nov25_lpr  Dec25_cmo  Dec25_lpr  Jan26_cmo  Jan26_lpr  Feb26_cmo  Feb26_lpr  Mar26_cmo  Mar26_lpr
  ['11TECHSQUARE',          'CM', 'M2M',    383751,283162,  436083,0,        502500,703191,  522122,0,        574849,1460707, 595211,0,        595211,0,        687561,654343,  725663,0,        765160,687561,  857410,101240,  847888,2246992],
  ['APM_GROUP',             'CM', 'M2M',    48535,0,        48505,0,         48517,0,        180068,0,        146286,270516,  145010,179830,  145010,179830,  193646,290830,  188858,0,        197856,449243,  193416,0,        422898,401325],
  ['CONTAINE',              'CM', 'M2M',    524835,503426,  573216,524835,  575683,563009,  572795,575683,  576424,0,        560528,572795,  560528,572795,  501980,0,        498384,513146,  515319,560528,  530351,501980,  475734,487540],
  ['CRG',                   'CM', 'M2M',    471,471,        471,471,         489,470,        492,471,        492,471,        492,471,        492,471,        550,470,        52412,529,      30049,471,      29480,471,      29480,80707],
  ['GTROPY',                'CM', 'M2M',    444961,445087,  455400,0,        471607,900731,  131503,264334,  206477,208269,  333461,283243,  333461,283243,  393885,388467,  404966,393964,  340492,405061,  326909,330688,  325431,325578],
  ['INDIA_POST',            'CM', 'M2M',    22306,63370,    22438,0,         24553,0,        30035,0,        31218,22306,    31746,24555,    31746,24555,    32698,31474,    25321,25302,    117,66919,      0,0,             0,0],
  ['JIO_THINGS',            'CM', 'M2M',    0,0,            0,0,             0,0,            0,0,            0,0,            11,0,           11,0,           21,0,           9,0,            121,0,          115,0,          189,0],
  ['LYNKIT',                'CM', 'M2M',    18423,17564,    18287,18424,    18324,18286,    18062,18338,    17781,18062,    17909,17981,    17909,17981,    17909,17909,    17251,17908,    17835,0,        16420,35086,    16714,16420],
  ['NARCOTICS',             'CM', 'M2M',    474142,472159,  0,0,             0,0,            473898,474143,  0,0,            0,0,            0,0,            0,0,            0,0,            100819,124153,  0,0,             0,0],
  ['ONE_STACK',             'CM', 'M2M',    -171,0,         932,614,         305,0,          -185,0,         0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,             0,0],
  ['SOURCINGBRAINS',        'CM', 'M2M',    0,0,            0,0,             47,0,           56,0,           50,0,           120941,0,       120941,0,       105424,0,       102729,0,       104989,345091,  563477,207719,  651998,563421],
  ['TAISYS',                'CM', 'M2M',    12645932,12954547, 12071263,12645897, 12547069,12070158, 13009781,12502966, 13512781,12495235, 13961417,14006580, 13961417,14006580, 14619405,14317654, 14659831,0, 12997928,28334900, 13613827,13941841, 12699771,13613677],
  ['TATA',                  'CM', 'M2M',    2029590,2030304, 2030468,2029589, 2029909,2030467, 2029705,2029909, 2029465,2029704, 2029715,2029464, 2029715,2029464, 2041687,2029341, 2035558,0, 2035816,4077245, 1967152,2035816, 1989465,1967145],
  ['TRANSECUR',             'CM', 'M2M',    113795,180435,  150196,113772,  150105,150068,  150149,150105,  150020,150149,  145078,150021,  145078,150021,  150010,150036,  149943,150011,  150049,149943,  149998,150050,  149886,149999],
  ['TRAXSMART',             'CM', 'M2M',    0,0,            0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            5575,0,         4789,0,         48884,0,        33326,0],
  ['VDK',                   'CM', 'M2M',    28,69,          40,0,            7,0,            1,75,           0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,             0,0],
  ['VENERA',                'CM', 'M2M',    158690,148804,  169648,158691,  184720,169648,  218117,184718,  478173,218121,  402527,478172,  402527,478172,  407796,413219,  443457,0,       386286,407826,  406298,829741,  406772,406299],
  ['VODAFONE',              'CM', 'M2M',    1945970,3267657, 1966712,1083725, 2115048,1571512, 2094251,2723036, 2132720,1107171, 2497173,1952587, 2497173,1952587, 2284062,2669267, 2223508,2063623, 2349159,893408, 2351241,2939247, 2334241,2499249],
  ['VOLTY',                 'CM', 'M2M',    2534625,2328113, 2552097,2853387, 2694409,2551955, 2674199,2636595, 2788412,0,      2325509,2694135, 2325509,2694135, 2602794,0,      2509120,2563967, 2679948,2548820, 2734772,2679966, 5285843,5244159],
  ['WEBLEO',                'CM', 'M2M',    21,0,           21,0,            10,0,           0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,             0,0],
  ['WHEELSEYE',             'CM', 'M2M',    561772,561841,  578146,560004,  575508,579976,  587112,594822,  574285,587176,  574321,574337,  574321,574337,  604016,574356,  602284,114,     598658,1206417, 612777,598709,  598664,598702],
  // ── EB / CFA customers ──────────────────────────────────────────────────
  ['ENGINEER_INDIA',        'CFA','PRI',    125000,0,       125000,0,        125000,0,       125000,0,       125000,0,       125000,0,       125000,0,       125000,0,       125000,0,       125000,0,       125000,0,       125000,0],
  ['TATA_SIA',              'EB', 'ILL',    230000,0,       0,0,             0,0,            230000,0,       0,0,            0,0,            230000,0,       0,0,            0,0,            230000,0,       0,0,             0,0],
  ['ICMR',                  'EB', 'CCTV',   258484,0,       258484,0,        258484,0,       258484,0,       258484,0,       258484,0,       258484,0,       258484,0,       258484,0,       258484,0,       258484,0,       258484,0],
  ['TEJAYS',                'EB', 'P2P',    325000,0,       0,0,             0,0,            325000,0,       0,0,            0,0,            325000,0,       0,0,            0,0,            325000,0,       0,0,             0,0],
  ['ANANTRAJ',              'EB', 'ILL',    0,0,            0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            159110,0,       0,0,            678500,0,       0,0],
  ['MANIPUR_POLICE',        'EB', 'VTS',    0,0,            0,0,             0,0,            0,0,            2548800,0,      0,0,            1274400,0,      0,0,            1274400,0,      0,0,            0,0,             0,0],
  ['IRFCL',                 'EB', 'P2P',    0,0,            0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            919082,0,       0,0],
  ['ENFORCEMENT_DIR',       'EB', 'P2P',    0,0,            0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            1065900,0,      0,0],
  ['HUGES',                 'CFA','SIP',    100000,0,       100000,0,        100000,0,       100000,0,       100000,0,       100000,0,       100000,0,       100000,0,       100000,0,       100000,0,       100000,0,       100000,0],
  ['CBSE',                  'EB', 'ILL',    0,0,            0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            112838,0,       172575,0,       0,0],
  ['MSDE',                  'EB', 'KAUSHALAM', 0,0,         0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            4000000,0,      1000000,0],
  ['BIS',                   'EB', 'ILL',    0,0,            0,0,             0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,            0,0,             360000,0],
]

// ── Map billing key → canonical DB customer name ───────────────────────
const NAME_MAP = {
  '11TECHSQUARE':    '11TECHSQUARE LIMITED',
  'APM_GROUP':       'APM GROUP PRIVATE LIMITED',
  'CONTAINE':        'CONTAINE TECHNOLOGIES LIMITED',
  'CRG':             'CRG SERVICES PRIVATE LIMITED',
  'GTROPY':          'GTROPY PRIVATE LIMITED',
  'INDIA_POST':      'INDIA POST PAYMENTS BANK',
  'JIO_THINGS':      'JIO THINGS LIMITED',
  'LYNKIT':          'LYNKIT SOLUTIONS PRIVATE LIMITED',
  'NARCOTICS':       'NARCOTICS CONTROL BUREAU',
  'ONE_STACK':       'ONE STACK SOLUTION PRIVATE LIMITED',
  'SOURCINGBRAINS':  'SOURCINGBRAINS PRIVATE LIMITED',
  'TAISYS':          'TAISYS PRIVATE LIMITED',
  'TATA':            'TATA COLLABORATION SERVICES PRIVATEE LIMITED',
  'TRANSECUR':       'TRANSECUR TELEMATICS PRIVATE LIMITED',
  'TRAXSMART':       'TRAXSMART LIMITED',
  'VDK':             'VDK ENGINEERING PRIVATE LIMITED',
  'VENERA':          'VENERA PRIVATE LIMITED',
  'VODAFONE':        'VODAFONE TECHNOLOGY SOLUTIONS LIMITED',
  'VOLTY':           'VOLTY SOLUTIONS PRIVATE LIMITED',
  'WEBLEO':          'WEBLEO IOT TECHNOLOGIES PRIVATE LIMITED',
  'WHEELSEYE':       'WHEELSEYE PRIVATE LIMITED',
  // EB / CFA new customers
  'ENGINEER_INDIA':  'ENGINEER INDIA LIMITED',
  'TATA_SIA':        'TATA SIA AIRLINES',
  'ICMR':            'INDIAN COUNCIL OF MEDICAL RESEARCH',
  'TEJAYS':          'TEJAYS INDUSTRIES PRIVATE LIMITED',
  'ANANTRAJ':        'ANANT RAJ IDC',
  'MANIPUR_POLICE':  'MANIPUR POLICE',
  'IRFCL':           'INDIAN RAILWAYS FINANCE CORPORATION LTD',
  'ENFORCEMENT_DIR': 'ENFORCEMENT DIRECTORATE',
  'HUGES':           'HUGHES COMMUNICATIONS',
  'CBSE':            'CBSE RO GURGAON',
  'MSDE':            'MSDE',
  'BIS':             'BUREAU OF INDIAN STANDARDS',
}

// NAM assignments for existing + new customers
const NAM_MAP = {
  '11TECHSQUARE LIMITED':                          'SUDHANSHU',
  'APM GROUP PRIVATE LIMITED':                     'SUDHANSHU',
  'CONTAINE TECHNOLOGIES LIMITED':                 'SUDHANSHU',
  'CRG SERVICES PRIVATE LIMITED':                  'SUDHANSHU',
  'FLEETX TECHNOLOGIES LIMITED':                   'SUDHANSHU',
  'GRL ENGINEERS PRIVATE LIMITED':                 'SUDHANSHU',
  'GTROPY PRIVATE LIMITED':                        'SUDHANSHU',
  'JIO THINGS LIMITED':                            'SUDHANSHU',
  'LYNKIT SOLUTIONS PRIVATE LIMITED':              'SUDHANSHU',
  'SOURCINGBRAINS PRIVATE LIMITED':                'SUDHANSHU',
  'TAISYS PRIVATE LIMITED':                        'SUDHANSHU',
  'TATA COLLABORATION SERVICES PRIVATEE LIMITED':  'SUDHANSHU',
  'TRANSECUR TELEMATICS PRIVATE LIMITED':          'SUDHANSHU',
  'TRAXSMART LIMITED':                             'SUDHANSHU',
  'VENERA PRIVATE LIMITED':                        'SUDHANSHU',
  'VODAFONE TECHNOLOGY SOLUTIONS LIMITED':         'SUDHANSHU',
  'VOLTY SOLUTIONS PRIVATE LIMITED':               'SUDHANSHU',
  'WHEELSEYE PRIVATE LIMITED':                     'SUDHANSHU',
  'WISHING SOFTWARE PRIVATE LIMITED':              'SUDHANSHU',
  'INDIA POST PAYMENTS BANK':                      'SUDHANSHU',
  'NARCOTICS CONTROL BUREAU':                      'SUDHANSHU',
  'ONE STACK SOLUTION PRIVATE LIMITED':            'SUDHANSHU',
  'VDK ENGINEERING PRIVATE LIMITED':               'SUDHANSHU',
  'WEBLEO IOT TECHNOLOGIES PRIVATE LIMITED':       'SUDHANSHU',
  'TEJAYS INDUSTRIES PRIVATE LIMITED':             'SUDHANSHU',
  'MANIPUR POLICE':                                'SUDHANSHU',
  'INDIAN COUNCIL OF MEDICAL RESEARCH':            'MAYA PAREEK',
  'ANANT RAJ IDC':                                 'MAYA PAREEK',
  'INDIAN RAILWAYS FINANCE CORPORATION LTD':       'MAYA PAREEK',
  'ENFORCEMENT DIRECTORATE':                       'MAYA PAREEK',
  'CBSE RO GURGAON':                               'RAHUL RAWAT',
  'MSDE':                                          'RICHA YADAV',
  'BUREAU OF INDIAN STANDARDS':                    'RICHA YADAV',
  'TATA SIA AIRLINES':                             'RICHA YADAV',
  'ENGINEER INDIA LIMITED':                        'MAYA PAREEK',
  'HUGHES COMMUNICATIONS':                         'RAHUL RAWAT',
}

async function main() {
  console.log('\n====== Billing Seed Script ======\n')

  // 1. Fetch existing customers
  const { data: existing, error: fetchErr } = await sb.from('customers').select('id, name')
  if (fetchErr) { console.error('Fetch error:', fetchErr); process.exit(1) }

  const dbMap = new Map(existing.map(c => [c.name.toUpperCase(), c.id]))

  // 2. Insert new customers that aren't in DB yet
  const newCustomers = []
  for (const row of RAW) {
    const [key, vertical, product] = row
    const canonicalName = NAME_MAP[key]
    if (!canonicalName) { console.warn(`No name mapping for key: ${key}`); continue }
    if (!dbMap.has(canonicalName.toUpperCase())) {
      newCustomers.push({
        name: canonicalName,
        product_vertical: vertical,
        nam_name: NAM_MAP[canonicalName] || null,
      })
    }
  }

  if (newCustomers.length) {
    console.log(`Inserting ${newCustomers.length} new customers...`)
    const { data: inserted, error: insErr } = await sb.from('customers').insert(newCustomers).select('id, name')
    if (insErr) { console.error('Insert customers error:', insErr); process.exit(1) }
    for (const c of inserted) dbMap.set(c.name.toUpperCase(), c.id)
    console.log(`  ✓ ${inserted.length} customers added`)
    inserted.forEach(c => console.log(`    + ${c.name}`))
  }

  // 3. Update existing M2M customers: set product_vertical='CM' and nam_name
  console.log('\nUpdating product_vertical and NAM for existing customers...')
  let updated = 0
  for (const c of existing) {
    const nam = NAM_MAP[c.name] || null
    const vertical = 'CM' // all existing are M2M
    const { error } = await sb.from('customers').update({ product_vertical: vertical, nam_name: nam }).eq('id', c.id)
    if (!error) updated++
  }
  console.log(`  ✓ ${updated} existing customers updated`)

  // 4. Build monthly_records upsert list
  const records = []
  for (const row of RAW) {
    const [key, vertical, product, ...vals] = row
    const canonicalName = NAME_MAP[key]
    if (!canonicalName) continue
    const custId = dbMap.get(canonicalName.toUpperCase())
    if (!custId) { console.warn(`No DB id for: ${canonicalName}`); continue }

    for (let mi = 0; mi < MONTHS.length; mi++) {
      const cmo = vals[mi * 2]     // curr month outstanding (₹)
      const lpr = vals[mi * 2 + 1] // last payment received (₹)
      if (cmo === 0 && lpr === 0) continue // skip empty months

      records.push({
        customer_id:     custId,
        month:           MONTHS[mi],
        abf_amount:      cmo / CR,
        revenue_realised: lpr / CR,
        activations:     0,
        deactivations:   0,
        plan_changes:    0,
        active_sims:     0,
        commissioning_pending: 0,
        notes:           'Seeded from billing summary Apr 2025–Mar 2026',
      })
    }
  }

  console.log(`\nUpserting ${records.length} monthly records...`)

  // Upsert in batches (conflict on customer_id + month → update ABF/revenue)
  const BATCH = 100
  let done = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await sb.from('monthly_records').upsert(batch, {
      onConflict: 'customer_id,month',
      ignoreDuplicates: false,
    })
    if (error) { console.error(`Upsert error at ${i}:`, error); process.exit(1) }
    done += batch.length
    process.stdout.write(`  ${done}/${records.length}\r`)
  }

  console.log(`\n  ✓ ${done} monthly records upserted`)
  console.log('\n====== Billing Seed Complete ======\n')
}

main().catch(console.error)
