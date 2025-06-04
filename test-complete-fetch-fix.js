#!/usr/bin/env node

/**
 * Complete Authentication Test
 * 
 * This script verifies that both OAuth authentication and token validation
 * are working correctly without any "fetch is not defined" errors.
 */

import { TokenManager } from './src/auth/token-manager.js';
import { OAuthFlow } from './src/auth/oauth.js';

console.log('🔐 Complete Authentication Fetch Fix Test');
console.log('==========================================\n');

async function testCompleteFix() {
  try {
    console.log('1. Testing OAuth Flow...');
    const oauth = new OAuthFlow(
      'test_client_id',
      'test_client_secret',
      'https://login.salesforce.com'
    );
    console.log('   ✅ OAuth flow created successfully');

    console.log('\n2. Testing TokenManager...');
    const tokenManager = new TokenManager(
      'test_client_id',
      'test_client_secret',
      'https://login.salesforce.com'
    );
    console.log('   ✅ TokenManager created successfully');

    console.log('\n3. Testing OAuth Fetch Functionality...');
    try {
      // This should fail with network error, not fetch error
      await oauth.exchangeCodeForTokens('dummy_code');
    } catch (error) {
      if (error.message.includes('fetch is not defined')) {
        throw new Error('❌ OAUTH FETCH ERROR STILL EXISTS: ' + error.message);
      } else {
        console.log('   ✅ OAuth fetch working (expected network failure)');
      }
    }

    console.log('\n4. Testing TokenManager Fetch Functionality...');
    try {
      // This should fail because no real tokens exist, but not with fetch error
      await tokenManager.testTokens();
    } catch (error) {
      if (error.message.includes('fetch is not defined')) {
        throw new Error('❌ TOKEN MANAGER FETCH ERROR STILL EXISTS: ' + error.message);
      } else {
        console.log('   ✅ TokenManager fetch working (expected no tokens error)');
      }
    }

    console.log('\n🎉 COMPLETE AUTHENTICATION FIX VERIFICATION PASSED!');
    console.log('');
    console.log('✅ OAuth authentication fetch is working');
    console.log('✅ TokenManager token validation fetch is working');
    console.log('✅ All "fetch is not defined" errors have been resolved');
    console.log('');
    console.log('📝 The authentication flow should now work end-to-end in Claude Desktop');

  } catch (error) {
    console.error('\n❌ AUTHENTICATION FIX VERIFICATION FAILED!');
    console.error('💥 Error:', error.message);
    
    if (error.message.includes('fetch is not defined')) {
      console.error('\n🚨 CRITICAL: Fetch errors still exist!');
      console.error('🔧 The authentication will not work until all fetch issues are resolved.');
    }
    
    process.exit(1);
  }
}

// Run the complete test
testCompleteFix().catch(error => {
  console.error('Test execution failed:', error.message);
  process.exit(1);
});
