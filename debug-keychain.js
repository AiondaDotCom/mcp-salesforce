#!/usr/bin/env node
/**
 * Debug script to check Keychain access and token validity
 */

import { KeychainManager } from './src/auth/keychain.js';
import { TokenManager } from './src/auth/token-manager.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugKeychain() {
  console.log('🔍 **Debugging Keychain Access**\n');
  
  const keychain = new KeychainManager();
  
  try {
    // Test 1: Check if keychain entry exists
    console.log('1️⃣ **Checking Keychain Entry...**');
    const tokens = await keychain.getTokens();
    
    if (tokens) {
      console.log('✅ Keychain entry found');
      console.log(`   - Instance URL: ${tokens.instance_url}`);
      console.log(`   - Stored at: ${tokens.stored_at}`);
      console.log(`   - Updated at: ${tokens.updated_at || 'Not set'}`);
      
      if (tokens.expires_at) {
        const expiresIn = Math.round((tokens.expires_at - Date.now()) / (1000 * 60));
        console.log(`   - Expires in: ${expiresIn} minutes`);
        console.log(`   - Needs refresh: ${expiresIn < 5 ? 'Yes' : 'No'}`);
      } else {
        console.log('   - No expiration info');
      }
      
      console.log(`   - Has access token: ${!!tokens.access_token}`);
      console.log(`   - Has refresh token: ${!!tokens.refresh_token}`);
    } else {
      console.log('❌ No keychain entry found');
      return;
    }
    
    console.log('\n2️⃣ **Testing Token Manager...**');
    
    // Test 2: TokenManager initialization
    const tokenManager = new TokenManager(
      process.env.SALESFORCE_CLIENT_ID,
      process.env.SALESFORCE_CLIENT_SECRET,
      process.env.SALESFORCE_INSTANCE_URL
    );
    
    const initialized = await tokenManager.initialize();
    console.log(`   - TokenManager initialized: ${initialized ? 'Yes' : 'No'}`);
    
    if (initialized) {
      const tokenInfo = tokenManager.getTokenInfo();
      console.log('   - Token info:', JSON.stringify(tokenInfo, null, 4));
      
      // Test 3: Get valid access token
      console.log('\n3️⃣ **Testing Access Token...**');
      try {
        const accessToken = await tokenManager.getValidAccessToken();
        console.log('✅ Access token retrieved successfully');
        console.log(`   - Token length: ${accessToken.length} characters`);
        console.log(`   - Token starts with: ${accessToken.substring(0, 20)}...`);
        
        // Test 4: Test API call
        console.log('\n4️⃣ **Testing API Call...**');
        const testResult = await tokenManager.testTokens();
        console.log(`   - API test result:`, testResult);
        
      } catch (error) {
        console.log('❌ Error getting access token:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Error accessing keychain:', error.message);
    console.log('   Stack trace:', error.stack);
  }
}

// Test environment variables
console.log('🔧 **Environment Variables**');
console.log(`SALESFORCE_CLIENT_ID: ${process.env.SALESFORCE_CLIENT_ID ? 'Set' : 'Not set'}`);
console.log(`SALESFORCE_CLIENT_SECRET: ${process.env.SALESFORCE_CLIENT_SECRET ? 'Set' : 'Not set'}`);
console.log(`SALESFORCE_INSTANCE_URL: ${process.env.SALESFORCE_INSTANCE_URL || 'Not set'}`);
console.log('');

debugKeychain().catch(console.error);
