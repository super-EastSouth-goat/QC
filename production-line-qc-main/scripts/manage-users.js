/**
 * User Management Script
 * 用户管理脚本
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const env = {}
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      }
    })
  } catch (error) {
    console.error('❌ Error reading .env.local:', error.message)
  }
  
  return env
}

const env = loadEnvFile()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listUsers() {
  console.log('👥 Listing all users...\n')

  try {
    // Get profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    // Get auth users (with service role we can access auth.users)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.warn('⚠️ Could not fetch auth users:', authError.message)
    }

    console.log('📋 User List:')
    console.log('─'.repeat(100))
    console.log('ID'.padEnd(40) + 'Email'.padEnd(30) + 'Role'.padEnd(15) + 'Station'.padEnd(15))
    console.log('─'.repeat(100))

    profiles.forEach(profile => {
      const authUser = authUsers?.users.find(u => u.id === profile.id)
      const email = authUser?.email || 'Unknown'
      
      console.log(
        profile.id.padEnd(40) + 
        email.padEnd(30) + 
        profile.role.padEnd(15) + 
        (profile.station || '-').padEnd(15)
      )
    })

    console.log('─'.repeat(100))
    console.log(`Total users: ${profiles.length}`)

  } catch (error) {
    console.error('❌ Error listing users:', error)
  }
}

async function setUserRole(userId, role) {
  console.log(`🔧 Setting user ${userId} role to ${role}...`)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()

    if (error) throw error

    if (data.length === 0) {
      console.log('❌ User not found')
      return
    }

    console.log('✅ User role updated successfully')
    console.log('Updated user:', data[0])

  } catch (error) {
    console.error('❌ Error updating user role:', error)
  }
}

async function setUserRoleByEmail(email, role) {
  console.log(`🔧 Setting user with email ${email} role to ${role}...`)

  try {
    // First find the user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) throw authError

    const user = authUsers.users.find(u => u.email === email)
    if (!user) {
      console.log('❌ User with email not found')
      return
    }

    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)
      .select()

    if (error) throw error

    if (data.length === 0) {
      console.log('❌ Profile not found for user')
      return
    }

    console.log('✅ User role updated successfully')
    console.log('Updated user:', { id: user.id, email: user.email, role: data[0].role })

  } catch (error) {
    console.error('❌ Error updating user role:', error)
  }
}

// Command line interface
const command = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]

async function main() {
  switch (command) {
    case 'list':
      await listUsers()
      break
    
    case 'set-role':
      if (!arg1 || !arg2) {
        console.log('Usage: node scripts/manage-users.js set-role <user-id> <role>')
        console.log('Roles: worker, supervisor, admin')
        return
      }
      await setUserRole(arg1, arg2)
      break
    
    case 'set-role-by-email':
      if (!arg1 || !arg2) {
        console.log('Usage: node scripts/manage-users.js set-role-by-email <email> <role>')
        console.log('Roles: worker, supervisor, admin')
        return
      }
      await setUserRoleByEmail(arg1, arg2)
      break
    
    default:
      console.log('Available commands:')
      console.log('  list                                    - List all users')
      console.log('  set-role <user-id> <role>              - Set user role by ID')
      console.log('  set-role-by-email <email> <role>       - Set user role by email')
      console.log('')
      console.log('Examples:')
      console.log('  node scripts/manage-users.js list')
      console.log('  node scripts/manage-users.js set-role-by-email jenny.lai@clt-inc.tech admin')
      break
  }
}

main().catch(console.error)