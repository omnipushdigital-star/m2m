const XLSX = require('xlsx')
const path = require('path')

const file = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM',
  'AGENDA MEETING APRIL 24', 'agenda data', 'GGN_Lead to Bill_01062025.xlsx')

const wb = XLSX.readFile(file)
console.log('Sheets:', wb.SheetNames)

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  console.log(`\n=== Sheet: "${sheetName}" (${rows.length} rows) ===`)
  rows.slice(0, 12).forEach((r, i) => console.log(`[${i}]`, JSON.stringify(r)))
}
