import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { getRole } from '@/lib/supabase-server'
import { NamsClient } from '@/components/nams-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'NAM Registry' }

export default async function NamsPage() {
  const role = await getRole()
  if (role !== 'admin') redirect('/')

  const supabase = getSupabase()

  // Load NAM registry
  const { data: nams } = await supabase
    .from('nams')
    .select('*')
    .order('name')

  // Coverage stats per NAM name (from live data)
  const [{ data: customers }, { data: opps }, { data: monthly }, { data: simSummary }] = await Promise.all([
    supabase.from('customers').select('id, name, nam_name'),
    supabase.from('funnel_opportunities').select('id, funnel_stage, nam_name, po_value, base_tariff'),
    supabase.from('monthly_records').select('customer_id, active_sims, abf_amount'),
    supabase.from('sim_customer_summary').select('customer_id, total_sims, upload_month').order('upload_month', { ascending: false }),
  ])

  // Build customer → nam map
  const custNamMap = new Map<string, string>()
  ;(customers ?? []).forEach(c => { if (c.nam_name) custNamMap.set(c.id, c.nam_name) })

  // Latest sim month
  const latestSimMonth = simSummary?.[0]?.upload_month ?? null

  // Coverage stats per nam_name
  type NamStats = {
    customers: number
    stage1: number
    stage4: number
    pipelineValue: number
    poValue: number
    activeSims: number
    latestAbf: number
    simDump: number
  }
  const statsMap = new Map<string, NamStats>()

  function getStats(nam: string): NamStats {
    if (!statsMap.has(nam)) statsMap.set(nam, { customers: 0, stage1: 0, stage4: 0, pipelineValue: 0, poValue: 0, activeSims: 0, latestAbf: 0, simDump: 0 })
    return statsMap.get(nam)!
  }

  ;(customers ?? []).forEach(c => { if (c.nam_name) getStats(c.nam_name).customers++ })

  ;(opps ?? []).forEach(o => {
    if (!o.nam_name) return
    const s = getStats(o.nam_name)
    if (o.funnel_stage === 1) { s.stage1++; s.pipelineValue += o.base_tariff ?? 0 }
    if (o.funnel_stage === 4) { s.stage4++;  s.poValue      += o.po_value    ?? 0 }
  })

  // Latest active_sims and ABF per NAM (latest monthly record per customer)
  const custLatestMonth = new Map<string, { month: string; sims: number; abf: number }>()
  ;(monthly ?? []).forEach(r => {
    const existing = custLatestMonth.get(r.customer_id)
    if (!existing || r.customer_id > existing.month) {
      custLatestMonth.set(r.customer_id, { month: r.customer_id, sims: r.active_sims ?? 0, abf: r.abf_amount ?? 0 })
    }
  })
  // Sum latest per NAM
  const monthlyByNam = new Map<string, { sims: number; abf: number }>()
  ;(monthly ?? []).forEach(r => {
    const nam = custNamMap.get(r.customer_id)
    if (!nam) return
    const ex = monthlyByNam.get(nam)
    if (!ex) monthlyByNam.set(nam, { sims: r.active_sims ?? 0, abf: r.abf_amount ?? 0 })
    else { ex.sims = Math.max(ex.sims, r.active_sims ?? 0); ex.abf += r.abf_amount ?? 0 }
  })
  monthlyByNam.forEach((v, nam) => {
    const s = getStats(nam)
    s.activeSims  = v.sims
    s.latestAbf   = v.abf
  })

  // SIM dump totals per NAM (latest month only)
  ;(simSummary ?? [])
    .filter(r => r.upload_month === latestSimMonth)
    .forEach(r => {
      const nam = r.customer_id ? custNamMap.get(r.customer_id) : null
      if (nam) getStats(nam).simDump += r.total_sims ?? 0
    })

  // All unique nam_names from live data not yet in registry
  const registeredNames = new Set((nams ?? []).map(n => n.name))
  const unmappedNames   = Array.from(statsMap.keys())
    .filter(n => !registeredNames.has(n))
    .sort()

  return (
    <NamsClient
      nams={nams ?? []}
      statsMap={Object.fromEntries(statsMap)}
      unmappedNames={unmappedNames}
      latestSimMonth={latestSimMonth}
    />
  )
}
