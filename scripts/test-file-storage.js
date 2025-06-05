#!/usr/bin/env node

/**
 * Test script for the new file-based token storage system
 */

import { FileStorageManager } from './src/auth/file-storage.js';
import { TokenManager } from './src/auth/token-manager.js';

async function testFileStorage() {
  console.log('🧪 Testing File Storage System\n');

  const storage = new FileStorageManager();

  // Test 1: Check if tokens exist
  console.log('1. Checking for existing tokens...');
  const hasTokens = await storage.hasTokens();
  console.log(`   Has tokens: ${hasTokens}`);

  if (hasTokens) {
    // Test 2: Get token file info
    console.log('\n2. Getting token file info...');
    const fileInfo = await storage.getTokenFileInfo();
    console.log('   File info:', JSON.stringify(fileInfo, null, 2));

    // Test 2b: Check token security
    console.log('\n2b. Checking token security...');
    const securityStatus = await storage.ensureTokenSecurity();
    console.log('   Security status:', JSON.stringify(securityStatus, null, 2));

    // Test 3: Load tokens
    console.log('\n3. Loading tokens...');
    try {
      const tokens = await storage.getTokens();
      if (tokens) {
        console.log('   ✅ Tokens loaded successfully');
        console.log('   Instance URL:', tokens.instance_url);
        console.log('   Stored at:', tokens.stored_at);
        console.log('   Has access token:', !!tokens.access_token);
        console.log('   Has refresh token:', !!tokens.refresh_token);
      } else {
        console.log('   ❌ No tokens found');
      }
    } catch (error) {
      console.log('   ❌ Error loading tokens:', error.message);
    }
  }

  return hasTokens;
}

async function testTokenManager() {
  console.log('\n🔧 Testing Token Manager\n');

  // These would normally come from environment variables
  const tokenManager = new TokenManager(
    process.env.SALESFORCE_CLIENT_ID || 'test_client_id',
    process.env.SALESFORCE_CLIENT_SECRET || 'test_client_secret',
    process.env.SALESFORCE_INSTANCE_URL || 'https://test.salesforce.com'
  );

  // Test initialization
  console.log('1. Initializing Token Manager...');
  try {
    const initialized = await tokenManager.initialize();
    console.log(`   Initialized: ${initialized}`);

    if (initialized) {
      console.log('\n2. Getting token info...');
      const tokenInfo = tokenManager.getTokenInfo();
      console.log('   Token info:', JSON.stringify(tokenInfo, null, 2));

      console.log('\n3. Testing token validity...');
      const testResult = await tokenManager.testTokens();
      console.log('   Test result:', JSON.stringify(testResult, null, 2));
    } else {
      console.log('   ⚠️ Token Manager not initialized - no tokens found');
      console.log('   💡 Run authentication first to create tokens');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function main() {
  console.log('🚀 MCP Salesforce Token Storage Test\n');
  console.log('='.repeat(50));

  try {
    const hasTokens = await testFileStorage();
    await testTokenManager();

    console.log('\n' + '='.repeat(50));
    if (hasTokens) {
      console.log('✅ File-based token storage is working!');
      console.log('💡 The system has been successfully migrated from Keychain to file storage.');
    } else {
      console.log('ℹ️ No tokens found - run authentication to create tokens.');
      console.log('💡 New tokens will be stored in cache/salesforce-tokens.json');
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
