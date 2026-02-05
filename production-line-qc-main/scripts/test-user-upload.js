/**
 * Test user upload to storage
 * 测试用户上传到存储
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Create client with anon key (like frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUserUpload() {
  console.log('🔍 Testing User Upload to Storage...\n')

  try {
    // 1. Check if we have a user session
    console.log('1. Checking Authentication:')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ Auth error:', userError)
      console.log('📝 You need to be logged in to test user upload')
      console.log('   Try logging in through the web app first')
      return
    }

    if (!user) {
      console.log('❌ No authenticated user found')
      console.log('📝 You need to be logged in to test user upload')
      console.log('   Try logging in through the web app first')
      return
    }

    console.log(`✅ Authenticated user: ${user.email} (${user.id})`)

    // 2. Test upload with user folder structure
    console.log('\n2. Testing Upload with User Folder Structure:')
    const testFileName = `${user.id}/test-upload-${Date.now()}.txt`
    const testContent = 'This is a test upload from authenticated user'
    
    console.log(`📤 Uploading to: qc-images/${testFileName}`)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qc-images')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      })

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError)
      console.log('\n🔍 Debugging info:')
      console.log('   - File path:', testFileName)
      console.log('   - User ID:', user.id)
      console.log('   - Bucket: qc-images')
      
      // Check if it's an RLS policy issue
      if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
        console.log('\n📝 This looks like an RLS policy issue!')
        console.log('   The RLS policy might be expecting a different folder structure')
        console.log('   or the policy conditions are not met.')
      }
    } else {
      console.log('✅ Upload successful:', uploadData.path)
      
      // Test getting public URL
      const { data: urlData } = supabase.storage
        .from('qc-images')
        .getPublicUrl(uploadData.path)
      
      console.log('🔗 Public URL:', urlData.publicUrl)
      
      // Clean up
      const { error: deleteError } = await supabase.storage
        .from('qc-images')
        .remove([testFileName])
      
      if (deleteError) {
        console.warn('⚠️ Failed to clean up test file:', deleteError)
      } else {
        console.log('🧹 Test file cleaned up')
      }
    }

    // 3. Test upload without user folder (should fail if RLS is working)
    console.log('\n3. Testing Upload without User Folder (should fail):')
    const badFileName = `test-no-folder-${Date.now()}.txt`
    
    const { data: badUploadData, error: badUploadError } = await supabase.storage
      .from('qc-images')
      .upload(badFileName, testContent, {
        contentType: 'text/plain'
      })

    if (badUploadError) {
      console.log('✅ Upload correctly failed (RLS working):', badUploadError.message)
    } else {
      console.log('⚠️ Upload succeeded when it should have failed')
      console.log('   This might indicate RLS policies are too permissive')
      
      // Clean up
      await supabase.storage.from('qc-images').remove([badFileName])
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test
testUserUpload().then(() => {
  console.log('\n✅ User upload test completed')
}).catch(error => {
  console.error('❌ Test error:', error)
  process.exit(1)
})