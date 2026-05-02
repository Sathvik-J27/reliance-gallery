import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dxtgxtqhxttjgjhlkilp.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dGd4dHFoeHR0amdqaGxraWxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3Nzc1NiwiZXhwIjoyMDkzMjUzNzU2fQ.nWDXQZZ-AhyCUaUISb29OadkCRFhlTrRMwBp11KEjYM'

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: node scripts/set-password.mjs <email> <new-password>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
if (listError) { console.error(listError.message); process.exit(1) }

const user = users.find(u => u.email === email)
if (!user) { console.error(`No user found with email: ${email}`); process.exit(1) }

const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
if (error) { console.error(error.message); process.exit(1) }

console.log(`Password updated for ${email}`)
