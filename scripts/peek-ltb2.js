const XLSX = require('xlsx')
const path = require('path')

const file = path.join('D:', 'MAC', 'Desktop', 'BSNL', 'Gurgaon', 'NAM',
  'AGENDA MEETING APRIL 24', 'agenda data', 'GGN_Lead to Bill_01062025.xlsx')

const wb = XLSX.readFile(file)

// Sheet 1: first 5 data rows only
const ws1 = wb.Sheets[wb.SheetNames[0]]
const rows1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' })
console.log('Sheet1 headers:', JSON.stringify(rows1[0]).slice(0, 800))
console.log('Row1:', JSON.stringify(rows1[1]).slice(0, 600))
console.log('Row2:', JSON.stringify(rows1[2]).slice(0, 600))
console.log('Total rows:', rows1.length)

// Sheet 3: Ongoing Projects
const ws3 = wb.Sheets[wb.SheetNames[2]]
const rows3 = XLSX.utils.sheet_to_json(ws3, { header: 1, defval: '' })
console.log('\nSheet3 headers:', JSON.stringify(rows3[0]).slice(0, 600))
console.log('Row1:', JSON.stringify(rows3[1]).slice(0, 600))
console.log('Total rows:', rows3.length)
