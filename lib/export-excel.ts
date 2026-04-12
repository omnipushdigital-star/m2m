import * as XLSX from 'xlsx'

/** Download rows as an .xlsx file in the browser */
export function downloadExcel(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width for all columns
  const cols = Object.keys(rows[0] ?? {})
  ws['!cols'] = cols.map(key => ({
    wch: Math.max(
      key.length,
      ...rows.map(r => String(r[key] ?? '').length)
    ) + 2
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
