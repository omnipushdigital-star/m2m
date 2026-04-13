/** Normalize a customer name for fuzzy matching */
export function normalizeName(s: string): string[] {
  return s
    .toUpperCase()
    .replace(/PRIVATE LIMITED|PVT\.?\s*LTD\.?|LIMITED|LTD\.?|LLP|INCORPORATED|INC\.?|CORPORATION|CORP\.?|COMPANY|CO\.|SERVICES|SERVICE/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

/** Jaccard token similarity score (0–1) */
export function jaccardScore(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1
  if (a.length === 0 || b.length === 0) return 0
  const sa = new Set(a)
  const sb = new Set(b)
  const inter = Array.from(sa).filter(t => sb.has(t)).length
  const union = new Set([...Array.from(sa), ...Array.from(sb)]).size
  return inter / union
}

export type CustomerRef = { id: string; name: string; tokens: string[] }

/** Find best fuzzy match for a raw customer name against a list of customers */
export function findBestMatch(
  rawName: string,
  customers: CustomerRef[]
): { customerId: string; customerName: string; score: number } | null {
  const tokens = normalizeName(rawName)
  let best = { customerId: '', customerName: '', score: 0 }

  for (const c of customers) {
    const score = jaccardScore(tokens, c.tokens)
    if (score > best.score) {
      best = { customerId: c.id, customerName: c.name, score }
    }
  }

  return best.score > 0 ? best : null
}
