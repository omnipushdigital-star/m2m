import { NextRequest, NextResponse } from 'next/server'

// Use Node.js runtime (not edge) for reliable fetch + env var access
export const dynamic = 'force-dynamic'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const MODEL = 'google/gemma-4-31b-it'

const SYSTEM_PROMPT = `You are an intelligent assistant for the BSNL M2M Inventory Dashboard — an internal tool used by BSNL's National Account Managers (NAMs) to track M2M (Machine-to-Machine) SIM business.

Context about the dashboard:
- BSNL sells M2M SIM cards to enterprise customers for IoT/connected devices
- The team has ~96 enterprise customers managed by multiple NAMs (National Account Managers)
- There are 19+ plans (tariff plans) for M2M SIMs
- Key modules: Customer Overview, SIM Inventory, Lead-to-Bill funnel, NAM Registry

Key data tracked:
- Customers: name, NAM assigned, active SIM counts, monthly billing (ABF = Annualised Billing Figure)
- SIM Inventory: actual SIMs active in network (from monthly dump files), compared vs billing records
- Funnel: Stage 1 = pipeline opportunities, Stage 4 = closed/billed deals with PO details
- Monthly Records: active SIMs per customer per month, ABF amount
- Plans: each customer can have multiple SIM plans (e.g. M2M Basic, M2M Pro, etc.)

Your role:
- Answer questions about the M2M business, telecom terms, SIM management
- Help interpret data shown on the dashboard (user will describe what they see)
- Explain telecom/M2M concepts simply
- Suggest how to use the dashboard features
- Keep answers concise and business-focused
- Use Indian numbering (lakhs, crores) when discussing money

You do NOT have direct access to live database records — you rely on what the user tells you or describes. Be helpful, honest, and keep responses short (2-4 sentences unless a longer explanation is needed).`

export async function POST(req: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 })
  }

  let messages: { role: string; content: string }[]
  try {
    const body = await req.json()
    messages = body.messages ?? []
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 1.0,
        top_p: 0.95,
        max_tokens: 1024,
        stream: false,
      }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error('NVIDIA API error:', response.status, responseText)
      return NextResponse.json(
        { error: `AI service returned ${response.status}` },
        { status: 502 }
      )
    }

    let data: { choices?: { message?: { content?: string } }[] }
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse NVIDIA response:', responseText.slice(0, 200))
      return NextResponse.json({ error: 'Invalid response from AI service' }, { status: 502 })
    }

    const content = data.choices?.[0]?.message?.content ?? 'No response received.'
    return NextResponse.json({ content })

  } catch (err) {
    console.error('Chat route fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach AI service' }, { status: 500 })
  }
}
