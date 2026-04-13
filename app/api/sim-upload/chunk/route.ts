import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { normalizeName, jaccardScore } from '@/lib/fuzzy-match'

export const runtime = 'nodejs'
export const maxDuration = 60

type SimRow = {
  external_id: string
  caf_no: string
  imsi: string
  sim_no: string
  customer_name_raw: string
  service_center: string
  plan: string
  apn: string
}

export async function POST(req: NextRequest) {
  try {
    const { sims, uploadMonth, customers } = await req.json() as {
      sims: SimRow[]
      uploadMonth: string
      customers: { id: string; name: string }[]
    }

    if (!sims?.length || !uploadMonth) {
      return NextResponse.json({ error: 'Missing sims or uploadMonth' }, { status: 400 })
    }

    const supabase = getSupabase()

    // ── Build customer lookup with tokens ────────────────────────────────────
    const customerRefs = customers.map(c => ({
      id: c.id,
      name: c.name,
      tokens: normalizeName(c.name),
    }))

    // Also check manual CAF mappings for this batch
    const cafNos = Array.from(new Set(sims.map(s => s.caf_no)))
    const { data: cafMappings } = await supabase
      .from('customer_caf_mapping')
      .select('caf_no, customer_name_raw, customer_id')
      .in('caf_no', cafNos)

    const cafMap = new Map<string, string>()
    for (const m of cafMappings ?? []) {
      cafMap.set(`${m.caf_no}||${m.customer_name_raw}`, m.customer_id)
    }

    // ── Get existing records for these IMSIs ─────────────────────────────────
    const imsis = sims.map(s => s.imsi)
    const { data: existing } = await supabase
      .from('sim_inventory')
      .select('imsi, plan, apn, status, first_seen_month, customer_id, match_status')
      .in('imsi', imsis)

    const existingMap = new Map(
      (existing ?? []).map(r => [r.imsi, r])
    )

    // ── Process each SIM ─────────────────────────────────────────────────────
    const historyInserts: object[] = []
    const simUpserts: object[] = []
    let newCount = 0, changedCount = 0, unchangedCount = 0

    for (const sim of sims) {
      const curr = existingMap.get(sim.imsi)

      // ── Fuzzy match customer ──────────────────────────────────────────────
      let customerId: string | null = null
      let matchStatus = 'unmatched'

      // 1. Check manual CAF mapping first
      const cafKey = `${sim.caf_no}||${sim.customer_name_raw}`
      if (cafMap.has(cafKey)) {
        customerId = cafMap.get(cafKey)!
        matchStatus = 'matched'
      } else {
        // 2. Fuzzy match
        const rawTokens = normalizeName(sim.customer_name_raw)
        let bestScore = 0
        let bestId = null as string | null

        for (const c of customerRefs) {
          const score = jaccardScore(rawTokens, c.tokens)
          if (score > bestScore) { bestScore = score; bestId = c.id }
        }

        if (bestScore >= 0.7) {
          customerId = bestId
          matchStatus = 'matched'
        } else if (bestScore >= 0.4) {
          customerId = bestId   // tentative, needs review
          matchStatus = 'pending'
        } else {
          matchStatus = 'unmatched'
        }
      }

      // Keep existing customer mapping if already matched (don't downgrade)
      if (curr?.customer_id && (curr.match_status === 'matched')) {
        customerId = curr.customer_id
        matchStatus = 'matched'
      }

      if (!curr || curr.status === 'deleted') {
        // ── New activation ──────────────────────────────────────────────────
        historyInserts.push({
          imsi: sim.imsi,
          change_type: 'activated',
          new_plan: sim.plan,
          new_apn: sim.apn,
          change_month: uploadMonth,
        })
        simUpserts.push({
          external_id:       sim.external_id,
          caf_no:            sim.caf_no,
          imsi:              sim.imsi,
          sim_no:            sim.sim_no,
          customer_name_raw: sim.customer_name_raw,
          customer_id:       customerId,
          service_center:    sim.service_center,
          plan:              sim.plan,
          apn:               sim.apn,
          status:            'active',
          match_status:      matchStatus,
          first_seen_month:  uploadMonth,
          last_seen_month:   uploadMonth,
          deleted_month:     null,
          updated_at:        new Date().toISOString(),
        })
        newCount++
      } else {
        // ── Existing SIM — check for changes ────────────────────────────────
        const planChanged = curr.plan !== sim.plan
        const apnChanged  = curr.apn  !== sim.apn

        if (planChanged) {
          historyInserts.push({
            imsi: sim.imsi, change_type: 'plan_changed',
            old_plan: curr.plan, new_plan: sim.plan,
            change_month: uploadMonth,
          })
        }
        if (apnChanged) {
          historyInserts.push({
            imsi: sim.imsi, change_type: 'apn_changed',
            old_apn: curr.apn, new_apn: sim.apn,
            change_month: uploadMonth,
          })
        }

        simUpserts.push({
          external_id:       sim.external_id,
          caf_no:            sim.caf_no,
          imsi:              sim.imsi,
          sim_no:            sim.sim_no,
          customer_name_raw: sim.customer_name_raw,
          customer_id:       customerId,
          service_center:    sim.service_center,
          plan:              sim.plan,
          apn:               sim.apn,
          status:            'active',
          match_status:      matchStatus,
          first_seen_month:  curr.first_seen_month,
          last_seen_month:   uploadMonth,
          deleted_month:     null,
          updated_at:        new Date().toISOString(),
        })

        if (planChanged || apnChanged) changedCount++
        else unchangedCount++
      }
    }

    // ── Batch write to DB ────────────────────────────────────────────────────
    if (historyInserts.length > 0) {
      await supabase.from('sim_history').insert(historyInserts)
    }

    const { error: upsertError } = await supabase
      .from('sim_inventory')
      .upsert(simUpserts, { onConflict: 'imsi' })

    if (upsertError) throw upsertError

    return NextResponse.json({ new: newCount, changed: changedCount, unchanged: unchangedCount })
  } catch (e) {
    console.error('SIM chunk error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
