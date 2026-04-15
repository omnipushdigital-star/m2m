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

// ── Extract ALL months mentioned in a question ────────────────────────────────
function extractAllMonths(text: string): string[] {
  const t = text.toUpperCase()
  const results: string[] = []
  const regex = /\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})\b/g
  let m
  while ((m = regex.exec(t)) !== null) {
    results.push(`${m[2]}-${MONTH_MAP[m[1]]}`)
  }
  const isoRegex = /\b(\d{4})-(\d{2})\b/g
  while ((m = isoRegex.exec(t)) !== null) {
    results.push(`${m[1]}-${m[2]}`)
  }
  return Array.from(new Set(results))
}

// ── Intent detection ──────────────────────────────────────────────────────────
function detectIntent(text: string) {
  const t = text.toUpperCase()

  const namMentioned   = KNOWN_NAMS.find(n => t.includes(n)) ?? null
  const monthMentioned = extractMonth(text)
  const allMonths      = extractAllMonths(text)
  const wantsCompare   = /COMPAR|VS\b|VERSUS|DIFFERENCE|GROWTH|CHANGE|TREND/.test(t)
  const wantsCurrent   = /CURRENT MONTH|THIS MONTH|LATEST MONTH/.test(t)

  const wantsStage4   = /STAGE\s*4|S4|CLOSED|BILLED|PO\b|PURCHASE ORDER/.test(t)
  const wantsStage1   = /STAGE\s*1|S1|PIPELINE|OPPORTUNITY|OPPORTUNITIES|PROSPECT/.test(t)
  const wantsSims     = /\bSIM(S)?\b|INVENTORY|ACTIVE SIM|DUMP/.test(t)
  const wantsBilling  = /\bABF\b|BILLING|REVENUE|AMOUNT|COLLECTION/.test(t)
  const wantsCustomer = /CUSTOMER(S)?/.test(t)
  const wantsSummary  = /SUMMARY|OVERVIEW|TOTAL|ALL NAM|ACROSS/.test(t)

  return { namMentioned, monthMentioned, allMonths, wantsCompare, wantsCurrent, wantsStage4, wantsStage1, wantsSims, wantsBilling, wantsCustomer, wantsSummary }
}

// ── Fetch ABF summary for one month ──────────────────────────────────────────
async function fetchAbfForMonth(sb: ReturnType<typeof getSupabase>, month: string) {
  const { data } = await sb
    .from('monthly_records')
    .select('active_sims, abf_amount, customers(name, nam_name)')
    .eq('month', month)
  if (!data || data.length === 0) return null
  const totalSims = data.reduce((s, r) => s + Number(r.active_sims ?? 0), 0)
  const totalAbf  = data.reduce((s, r) => s + Number(r.abf_amount  ?? 0), 0)
  return { month, totalSims, totalAbf, rows: data.length }
}

// ── Fetch relevant data from Supabase ─────────────────────────────────────────
async function fetchContextData(userQuestion: string): Promise<{ context: string; latestMonth: string }> {
  const sb = getSupabase()
  const intent = detectIntent(userQuestion)
  const sections: string[] = []

  // Always get the latest month first so we can resolve "current month"
  const { data: latestRec } = await sb
    .from('monthly_records')
    .select('month')
    .order('month', { ascending: false })
    .limit(1)
  const latestMonth = latestRec?.[0]?.month ?? '2026-04'

  try {
    // ── Compare two months ───────────────────────────────────────────────────
    if (intent.wantsCompare && (intent.allMonths.length > 0 || intent.wantsCurrent)) {
      // Build list of months to compare
      const monthsToFetch = new Set<string>(intent.allMonths)
      if (intent.wantsCurrent || intent.allMonths.length < 2) monthsToFetch.add(latestMonth)

      const results = await Promise.all(Array.from(monthsToFetch).map(m => fetchAbfForMonth(sb, m)))
      const valid = results.filter(Boolean) as { month: string; totalSims: number; totalAbf: number; rows: number }[]

      if (valid.length >= 1) {
        valid.sort((a, b) => b.month.localeCompare(a.month))
        sections.push('## ABF Comparison')
        valid.forEach(v => {
          const label = v.month === latestMonth ? `${v.month} (CURRENT/LATEST)` : v.month
          sections.push(`${label}: ABF = ₹${v.totalAbf.toFixed(4)} Cr (₹${(v.totalAbf * 100).toFixed(2)} Lakhs) | Active SIMs = ${v.totalSims.toLocaleString('en-IN')} | Customers = ${v.rows}`)
        })
        if (valid.length === 2) {
          const diff = valid[0].totalAbf - valid[1].totalAbf
          const pct  = valid[1].totalAbf > 0 ? ((diff / valid[1].totalAbf) * 100).toFixed(1) : 'N/A'
          sections.push(`Change: ${diff >= 0 ? '+' : ''}${diff.toFixed(4)} Cr (${diff >= 0 ? '+' : ''}${pct}%)`)
        }
      }
    }

    // ── Stage 4 opportunities ────────────────────────────────────────────────
    // po_value & annualized_value are stored in LAKHS
    if (intent.wantsStage4 || (!intent.wantsStage1 && !intent.wantsSims && !intent.wantsBilling && intent.namMentioned)) {
      let q = sb
        .from('funnel_opportunities')
        .select('customer_name, nam_name, po_value, annualized_value, po_date, commissioned_qty, product_vertical, billing_cycle, abf_generated_total')
        .eq('funnel_stage', 4)
        .order('po_value', { ascending: false })
        .limit(50)

      if (intent.namMentioned) {
        q = q.ilike('nam_name', `%${intent.namMentioned}%`)
      }

      const { data, error } = await q
      if (!error && data && data.length > 0) {
        const total    = data.reduce((s, r) => s + Number(r.po_value ?? 0), 0)
        const annTotal = data.reduce((s, r) => s + Number(r.annualized_value ?? 0), 0)
        const abfTotal = data.reduce((s, r) => s + Number(r.abf_generated_total ?? 0), 0)
        sections.push(
          `## Stage 4 Closed Deals${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}`,
          `Count: ${data.length} | Total PO Value: ₹${total.toFixed(3)} Lakhs | Annualised: ₹${annTotal.toFixed(3)} Lakhs | ABF Generated: ₹${abfTotal.toFixed(3)} Lakhs`,
          'Customer | NAM | PO Value (L) | Annualised (L) | ABF Generated (L) | Commissioned Qty',
          ...data.map(r =>
            `${r.customer_name} | ${r.nam_name} | ${Number(r.po_value ?? 0).toFixed(3)} | ${Number(r.annualized_value ?? 0).toFixed(3)} | ${Number(r.abf_generated_total ?? 0).toFixed(3)} | ${r.commissioned_qty ?? '—'}`
          )
        )
      } else if (!error && data?.length === 0) {
        sections.push(`## Stage 4 Opportunities${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}: No records found.`)
      }
    }

    // ── Stage 1 opportunities ────────────────────────────────────────────────
    // after_discount is stored in LAKHS (estimated deal value)
    if (intent.wantsStage1) {
      let q = sb
        .from('funnel_opportunities')
        .select('customer_name, nam_name, main_category, product_name, after_discount, base_tariff, commitment, remarks_current')
        .eq('funnel_stage', 1)
        .order('after_discount', { ascending: false })
        .limit(50)

      if (intent.namMentioned) {
        q = q.ilike('nam_name', `%${intent.namMentioned}%`)
      }

      const { data, error } = await q
      if (!error && data && data.length > 0) {
        const total = data.reduce((s, r) => s + Number(r.after_discount ?? 0), 0)
        sections.push(
          `## Stage 1 Pipeline${intent.namMentioned ? ` (NAM: ${intent.namMentioned})` : ''}`,
          `Count: ${data.length} | Total Pipeline Value: ₹${total.toFixed(3)} Lakhs`,
          'Customer | NAM | Value (L) | Category | Product | Commitment',
          ...data.map(r =>
            `${r.customer_name} | ${r.nam_name} | ${Number(r.after_discount ?? 0).toFixed(3)} | ${r.main_category ?? '—'} | ${r.product_name ?? '—'} | ${r.commitment ?? '—'}`
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
        // Resolve "current month" → latestMonth; fallback to first row's month
        const targetMonth = intent.wantsCurrent ? latestMonth : (intent.monthMentioned ?? data[0].month)
        let rows = data.filter(r => r.month === targetMonth)

        if (intent.namMentioned) {
          rows = rows.filter(r => {
            const c = r.customers as { name?: string; nam_name?: string } | null
            return c?.nam_name?.toUpperCase().includes(intent.namMentioned!) ?? false
          })
        }

        // abf_amount is stored in CRORES
        const totalSims = rows.reduce((s, r) => s + Number(r.active_sims ?? 0), 0)
        const totalAbf  = rows.reduce((s, r) => s + Number(r.abf_amount  ?? 0), 0)

        sections.push(
          `## Active SIMs & Billing (Month: ${targetMonth})${intent.namMentioned ? ` — NAM: ${intent.namMentioned}` : ''}`,
          `Total Active SIMs: ${totalSims.toLocaleString('en-IN')} | Total ABF: ₹${totalAbf.toFixed(4)} Cr (= ₹${(totalAbf * 100).toFixed(2)} Lakhs) | Customers: ${rows.length}`,
          'Customer | NAM | Active SIMs | ABF (Cr)',
          ...rows.map(r => {
            const c = r.customers as { name?: string; nam_name?: string } | null
            return `${c?.name ?? '—'} | ${c?.nam_name ?? '—'} | ${Number(r.active_sims ?? 0).toLocaleString('en-IN')} | ${Number(r.abf_amount ?? 0).toFixed(4)}`
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
        sb.from('funnel_opportunities').select('po_value, annualized_value').eq('funnel_stage', 4),
        sb.from('funnel_opportunities').select('after_discount').eq('funnel_stage', 1),
        sb.from('monthly_records').select('active_sims, abf_amount, month').order('month', { ascending: false }).limit(300),
      ])

      // po_value / after_discount in LAKHS; abf_amount in CRORES
      const totalS4   = (s4Res.data ?? []).reduce((s, r) => s + Number(r.po_value ?? 0), 0)
      const totalS1   = (s1Res.data ?? []).reduce((s, r) => s + Number(r.after_discount ?? 0), 0)
      const latestRows  = (simRes.data ?? []).filter(r => r.month === latestMonth)
      const totalSims   = latestRows.reduce((s, r) => s + Number(r.active_sims ?? 0), 0)
      const totalAbf    = latestRows.reduce((s, r) => s + Number(r.abf_amount  ?? 0), 0)

      sections.push(
        '## Dashboard Summary',
        `Total Customers: ${custRes.count ?? '—'}`,
        `Stage 4 (Closed): ${s4Res.data?.length ?? 0} deals | Total PO Value: ₹${totalS4.toFixed(3)} Lakhs`,
        `Stage 1 (Pipeline): ${s1Res.data?.length ?? 0} opportunities | Total Pipeline: ₹${totalS1.toFixed(3)} Lakhs`,
        `Active SIMs (${latestMonth}): ${totalSims.toLocaleString('en-IN')} | ABF: ₹${totalAbf.toFixed(4)} Cr (₹${(totalAbf * 100).toFixed(2)} Lakhs)`,
      )
    }

  } catch (err) {
    console.error('Data fetch error:', err)
  }

  const context = sections.length > 0
    ? `\n\n---\nLIVE DATA FROM DATABASE (latest available month = ${latestMonth}):\n${sections.join('\n')}\n---`
    : `\n\n(No specific data found for this query. Latest available month in database: ${latestMonth})`

  return { context, latestMonth }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(latestMonth: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  return `You are an intelligent assistant for the BSNL M2M Inventory Dashboard used by National Account Managers (NAMs) to track M2M SIM business.

IMPORTANT DATE CONTEXT:
- Today's date: ${dateStr} (Year ${now.getFullYear()})
- Latest/current month in the database: ${latestMonth}
- When the user says "current month" or "this month", they mean: ${latestMonth}
- Historical data available: April 2025 through ${latestMonth}

Key concepts:
- M2M SIMs: Machine-to-Machine SIM cards used in IoT/connected devices
- NAM: National Account Manager, each manages a set of enterprise customers
- ABF: Annualised Billing Figure — monthly billing amount (stored in Crores in DB)
- Stage 1: Pipeline opportunity (not yet closed), values in Lakhs
- Stage 4: Closed deal with Purchase Order (PO) and billing active, values in Lakhs
- Active SIMs: SIMs currently billed in monthly records
- SIM Dump: Actual SIMs active in network (from BSNL's monthly data dump)

When live data is provided, use it to answer precisely with actual numbers. Be concise — 3-5 sentences max unless a table is needed.`
}

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
  const { context: dataContext, latestMonth } = await fetchContextData(lastUserMsg)
  const systemPrompt = buildSystemPrompt(latestMonth) + dataContext

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
