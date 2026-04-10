import { getSupabase } from '@/lib/supabase'
import { MonthlyReportTable } from '@/components/monthly-report-table'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = getSupabase()
  const params = await searchParams

  const { data: monthRows } = await supabase
    .from('monthly_records')
    .select('month')
    .order('month', { ascending: false })

  const allMonths = Array.from(new Set((monthRows ?? []).map((r) => r.month)))
  if (allMonths.length === 0) {
    allMonths.push(new Date().toISOString().slice(0, 7))
  }

  const month = params.month ?? allMonths[0]

  const { data: records } = await supabase
    .from('monthly_records')
    .select('*, customer:customers(name, nam_name, product_vertical)')
    .eq('month', month)
    .order('created_at')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Monthly Report</h1>
      <MonthlyReportTable
        rows={(records ?? []) as unknown as import('@/lib/export').ReportRow[]}
        month={month}
        allMonths={allMonths}
      />
    </div>
  )
}
