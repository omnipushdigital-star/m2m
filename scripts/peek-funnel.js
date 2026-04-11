const XLSX = require('xlsx')
const path = require('path')

const file4 = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM', 'AGENDA MEETING APRIL 24', 'agenda data', 'stage 4 - March 2026.xls')
const file1 = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM', 'AGENDA MEETING APRIL 24', 'agenda data', 'STAGE 1 - March 26.xls')

function peek(file, label) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${label}: ${file}`)
  const wb = XLSX.readFile(file)
  console.log('Sheets:', wb.SheetNames)

  for (const sheetName of wb.SheetNames) {
    console.log(`\n--- Sheet: "${sheetName}" ---`)
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    console.log(`Total rows: ${rows.length}`)
    rows.slice(0, 10).forEach((r, i) => console.log(`  [${i}] ${JSON.stringify(r)}`))
  }
}

peek(file4, 'STAGE 4')
peek(file1, 'STAGE 1')
