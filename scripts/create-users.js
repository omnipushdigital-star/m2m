/**
 * Creates two auth users in Supabase:
 *   admin@bsnl-ggn.in   role: admin   (full edit access)
 *   viewer@bsnl-ggn.in  role: viewer  (read-only)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Run: node scripts/create-users.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Need service role key for admin user creation
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.error('\n⚠ SUPABASE_SERVICE_ROLE_KEY not set in .env.local')
  console.error('Get it from: Supabase Dashboard → Project Settings → API → service_role key\n')
  process.exit(1)
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const USERS = [
  { email: 'admin@bsnl-ggn.in',  password: 'BsnlGgn@Admin#2026',  role: 'admin'  },
  { email: 'viewer@bsnl-ggn.in', password: 'BsnlGgn@View#2026',   role: 'viewer' },
]

async function main() {
  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role },
    })
    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  already exists: ${u.email}`)
      } else {
        console.error(`  ✕ ${u.email}:`, error.message)
      }
    } else {
      console.log(`  ✓ Created ${u.role}: ${u.email}`)
    }
  }
  console.log('\nCredentials:')
  USERS.forEach(u => console.log(`  ${u.role.padEnd(7)} ${u.email}  /  ${u.password}`))
}

main().catch(console.error)
