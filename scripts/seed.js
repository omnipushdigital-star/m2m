const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function parsePlanDetails(planName) {
  const dataMatch = planName.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i)
  const smsMatch = planName.match(/(\d+(?:\.\d+)?)\s*SMS/i)
  return {
    data_limit: dataMatch ? `${dataMatch[1]} ${dataMatch[2].toUpperCase()}` : null,
    sms_limit: smsMatch ? `${smsMatch[1]} SMS` : null,
  }
}

async function seed() {
  // Excel file is in the parent directory
  const excelPath = 'D:/Claude Projects/M2M INVENTORY/M2M HR Data 09042026.xlsx'
  const wb = XLSX.readFile(excelPath)
  const ws = wb.Sheets['Sheet1']
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Combine both column sets (left side: cols 0,1,2; right side: cols 5,6,7)
  const rows = []
  for (let i = 1; i < data.length; i++) {
    const r = data[i]
    if (r[0] && r[1]) rows.push({ name: String(r[0]).trim(), plan: String(r[1]).trim(), count: Number(r[2]) || 0 })
    if (r[5] && r[6]) rows.push({ name: String(r[5]).trim(), plan: String(r[6]).trim(), count: Number(r[7]) || 0 })
  }

  console.log(`Found ${rows.length} rows from Excel`)

  // --- Seed plans ---
  const uniquePlanNames = [...new Set(rows.map((r) => r.plan))]
  console.log(`Inserting ${uniquePlanNames.length} plans...`)
  const plansToInsert = uniquePlanNames.map((name) => ({ plan_name: name, ...parsePlanDetails(name) }))
  const { data: insertedPlans, error: planError } = await supabase.from('plans').insert(plansToInsert).select('id, plan_name')
  if (planError) { console.error('Plan insert error:', planError.message); process.exit(1) }
  const planMap = new Map(insertedPlans.map((p) => [p.plan_name, p.id]))
  console.log(`✓ ${insertedPlans.length} plans inserted`)

  // --- Seed customers ---
  const uniqueCustomerNames = [...new Set(rows.map((r) => r.name))]
  console.log(`Inserting ${uniqueCustomerNames.length} customers...`)
  const customersToInsert = uniqueCustomerNames.map((name) => ({ name }))
  const { data: insertedCustomers, error: custError } = await supabase.from('customers').insert(customersToInsert).select('id, name')
  if (custError) { console.error('Customer insert error:', custError.message); process.exit(1) }
  const customerMap = new Map(insertedCustomers.map((c) => [c.name, c.id]))
  console.log(`✓ ${insertedCustomers.length} customers inserted`)

  // --- Seed customer_plans ---
  const customerPlansToInsert = rows
    .map((r) => ({
      customer_id: customerMap.get(r.name),
      plan_id: planMap.get(r.plan),
      sim_count: r.count,
    }))
    .filter((cp) => cp.customer_id && cp.plan_id)

  console.log(`Inserting ${customerPlansToInsert.length} customer-plan assignments...`)
  const { error: cpError } = await supabase.from('customer_plans').insert(customerPlansToInsert)
  if (cpError) { console.error('CustomerPlan insert error:', cpError.message); process.exit(1) }
  console.log(`✓ ${customerPlansToInsert.length} customer-plan assignments inserted`)

  // --- Seed monthly_records for 2026-04 snapshot ---
  const simTotals = new Map()
  for (const r of rows) {
    const custId = customerMap.get(r.name)
    if (custId) simTotals.set(custId, (simTotals.get(custId) || 0) + r.count)
  }

  const monthlyToInsert = Array.from(simTotals.entries()).map(([customer_id, active_sims]) => ({
    customer_id,
    month: '2026-04',
    activations: 0,
    deactivations: 0,
    plan_changes: 0,
    active_sims,
    abf_amount: 0,
    revenue_realised: 0,
    commissioning_pending: 0,
    notes: 'Initial snapshot from M2M HR Data 09042026.xlsx',
  }))

  console.log(`Inserting ${monthlyToInsert.length} April 2026 snapshot records...`)
  const { error: mrError } = await supabase.from('monthly_records').insert(monthlyToInsert)
  if (mrError) { console.error('MonthlyRecord insert error:', mrError.message); process.exit(1) }
  console.log(`✓ ${monthlyToInsert.length} monthly records inserted`)

  console.log('\n✅ Seed complete!')
}

seed().catch(console.error)
