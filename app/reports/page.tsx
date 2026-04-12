import { getSupabase } from '@/lib/supabase'
import { ReportBuilder } from '@/components/report-builder'

export const metadata = { title: 'Custom Report Builder' }
export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = getSupabase()

  const [{ data: monthRows }, { data: namRows }] = await Promise.all([
    supabase
      .from('monthly_records')
      .select('month')
      .order('month', { ascending: false }),
    supabase
      .from('customers')
      .select('nam_name')
      .not('nam_name', 'is', null)
      .order('nam_name'),
  ])

  const allMonths = Array.from(new Set((monthRows ?? []).map(r => r.month)))
  if (allMonths.length === 0) allMonths.push(new Date().toISOString().slice(0, 7))

  const allNams = Array.from(new Set((namRows ?? []).map(r => r.nam_name as string).filter(Boolean))).sort()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Report Builder</h1>
        <p className="text-sm text-slate-500 mt-1">Select a report type, configure filters, preview data and export to Excel</p>
      </div>
      <ReportBuilder allMonths={allMonths} allNams={allNams} />
    </div>
  )
}
