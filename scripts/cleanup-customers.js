/**
 * Customer data cleanup script
 * - Deletes "remove this" entries (govt/test accounts)
 * - Merges duplicate company entries to canonical names
 *
 * Set DRY_RUN = true to preview changes without writing.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const DRY_RUN = false  // ← set true to preview only

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ─────────────────────────────────────────────
//  Normalise name for fuzzy matching
// ─────────────────────────────────────────────
function norm(s) {
  return s
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')      // trailing dots
    .replace(/\.\.\.$/, '')   // trailing ellipsis
}

// ─────────────────────────────────────────────
//  Mapping: canonical name → list of DB name patterns
//  'REMOVE' → delete completely
// ─────────────────────────────────────────────
const CANONICAL_MAP = {

  REMOVE: [
    '4G SATURATION',
    'COMMISSIONER CORPORATION AMBALA',
    'COMMISSIONER MUNICIPAL CORPORATION AMBALA',
    'DEPARTMENT OF POSTAL AMBALA HARYANA',
    'ECOGAS PVT LTD',
    'ECOGAS IMPEX PVT LTD',
    'HUGHES COMMUNICATIONS INDIA PRIVATE LIMITED',
    'MUNICIPAL CORPORATION',
    'MUNICIPAL MUNICIPAL CORPORATION',
    'SARFARAZ AHMAD',
    'SARFARAZ AHMADGALO ENERGY PVT LTD',
  ],

  '11TECHSQUARE LIMITED': [
    '11TECHSQUARE LIMITED',
    '11TECHSQUARE PRIVATE LIMITED',
    '11TECHSQUARE',
    'ELEVEN TECH SQUARE PRIVATE LIMITED',
    'ELEVEN TECH SQUARE',
    'ELEVENTECHSQUAREPRIVATE LIMITED',
    'ONEONETECHSQUARE PRIVATE LIMITED',
    'ONEONETECHSQUARE',
  ],

  'APM GROUP PRIVATE LIMITED': [
    'APM GROUP PRIVATE LIMITED',
  ],

  'BINARY SEMANTICS LIMITED': [
    'BINARY SEMANTICS LIMITED',
  ],

  'CONTAINE TECHNOLOGIES LIMITED': [
    'CONTAINE TECHNOLOGIES LIMITED',
    'CONTAINE TECHNOLOGIES PVT LTD',
    'CONTAINE TECHNOLOGIESLIMITED',
    'CONTAINE LIMITED',
    'CONTAINE',
  ],

  'CRG SERVICES PRIVATE LIMITED': [
    'CRG SERVICES PRIVATE LIMITED',
    'CRG CORPORATE SERVICES PRIVATE LIMITED',
  ],

  'FLEETX TECHNOLOGIES LIMITED': [
    'FLEETX TECHNOLOGIES LIMITED',
    'FLEETX TECHNOLOGIES PRIVATE LIMITED',
  ],

  'GRL ENGINEERS PRIVATE LIMITED': [
    'GRL ENGINEERS PRIVATE LIMITED',
  ],

  'GTROPY PRIVATE LIMITED': [
    'GTROPY PRIVATE LIMITED',
    'GTROPY SYSTEMS PRIVATE LIMITED',
    'GTROPY SYSTEMS',
    'GTROPY',
  ],

  'INTALIA TECHNOLOGIES PRIVATE LIMITED': [
    'INTALIA TECHNOLOGIES PRIVATE LIMITED',
  ],

  'JIO THINGS LIMITED': [
    'JIO THINGS LIMITED',
  ],

  'LYNKIT SOLUTIONS PRIVATE LIMITED': [
    'LYNKIT SOLUTIONS PRIVATE LIMITED',
    'LYNKIT SOLUTIONSPRIVATE LIMITED',
  ],

  'SOURCINGBRAINS PRIVATE LIMITED': [
    'SOURCINGBRAINS PRIVATE LIMITED',
    'SOURCINGBRAINS LAB PRIVATE LIMITED',
  ],

  'TAISYS PRIVATE LIMITED': [
    'TAISYS INDIA PRIVATE LIMITED-TIPL',
    'TAISYS INDIA PRIVATE LIMITED',
    'TAISYS INDIA PRIVATELIMITED',
    'TAISYS INDIA PTIVATE LIMITED',
    'TAISYS INDIA PVT LTD',
    'TAISYS INDIAPRIVATE LIMITED',
    'TAISYS INDIAPVT LTD',
    'TAISYS INDIA',
    'TAISYS PRIVATE LIMITED',
    'TAISYS PTIVATE LIMITED',
    'TAISYS',
  ],

  'TATA COLLABORATION SERVICES PRIVATEE LIMITED': [
    'TATA COMMUNICATIONS COLLABORATION SERVICES PRIVATEE LIMITED',
    'TATA COMMUNICATIONS COLLABORATION SERVICES PVT LTDD',
    'TATA COMMUNICATIONS PRIVATE LIMITED',
    'TATA COMMUNICATIONSPRIVATE LIMITED',
    'TATA COLLABORATION SERVICES PRIVATEE LIMITED',
    'TATA',
  ],

  'TRANSECUR TELEMATICS PRIVATE LIMITED': [
    'TRANSECURE TELEMATICS PRIVATE LIMITED',
    'TRANSECURE TELEMATICSPVT LTD',
    'TRANSECUR TELEMATICS PRIVATE LIMITED',
    'TRANSECUR TELEMATICSPRIVATE LIMITED',
    'TRANSECUR TEL',
    'TRANSECUR',
  ],

  'TRAXSMART LIMITED': [
    'TRAXSMART LIMITED',
  ],

  'VENERA PRIVATE LIMITED': [
    'VENERA SOFTWARE PRIVATE LIMITED',
    'VENERA SOFTWARE',
    'VENERA PRIVATE LIMITED',
  ],

  'VODAFONE TECHNOLOGY SOLUTIONS LIMITED': [
    'VODAFONE IDEA TECHNOLOGY SOLUTIONS LIMITED',
    'VODAFONE IDEA TECHNOLOGY',
    'VODAFONE TECHNOLOGY SOLUTIONS LIMITED',
  ],

  'VOLTY SOLUTIONS PRIVATE LIMITED': [
    'VOLTY IOT SOLUTIONS PRIVATE LIMITED',
    'VOLTY IOT SOLUTIONS PVT LTD',
    'VOLTY IOT SOLUTIONSPRIVATE LIMITED',
    'VOLTY IOT SOLUTIONSPVT LTD',
    'VOLTY IOT SOLUTION PVT LTD',
    'VOLTY IOT SOLUTIONS',
    'VOLTY IT SOLUTIONS PRIVATE LIMITED',
    'VOLTY SOLUTIONS PRIVATE LIMITED',
    'VOLTY IOT',
    'VOLTY',
  ],

  'WHEELSEYE PRIVATE LIMITED': [
    'WHEELSEYE TECHNOLOGY INDIA PRIVATE LIMITED',
    'WHEELSEYE TECHNOLOGY INDIA PVT LTD',
    'WHEELSEYE TECHNOLOGY INDIAPRIVATE LIMITED',
    'WHEELSEYE TECHNOLOGYINDIA PVT LTD',
    'WHEELSEYE TECHNOLOGY PRIVATE LIMITED',
    'WHEELSEYE TECHNOLOGY',
    'WHEELSEYE PRIVATE LIMITED',
    'WHEELSEYE',
  ],

  'WISHING SOFTWARE PRIVATE LIMITED': [
    'WISHING SOFTWARE PRIVATE LIMITED',
    'WISHING TREE SOFTWARE PRIVATE LIMITED',
  ],
}

// ─────────────────────────────────────────────
//  Match a DB customer name to a canonical name
//  Returns 'REMOVE', a canonical name, or null (unmatched)
// ─────────────────────────────────────────────
function getCanonical(dbName) {
  const n = norm(dbName)
  let bestCanonical = null
  let bestLen = -1

  for (const [canonical, patterns] of Object.entries(CANONICAL_MAP)) {
    for (const pattern of patterns) {
      const p = norm(pattern)
      // Match: exact, or DB name starts with pattern followed by space/(/nothing
      const matches =
        n === p ||
        n.startsWith(p + ' ') ||
        n.startsWith(p + '(') ||
        n.startsWith(p + '-')

      if (matches && p.length > bestLen) {
        bestLen = p.length
        bestCanonical = canonical
      }
    }
  }
  return bestCanonical
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
async function main() {
  console.log(`\n====== Customer Cleanup Script [${DRY_RUN ? 'DRY RUN' : 'LIVE'}] ======\n`)

  // 1. Fetch all customers
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name')
    .order('name')

  if (error) { console.error('Fetch error:', error); process.exit(1) }
  console.log(`Fetched ${customers.length} customers from Supabase\n`)

  // 2. Classify each customer
  const toDelete   = []   // { id, name }
  const toMerge    = {}   // canonical → [{ id, name }]
  const unmatched  = []   // { id, name }

  for (const c of customers) {
    const canonical = getCanonical(c.name)
    if (!canonical) {
      unmatched.push(c)
    } else if (canonical === 'REMOVE') {
      toDelete.push(c)
    } else {
      if (!toMerge[canonical]) toMerge[canonical] = []
      toMerge[canonical].push(c)
    }
  }

  console.log(`── TO DELETE (${toDelete.length}) ──────────────────────`)
  toDelete.forEach(c => console.log(`  ✕  ${c.name}`))

  console.log(`\n── TO MERGE (${Object.keys(toMerge).length} groups) ─────────────────`)
  for (const [canonical, group] of Object.entries(toMerge)) {
    console.log(`  → ${canonical}  (${group.length} entries)`)
    group.forEach(c => console.log(`      • ${c.name}`))
  }

  if (unmatched.length) {
    console.log(`\n── UNMATCHED / KEPT AS-IS (${unmatched.length}) ───────────`)
    unmatched.forEach(c => console.log(`  ? ${c.name}`))
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made. Set DRY_RUN=false to execute.\n')
    return
  }

  // ── 3. Delete REMOVE customers ──────────────────────────────
  console.log('\n── Deleting customers ──────────────────────────────')
  const deleteIds = toDelete.map(c => c.id)

  if (deleteIds.length) {
    const { error: e1 } = await supabase.from('monthly_records').delete().in('customer_id', deleteIds)
    if (e1) console.error('  monthly_records delete error:', e1)

    const { error: e2 } = await supabase.from('customer_plans').delete().in('customer_id', deleteIds)
    if (e2) console.error('  customer_plans delete error:', e2)

    const { error: e3 } = await supabase.from('customers').delete().in('id', deleteIds)
    if (e3) { console.error('  customers delete error:', e3) }
    else console.log(`  ✓ Deleted ${deleteIds.length} customers`)
  }

  // ── 4. Merge duplicate customers ────────────────────────────
  console.log('\n── Merging customers ──────────────────────────────')
  let mergedCount = 0

  for (const [canonical, group] of Object.entries(toMerge)) {
    if (group.length === 0) continue

    // Pick the customer with the most customer_plans as "primary"
    const withCounts = await Promise.all(
      group.map(async c => {
        const { count } = await supabase
          .from('customer_plans')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', c.id)
        return { ...c, planCount: count || 0 }
      })
    )
    withCounts.sort((a, b) => b.planCount - a.planCount)
    const primary    = withCounts[0]
    const duplicates = withCounts.slice(1)

    console.log(`\n  ${canonical}  (primary: "${primary.name}", ${duplicates.length} duplicates)`)

    // Merge each duplicate into primary
    for (const dup of duplicates) {
      // --- monthly_records ---
      const { data: dupRecs } = await supabase
        .from('monthly_records')
        .select('*')
        .eq('customer_id', dup.id)

      for (const rec of dupRecs || []) {
        const { data: existing } = await supabase
          .from('monthly_records')
          .select('id, active_sims, abf_amount, revenue_realised, commissioning_pending')
          .eq('customer_id', primary.id)
          .eq('month', rec.month)
          .maybeSingle()

        if (existing) {
          // Sum numeric values, then delete duplicate record
          await supabase.from('monthly_records').update({
            active_sims:           (existing.active_sims           || 0) + (rec.active_sims           || 0),
            abf_amount:            (existing.abf_amount            || 0) + (rec.abf_amount            || 0),
            revenue_realised:      (existing.revenue_realised      || 0) + (rec.revenue_realised      || 0),
            commissioning_pending: (existing.commissioning_pending || 0) + (rec.commissioning_pending || 0),
          }).eq('id', existing.id)
          await supabase.from('monthly_records').delete().eq('id', rec.id)
        } else {
          // Reassign record to primary
          await supabase.from('monthly_records').update({ customer_id: primary.id }).eq('id', rec.id)
        }
      }

      // --- customer_plans ---
      const { data: dupPlans } = await supabase
        .from('customer_plans')
        .select('id, plan_id, committed_quantity')
        .eq('customer_id', dup.id)

      for (const plan of dupPlans || []) {
        const { data: existing } = await supabase
          .from('customer_plans')
          .select('id')
          .eq('customer_id', primary.id)
          .eq('plan_id', plan.plan_id)
          .maybeSingle()

        if (existing) {
          // Primary already has this plan – discard duplicate link
          await supabase.from('customer_plans').delete().eq('id', plan.id)
        } else {
          // Move plan link to primary
          await supabase.from('customer_plans').update({ customer_id: primary.id }).eq('id', plan.id)
        }
      }

      // --- delete duplicate customer ---
      const { error: delErr } = await supabase.from('customers').delete().eq('id', dup.id)
      if (delErr) console.error(`    ✕ Could not delete dup "${dup.name}":`, delErr)
      else {
        console.log(`    ✓ Merged "${dup.name}"`)
        mergedCount++
      }
    }

    // Rename primary to canonical name
    const { error: renameErr } = await supabase
      .from('customers')
      .update({ name: canonical })
      .eq('id', primary.id)
    if (renameErr) console.error(`  ✕ Rename error:`, renameErr)
    else console.log(`  ✓ Renamed primary → "${canonical}"`)
  }

  // ── 5. Summary ──────────────────────────────────────────────
  const { count: finalCount } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })

  console.log(`\n====== Done ======`)
  console.log(`  Deleted  : ${deleteIds.length} customers`)
  console.log(`  Merged   : ${mergedCount} duplicates removed`)
  console.log(`  Remaining: ${finalCount} customers\n`)
}

main().catch(console.error)
