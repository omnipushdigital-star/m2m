import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'google/gemma-4-31b-it'

// ── Supabase client (anon key — read-only public data) ────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Known NAM names (uppercase keys matching the nams table) ─────────────────
const KNOWN_NAMS = [
  'MAYA PAREEK', 'MAYA',
  'RAHUL RAWAT', 'RAHUL',
  'RICHA YADAV', 'RICHA',
  'SUDHANSHU',
  'NAVEEN SAINI', 'NAVEEN',
]

// ── Month name → YYYY-MM ──────────────────────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
  JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04',
  MAY: '05', JUNE: '06', JULY: '07', AUGUST: '08',
  SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12',
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
}

function extractMonth(text: string): string | null {
  const t = text.toUpperCase()
  // Match "April 2026" or "Apr 2026" or "2026-04"
  const named = t.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})\b/)
  if (named) return `${named[2]}-${MONTH_MAP[named[1]]}`
  const iso = t.match(/\b(\d{4})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}`
  return null
}

// ── Intent detection ──────────────────────────────────────────────────────────
function detectIntent(text: string) {
  const t = text.toUpperCase()

  const namMentioned  = KNOWN_NAMS.find(n => t.includes(n)) ?? null
  const monthMentioned = extractMonth(text)

  const wantsStage4   = /STAGE\s*4|S4|CLOSED|BILLED|PO\b|PURCHASE ORDER/.test(t)
  const wantsStage1   = /STAGE\s*1|S1|PIPELINE|OPPORTUNITY|OPPORTUNITIES|PROSPECT/.test(t)
  const wantsSims     = /\bSIM(S)?\b|INVENTORY|ACTIVE SIM|DUMP/.test(t)
  const wantsBilling  = /\bABF\b|BILLING|REVENUE|AMOUNT|COLLECTION/.test(t)
  const wantsCustomer = /CUSTOMER(S)?/.test(t)
  const wantsSummary  = /SUMMARY|OVERVIEW|TOTAL|ALL NAM|ACROSS/.test(t)

  return { namMentioned, monthMentioned, wantsStage4, wantsStage1, wantsSims, wantsBilling, wantsCustomer, wantsSummary }
}

// ── Fetch relevant data from Supabase ─────────────────────────────────────────
async function fetchContextData(userQuestion: string): Promise<string> {
  const sb = getSupabase()
  const intent = detectIntent(userQuestion)
  const sections: string[] = []

  try {
    // ── Stage 4 opportunities ────────────────────────────────────────────────
    if (intent.wantsStage4 || (!intent.wantsStage1 && !intent.wantsSims && !intent.wantsBilling && intent.namMentioned)) {
      let q = sb
        .from('funnel_opportunities')
        .select('customer_name, nam_name, po_value, po_date, commissioned_qty, vertical, billing_cycle, annualised_value')
        .eq('funnel_stage', 4)
        .order('po_value', { ascending: false })
        .limit(20)

      if (intent.namMentioned) {
        q = q.ilike('nam_name', `%${intent.namMentioned}%`)
      }

      const { data, error } = await q
      if (!error && data && data.length > 0) {
        const total = data.reduce((s, r) => s + Number(r.po_value ?? 0), 0)
        const annTotal = data.reduce((s, r) => s + Number(r.annualised_value ?? 0), 0)
        sections.push(
          `## Stage 4 Opportunities${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}`,
          `Total PO Value: ₹${(total / 100000).toFixed(2)} Lakhs | Annualised: ₹${(annTotal / 100000).toFixed(2)} Lakhs | Count: ${data.length}`,
          'Customer | NAM | PO Value (₹) | Commissioned Qty | Vertical | Billing Cycle',
          ...data.map(r =>
            `${r.customer_name} | ${r.nam_name} | ${r.po_value?.toLocaleString('en-IN') ?? '—'} | ${r.commissioned_qty ?? '—'} | ${r.vertical ?? '—'} | ${r.billing_cycle ?? '—'}`
          )
        )
      } else if (!error && data?.length === 0) {
        sections.push(`## Stage 4 Opportunities${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}: No records found.`)
      }
    }

    // ── Stage 1 opportunities ────────────────────────────────────────────────
    if (intent.wantsStage1) {
      let q = sb
        .from('funnel_opportunities')
        .select('customer_name, nam_name, category, product, estimated_value, commitment_date, remarks')
        .eq('funnel_stage', 1)
        .order('estimated_value', { ascending: false })
        .limit(20)

      if (intent.namMentioned) {
        q = q.ilike('nam_name', `%${intent.namMentioned}%`)
      }

      const { data, error } = await q
      if (!error && data && data.length > 0) {
        const total = data.reduce((s, r) => s + Number(r.estimated_value ?? 0), 0)
        sections.push(
          `## Stage 1 Pipeline${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}`,
          `Total Pipeline Value: ₹${(total / 100000).toFixed(2)} Lakhs | Count: ${data.length}`,
          'Customer | NAM | Est. Value (₹) | Category | Product | Commitment Date',
          ...data.map(r =>
            `${r.customer_name} | ${r.nam_name} | ${r.estimated_value?.toLocaleString('en-IN') ?? '—'} | ${r.category ?? '—'} | ${r.product ?? '—'} | ${r.commitment_date ?? '—'}`
          )
        )
      } else if (!error && data?.length === 0) {
        sections.push(`## Stage 1 Pipeline${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}: No records found.`)
      }
    }

    // ── Active SIMs / billing ─────────────────────────────────────────────────
    if (intent.wantsSims || intent.wantsBilling) {
      let q = sb
        .from('monthly_records')
        .select('customer_id, active_sims, abf_amount, month, customers(name, nam_name)')
        .order('month', { ascending: false })
        .limit(300)

      // Filter by specific month if mentioned in question
      if (intent.monthMentioned) {
        q = q.eq('month', intent.monthMentioned)
      }

      const { data, error } = await q

      if (!error && data && data.length > 0) {
        const targetMonth = intent.monthMentioned ?? data[0].month
        let rows = data.filter(r => r.month === targetMonth)

        if (intent.namMentioned) {
          rows = rows.filter(r => {
            const c = r.customers as { name?: string; nam_name?: string } | null
            return c?.nam_name?.toUpperCase().includes(intent.namMentioned!) ?? false
          })
        }

        // Cast to Number — Supabase can return numeric fields as strings
        const totalSims = rows.reduce((s, r) => s + Number(r.active_sims ?? 0), 0)
        const totalAbf  = rows.reduce((s, r) => s + Number(r.abf_amount  ?? 0), 0)

        sections.push(
          `## Active SIMs & Billing (Month: ${targetMonth})${intent.namMentioned ? ` — NAM: ${intent.namMentioned}` : ''}`,
          `Total Active SIMs: ${totalSims.toLocaleString('en-IN')} | Total ABF: ₹${(totalAbf / 100000).toFixed(2)} Lakhs | Customers: ${rows.length}`,
          'Customer | NAM | Active SIMs | ABF (₹)',
          ...rows.map(r => {
            const c = r.customers as { name?: string; nam_name?: string } | null
            return `${c?.name ?? '—'} | ${c?.nam_name ?? '—'} | ${Number(r.active_sims ?? 0).toLocaleString('en-IN')} | ${Number(r.abf_amount ?? 0).toLocaleString('en-IN')}`
          })
        )
      } else if (!error) {
        sections.push(`## Billing Data: No records found for ${intent.monthMentioned ?? 'latest month'}.`)
      }
    }

    // ── Customer list ─────────────────────────────────────────────────────────
    if (intent.wantsCustomer && !intent.wantsSims && !intent.wantsBilling) {
      let q = sb
        .from('customers')
        .select('name, nam_name, active_sims, segment')
        .order('active_sims', { ascending: false })
        .limit(20)

      if (intent.namMentioned) {
        q = q.ilike('nam_name', `%${intent.namMentioned}%`)
      }

      const { data, error } = await q
      if (!error && data && data.length > 0) {
        sections.push(
          `## Customers${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ' (Top 20 by SIMs)'}`,
          `Count: ${data.length}`,
          'Customer | NAM | Active SIMs | Segment',
          ...data.map(r => `${r.name} | ${r.nam_name ?? '—'} | ${r.active_sims?.toLocaleString('en-IN') ?? '—'} | ${r.segment ?? '—'}`)
        )
      }
    }

    // ── General summary (no specific intent) ─────────────────────────────────
    if (sections.length === 0) {
      const [custRes, s4Res, s1Res, simRes] = await Promise.all([
        sb.from('customers').select('id', { count: 'exact', head: true }),
        sb.from('funnel_opportunities').select('po_value').eq('funnel_stage', 4),
        sb.from('funnel_opportunities').select('estimated_value').eq('funnel_stage', 1),
        sb.from('monthly_records').select('active_sims, abf_amount, month').order('month', { ascending: false }).limit(200),
      ])

      const totalS4 = (s4Res.data ?? []).reduce((s, r) => s + Number(r.po_value ?? 0), 0)
      const totalS1 = (s1Res.data ?? []).reduce((s, r) => s + Number(r.estimated_value ?? 0), 0)
      const latestMonth = simRes.data?.[0]?.month ?? 'unknown'
      const latestRows  = (simRes.data ?? []).filter(r => r.month === latestMonth)
      const totalSims   = latestRows.reduce((s, r) => s + Number(r.active_sims ?? 0), 0)
      const totalAbf    = latestRows.reduce((s, r) => s + Number(r.abf_amount  ?? 0), 0)

      sections.push(
        '## Dashboard Summary',
        `Total Customers: ${custRes.count ?? '—'}`,
        `Stage 4 (Closed): ${s4Res.data?.length ?? 0} deals | Total PO Value: ₹${(totalS4 / 100000).toFixed(2)} Lakhs`,
        `Stage 1 (Pipeline): ${s1Res.data?.length ?? 0} opportunities | Total Value: ₹${(totalS1 / 100000).toFixed(2)} Lakhs`,
        `Active SIMs (${latestMonth}): ${totalSims.toLocaleString('en-IN')} | ABF: ₹${(totalAbf / 100000).toFixed(2)} Lakhs`,
      )
    }

  } catch (err) {
    console.error('Data fetch error:', err)
  }

  return sections.length > 0
    ? `\n\n---\nLIVE DATA FROM DATABASE:\n${sections.join('\n')}\n---`
    : ''
}

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are an intelligent assistant for the BSNL M2M Inventory Dashboard used by National Account Managers (NAMs) to track M2M SIM business.

Key concepts:
- M2M SIMs: Machine-to-Machine SIM cards used in IoT/connected devices
- NAM: National Account Manager, each manages a set of enterprise customers
- ABF: Annualised Billing Figure — yearly revenue from a customer
- Stage 1: Pipeline opportunity (not yet closed)
- Stage 4: Closed deal with Purchase Order (PO) and billing active
- Active SIMs: SIMs currently billed in monthly records
- SIM Dump: Actual SIMs active in network (from BSNL's monthly data dump)

When live data is provided above, use it to answer precisely. Quote actual numbers. Calculate totals if asked. Be concise — 3-5 sentences max unless a table is needed.`

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let messages: { role: string; content: string }[]
  try {
    const body = await req.json()
    messages = body.messages ?? []
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch live data based on the latest user question
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const dataContext = await fetchContextData(lastUserMsg)
  const systemPrompt = BASE_SYSTEM_PROMPT + dataContext

  const upstream = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 512,
      stream: true,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text()
    console.error('NVIDIA error:', upstream.status, errText)
    return new Response(JSON.stringify({ error: `AI service error ${upstream.status}` }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
