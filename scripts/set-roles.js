// Script to assign roles to existing Supabase users
// Usage: node scripts/set-roles.js

const SUPABASE_URL = 'https://fvkiaiiuookighromliv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a2lhaWl1b29raWdocm9tbGl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY5NTU5NywiZXhwIjoyMDkxMjcxNTk3fQ.CZpV33W8sfb8GZniTH-pclBSkagN-PXN1AUbT1mYAcI'

// User assignments: email → role
const roleAssignments = [
  { email: 'naveen.bsnlgurgaon@gmail.com', role: 'viewer' },
  { email: 'naveen2k5@gmail.com',          role: 'admin'  },
]

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const data = await res.json()
  return data.users || []
}

async function setRole(userId, role) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_metadata: { role } }),
  })
  return res.json()
}

async function main() {
  if (SERVICE_ROLE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌  Please edit the script and paste your Supabase service role key first.')
    process.exit(1)
  }

  console.log('🔍  Fetching users...')
  const users = await listUsers()
  console.log(`   Found ${users.length} user(s)`)

  for (const { email, role } of roleAssignments) {
    const user = users.find(u => u.email === email)
    if (!user) {
      console.warn(`⚠️   User not found: ${email}`)
      continue
    }
    const result = await setRole(user.id, role)
    if (result.id) {
      console.log(`✅  ${email} → role = "${role}"`)
    } else {
      console.error(`❌  Failed for ${email}:`, result)
    }
  }

  console.log('\n🎉  Done! Users can now log in at m2m-inventory.vercel.app')
}

main().catch(console.error)
