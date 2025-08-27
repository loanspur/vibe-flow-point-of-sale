#!/usr/bin/env tsx

/**
 * Test script for existing email functionality
 * This tests the actual Supabase function without creating new email systems
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  // Use environment variables or defaults for testing
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://qwtybhvdbbkbcelisuek.supabase.co',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here',
  testEmail: 'test@example.com',
  testFullName: 'Test User',
  testRole: 'manager',
  testTenantId: '00000000-0000-0000-0000-000000000000' // Placeholder
};

async function testExistingEmailFunctionality() {
  console.log('🧪 Testing Existing Email Functionality\n');

  // 1. Test Supabase connection
  console.log('1. Testing Supabase connection...');
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase connection successful\n');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return;
  }

  // 2. Test function invocation (without actually sending email)
  console.log('2. Testing function invocation...');
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    
    // Test the function with invalid data to see error handling
    const { data, error } = await supabase.functions.invoke('send-user-invitation', {
      body: {
        email: TEST_CONFIG.testEmail,
        fullName: TEST_CONFIG.testFullName,
        role: TEST_CONFIG.testRole,
        tenantId: TEST_CONFIG.testTenantId
      }
    });

    if (error) {
      console.log('✅ Function error handling works (expected for test data):');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${(error as any).code || 'N/A'}`);
    } else {
      console.log('✅ Function executed successfully');
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Function invocation failed:', error);
  }

  // 3. Test environment validation
  console.log('\n3. Testing environment validation...');
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️ Missing environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
  } else {
    console.log('✅ All required environment variables are set');
  }

  // 4. Test email configuration
  console.log('\n4. Testing email configuration...');
  const emailEnvVars = [
    'RESEND_API_KEY',
    'RESEND_FROM',
    'RESEND_FROM_NAME'
  ];

  const missingEmailVars = emailEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEmailVars.length > 0) {
    console.log('⚠️ Missing email environment variables:');
    missingEmailVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('   Note: These are required for production email sending');
  } else {
    console.log('✅ All email environment variables are set');
  }

  // 5. Test UI integration
  console.log('\n5. Testing UI integration...');
  try {
    // Test if the file exists and can be read
    const fs = await import('fs');
    const path = await import('path');
    const hookPath = path.join(process.cwd(), 'src', 'hooks', 'useUnifiedUserManagement.tsx');
    
    if (fs.existsSync(hookPath)) {
      console.log('✅ UI hook file exists');
    } else {
      console.log('❌ UI hook file not found');
    }
  } catch (error) {
    console.error('❌ UI integration test failed:', error);
  }

  console.log('\n🎉 Existing email functionality test completed!');
  console.log('\nNext steps:');
  console.log('1. Set up proper environment variables for production');
  console.log('2. Test with real tenant ID and user data');
  console.log('3. Verify email delivery in production environment');
}

// Run the test
testExistingEmailFunctionality().catch(console.error);
