#!/usr/bin/env node

/**
 * Test script to verify OAuth authentication fix
 * This tests that the "fetch is not defined" error has been resolved
 */

import { OAuthFlow } from './src/auth/oauth.js';

async function testOAuthFix() {
  console.log('🔧 Testing OAuth fetch fix...\n');

  try {
    // Test 1: Create OAuth flow instance
    console.log('1. Creating OAuth flow instance...');
    const oauth = new OAuthFlow(
      'test_client_id',
      'test_client_secret', 
      'https://login.salesforce.com',
      8080
    );
    console.log('   ✅ OAuth flow created successfully');

    // Test 2: Generate authorization URL
    console.log('\n2. Generating authorization URL...');
    const authUrl = oauth.getAuthorizationUrl();
    console.log('   ✅ Authorization URL generated');
    console.log('   📋 URL:', authUrl.substring(0, 80) + '...');

    // Test 3: Test fetch availability (this would previously fail)
    console.log('\n3. Testing fetch availability...');
    
    // Simulate what happens during token exchange
    try {
      await oauth.exchangeCodeForTokens('dummy_code');
    } catch (error) {
      // We expect this to fail with a network error, not a "fetch is not defined" error
      if (error.message.includes('fetch is not defined')) {
        throw new Error('❌ FETCH ERROR STILL EXISTS: ' + error.message);
      } else if (error.message.includes('Failed to exchange authorization code')) {
        console.log('   ✅ Fetch is working (expected network failure with dummy code)');
      } else {
        console.log('   ✅ Fetch is working (unexpected error but not fetch-related)');
      }
    }

    console.log('\n🎉 OAuth fix verification PASSED!');
    console.log('📝 The "fetch is not defined" error has been resolved.');
    console.log('🔐 OAuth authentication should now work properly.');

  } catch (error) {
    console.error('\n❌ OAuth fix verification FAILED!');
    console.error('💥 Error:', error.message);
    
    if (error.message.includes('fetch is not defined')) {
      console.error('\n🚨 The fetch error still exists. This needs to be fixed.');
    }
    
    process.exit(1);
  }
}

// Run the test
testOAuthFix().catch(console.error);
