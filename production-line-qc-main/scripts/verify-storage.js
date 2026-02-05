/**
 * Verify Supabase Storage Configuration
 * 验证 Supabase Storage 配置
 */

const { createClient } = require('@supabase/supabase-js')

// Read environment variables manually
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

async function verifyStorage() {
  console.log('🔍 Verifying Supabase Storage Configuration...\n')

  try {
    // 1. List all buckets
    console.log('1. Checking Storage Buckets:')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      return
    }

    console.log('📦 Available buckets:')
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })

    // Check if qc-images bucket exists
    const qcImagesBucket = buckets.find(b => b.name === 'qc-images')
    if (!qcImagesBucket) {
      console.log('\n❌ qc-images bucket not found!')
      console.log('📝 You need to create the qc-images bucket in Supabase Dashboard:')
      console.log('   1. Go to Storage in Supabase Dashboard')
      console.log('   2. Click "New bucket"')
      console.log('   3. Name: qc-images')
      console.log('   4. Set as Public bucket: Yes')
      return
    } else {
      console.log(`✅ qc-images bucket exists (${qcImagesBucket.public ? 'public' : 'private'})`)
    }

    // 2. Check RLS policies for storage.objects
    console.log('\n2. Checking Storage RLS Policies:')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects')

    if (policiesError) {
      console.error('❌ Error checking policies:', policiesError)
    } else {
      console.log(`📋 Found ${policies.length} RLS policies for storage.objects:`)
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
        console.log(`     Qual: ${policy.qual || 'N/A'}`)
        console.log(`     With Check: ${policy.with_check || 'N/A'}`)
      })
    }

    // 3. Test current user authentication
    console.log('\n3. Testing Authentication:')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('⚠️ No authenticated user (using service role)')
    } else if (user) {
      console.log(`✅ Authenticated user: ${user.email} (${user.id})`)
    } else {
      console.log('⚠️ No user found')
    }

    // 4. Test storage access with service role
    console.log('\n4. Testing Storage Access:')
    try {
      const testFileName = `test-${Date.now()}.txt`
      const testContent = 'This is a test file'
      
      // Try to upload a test file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qc-images')
        .upload(testFileName, testContent, {
          contentType: 'text/plain'
        })

      if (uploadError) {
        console.error('❌ Upload test failed:', uploadError)
      } else {
        console.log('✅ Upload test successful:', uploadData.path)
        
        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('qc-images')
          .remove([testFileName])
        
        if (deleteError) {
          console.warn('⚠️ Failed to clean up test file:', deleteError)
        } else {
          console.log('🧹 Test file cleaned up')
        }
      }
    } catch (error) {
      console.error('❌ Storage test error:', error)
    }

    // 5. Show current RLS policies in readable format
    console.log('\n5. Current Storage RLS Policies Analysis:')
    const insertPolicies = policies.filter(p => p.cmd === 'INSERT')
    const selectPolicies = policies.filter(p => p.cmd === 'SELECT')
    
    if (insertPolicies.length === 0) {
      console.log('❌ No INSERT policies found for storage.objects')
      console.log('📝 You may need to create RLS policies for file uploads')
    } else {
      console.log('✅ INSERT policies found:')
      insertPolicies.forEach(policy => {
        console.log(`   - ${policy.policyname}`)
      })
    }

    if (selectPolicies.length === 0) {
      console.log('❌ No SELECT policies found for storage.objects')
    } else {
      console.log('✅ SELECT policies found:')
      selectPolicies.forEach(policy => {
        console.log(`   - ${policy.policyname}`)
      })
    }

  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

// Run verification
verifyStorage().then(() => {
  console.log('\n✅ Storage verification completed')
}).catch(error => {
  console.error('❌ Verification error:', error)
  process.exit(1)
})