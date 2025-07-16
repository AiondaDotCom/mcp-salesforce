#!/usr/bin/env node

/**
 * Credentials System Unit Test
 * 
 * This test suite verifies the complete credentials management system
 * including TokenManager, FileStorageManager, and OAuthFlow.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Credentials System Unit Test\n');

// Test file path
const TEST_TOKEN_FILE = path.join(os.homedir(), '.mcp-salesforce-test.json');

// Clean up test file before and after tests
const cleanupTestFile = async () => {
  try {
    await fs.unlink(TEST_TOKEN_FILE);
  } catch (error) {
    // Ignore if file doesn't exist
  }
};

// Test environment variables
const testEnvVars = {
  SALESFORCE_CLIENT_ID: 'test_client_id_12345',
  SALESFORCE_CLIENT_SECRET: 'test_client_secret_67890',
  SALESFORCE_INSTANCE_URL: 'https://test.salesforce.com',
  NODE_ENV: 'test',
  DISABLE_BROWSER_OPEN: 'true'
};

// Backup original environment
const originalEnv = {};
Object.keys(testEnvVars).forEach(key => {
  originalEnv[key] = process.env[key];
  process.env[key] = testEnvVars[key];
});

let testsPassed = 0;
let totalTests = 0;

const runTest = (name, test) => {
  totalTests++;
  console.log(`🧪 Test ${totalTests}: ${name}`);
  
  try {
    const result = test();
    if (result === true || (result && result.success !== false)) {
      console.log('✅ PASSED\n');
      testsPassed++;
      return true;
    } else {
      console.log(`❌ FAILED: ${result.error || 'Test returned false'}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    return false;
  }
};

const runAsyncTest = async (name, test) => {
  totalTests++;
  console.log(`🧪 Test ${totalTests}: ${name}`);
  
  try {
    const result = await test();
    if (result === true || (result && result.success !== false)) {
      console.log('✅ PASSED\n');
      testsPassed++;
      return true;
    } else {
      console.log(`❌ FAILED: ${result.error || 'Test returned false'}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    return false;
  }
};

(async () => {
  await cleanupTestFile();

  // Test 1: FileStorageManager - Basic functionality
  await runAsyncTest('FileStorageManager basic initialization', async () => {
    const { FileStorageManager } = await import('../src/auth/file-storage.js');
    const storage = new FileStorageManager();
    
    // Should not throw on instantiation
    return storage !== null && storage.tokenFilePath !== null;
  });

  // Test 2: FileStorageManager - Store and retrieve credentials
  await runAsyncTest('FileStorageManager credentials storage', async () => {
    const { FileStorageManager } = await import('../src/auth/file-storage.js');
    const storage = new FileStorageManager();
    
    // Override token file path for testing
    storage.tokenFilePath = TEST_TOKEN_FILE;
    
    const testCredentials = {
      clientId: 'test_client_123',
      clientSecret: 'test_secret_456',
      instanceUrl: 'https://test.salesforce.com'
    };
    
    // Store credentials
    await storage.storeCredentials(testCredentials);
    
    // Verify file exists and has correct permissions
    const stats = await fs.stat(TEST_TOKEN_FILE);
    const permissions = stats.mode & parseInt('777', 8);
    const hasSecurePermissions = permissions === parseInt('600', 8);
    
    if (!hasSecurePermissions) {
      console.log(`   File permissions: ${permissions.toString(8)} (expected: 600)`);
      return false;
    }
    
    // Retrieve credentials
    const retrievedCredentials = await storage.getCredentials();
    
    const match = retrievedCredentials.clientId === testCredentials.clientId &&
                 retrievedCredentials.clientSecret === testCredentials.clientSecret &&
                 retrievedCredentials.instanceUrl === testCredentials.instanceUrl;
    
    if (!match) {
      console.log('   Credentials mismatch');
      console.log('   Stored:', testCredentials);
      console.log('   Retrieved:', retrievedCredentials);
    }
    
    return match;
  });

  // Test 3: FileStorageManager - Store and retrieve tokens
  await runAsyncTest('FileStorageManager tokens storage', async () => {
    const { FileStorageManager } = await import('../src/auth/file-storage.js');
    const storage = new FileStorageManager();
    storage.tokenFilePath = TEST_TOKEN_FILE;
    
    const testTokens = {
      access_token: 'test_access_token_123',
      refresh_token: 'test_refresh_token_456',
      expires_at: Date.now() + 3600000, // 1 hour from now
      instance_url: 'https://test.salesforce.com'
    };
    
    // Store tokens
    await storage.storeTokens(testTokens);
    
    // Retrieve tokens
    const retrievedTokens = await storage.getTokens();
    
    const match = retrievedTokens.access_token === testTokens.access_token &&
                 retrievedTokens.refresh_token === testTokens.refresh_token &&
                 retrievedTokens.expires_at === testTokens.expires_at &&
                 retrievedTokens.instance_url === testTokens.instance_url;
    
    if (!match) {
      console.log('   Tokens mismatch');
      console.log('   Stored:', testTokens);
      console.log('   Retrieved:', retrievedTokens);
    }
    
    return match;
  });

  // Test 4: FileStorageManager - Token file security
  await runAsyncTest('FileStorageManager token file security', async () => {
    const { FileStorageManager } = await import('../src/auth/file-storage.js');
    const storage = new FileStorageManager();
    storage.tokenFilePath = TEST_TOKEN_FILE;
    
    const testTokens = {
      access_token: 'test_access_token_123',
      refresh_token: 'test_refresh_token_456',
      expires_at: Date.now() + 3600000,
      instance_url: 'https://test.salesforce.com'
    };
    
    await storage.storeTokens(testTokens);
    
    // Check file info
    const fileInfo = await storage.getTokenFileInfo();
    
    const isSecure = fileInfo.exists && 
                    fileInfo.isSecure && 
                    fileInfo.permissions === '0600' &&
                    fileInfo.hasValidStructure;
    
    if (!isSecure) {
      console.log('   File info:', fileInfo);
    }
    
    return isSecure;
  });

  // Test 5: TokenManager - Basic initialization
  await runAsyncTest('TokenManager initialization', async () => {
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    const tokenManager = new TokenManager(
      testEnvVars.SALESFORCE_CLIENT_ID,
      testEnvVars.SALESFORCE_CLIENT_SECRET,
      testEnvVars.SALESFORCE_INSTANCE_URL
    );
    
    const isInitialized = tokenManager.clientId === testEnvVars.SALESFORCE_CLIENT_ID &&
                         tokenManager.clientSecret === testEnvVars.SALESFORCE_CLIENT_SECRET &&
                         tokenManager.instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL;
    
    if (!isInitialized) {
      console.log('   Client ID match:', tokenManager.clientId === testEnvVars.SALESFORCE_CLIENT_ID);
      console.log('   Client Secret match:', tokenManager.clientSecret === testEnvVars.SALESFORCE_CLIENT_SECRET);
      console.log('   Instance URL match:', tokenManager.instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL);
    }
    
    return isInitialized;
  });

  // Test 6: TokenManager - Token validation logic
  await runAsyncTest('TokenManager token validation', async () => {
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    const tokenManager = new TokenManager(
      testEnvVars.SALESFORCE_CLIENT_ID,
      testEnvVars.SALESFORCE_CLIENT_SECRET,
      testEnvVars.SALESFORCE_INSTANCE_URL
    );
    
    // Override storage to use test file
    tokenManager.storage.tokenFilePath = TEST_TOKEN_FILE;
    
    // Clear any existing tokens first
    await tokenManager.storage.clearTokens();
    
    // Test with no tokens
    const hasNoTokens = !(await tokenManager.initialize());
    
    // Test with valid tokens
    const futureExpiry = Date.now() + 3600000; // 1 hour from now
    const validTokens = {
      access_token: 'valid_access_token',
      refresh_token: 'valid_refresh_token',
      expires_at: futureExpiry,
      instance_url: testEnvVars.SALESFORCE_INSTANCE_URL
    };
    
    await tokenManager.storage.storeTokens(validTokens);
    const hasValidTokens = await tokenManager.initialize();
    
    const needsRefresh = await tokenManager.needsRefresh();
    
    // Test with expired tokens (expired more than 5 minutes ago due to buffer)
    const expiredTokens = {
      access_token: 'expired_access_token',
      refresh_token: 'expired_refresh_token',
      expires_at: Date.now() - (6 * 60 * 1000), // 6 minutes ago
      instance_url: testEnvVars.SALESFORCE_INSTANCE_URL
    };
    
    await tokenManager.storage.storeTokens(expiredTokens);
    await tokenManager.initialize();
    
    // For needsRefresh to work, we need to manually set currentTokens for this test
    // because initialize() might not load expired tokens
    tokenManager.currentTokens = expiredTokens;
    const needsRefreshExpired = await tokenManager.needsRefresh();
    
    const validation = hasNoTokens && hasValidTokens && !needsRefresh && needsRefreshExpired;
    
    if (!validation) {
      console.log('   Has no tokens initially:', hasNoTokens);
      console.log('   Has valid tokens after store:', hasValidTokens);
      console.log('   Needs refresh (valid tokens):', needsRefresh);
      console.log('   Needs refresh (expired tokens):', needsRefreshExpired);
      console.log('   Current time:', Date.now());
      console.log('   Expired token expires_at:', expiredTokens.expires_at);
      console.log('   Time difference:', Date.now() - expiredTokens.expires_at);
      console.log('   Current tokens:', tokenManager.currentTokens);
    }
    
    return validation;
  });

  // Test 7: TokenManager - Token info and debugging
  await runAsyncTest('TokenManager token info', async () => {
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    const tokenManager = new TokenManager(
      testEnvVars.SALESFORCE_CLIENT_ID,
      testEnvVars.SALESFORCE_CLIENT_SECRET,
      testEnvVars.SALESFORCE_INSTANCE_URL
    );
    
    tokenManager.storage.tokenFilePath = TEST_TOKEN_FILE;
    
    // Test with no tokens
    const noTokensInfo = tokenManager.getTokenInfo();
    const noTokensValid = !noTokensInfo.authenticated;
    
    // Test with tokens
    const futureExpiry = Date.now() + 3600000; // 1 hour from now
    const validTokens = {
      access_token: 'valid_access_token',
      refresh_token: 'valid_refresh_token',
      expires_at: futureExpiry,
      instance_url: testEnvVars.SALESFORCE_INSTANCE_URL
    };
    
    await tokenManager.storage.storeTokens(validTokens);
    await tokenManager.initialize();
    
    const tokenInfo = tokenManager.getTokenInfo();
    const tokenInfoValid = tokenInfo.authenticated &&
                          tokenInfo.instance_url === testEnvVars.SALESFORCE_INSTANCE_URL &&
                          tokenInfo.expires_at === futureExpiry &&
                          tokenInfo.expires_in_minutes > 0;
    
    if (!tokenInfoValid) {
      console.log('   Token info:', tokenInfo);
    }
    
    return noTokensValid && tokenInfoValid;
  });

  // Test 8: OAuthFlow - Basic initialization
  await runAsyncTest('OAuthFlow initialization', async () => {
    const { OAuthFlow } = await import('../src/auth/oauth.js');
    
    const oauth = new OAuthFlow(
      testEnvVars.SALESFORCE_CLIENT_ID,
      testEnvVars.SALESFORCE_CLIENT_SECRET,
      testEnvVars.SALESFORCE_INSTANCE_URL
    );
    
    const isInitialized = oauth.clientId === testEnvVars.SALESFORCE_CLIENT_ID &&
                         oauth.clientSecret === testEnvVars.SALESFORCE_CLIENT_SECRET &&
                         oauth.instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL &&
                         oauth.callbackPort === 8080; // Default port
    
    if (!isInitialized) {
      console.log('   OAuth initialization failed');
      console.log('   Client ID:', oauth.clientId);
      console.log('   Instance URL:', oauth.instanceUrl);
      console.log('   Callback port:', oauth.callbackPort);
    }
    
    return isInitialized;
  });

  // Test 9: OAuthFlow - State generation and validation
  await runAsyncTest('OAuthFlow state validation', async () => {
    const { OAuthFlow } = await import('../src/auth/oauth.js');
    
    const oauth = new OAuthFlow(
      testEnvVars.SALESFORCE_CLIENT_ID,
      testEnvVars.SALESFORCE_CLIENT_SECRET,
      testEnvVars.SALESFORCE_INSTANCE_URL
    );
    
    // Generate state
    oauth.state = 'test_state_123';
    oauth.stateExpiration = Date.now() + 600000; // 10 minutes from now
    
    // Test valid state
    const validState = oauth.isValidState('test_state_123');
    
    // Test invalid state
    const invalidState = oauth.isValidState('wrong_state');
    
    // Test expired state
    oauth.stateExpiration = Date.now() - 1000; // 1 second ago
    const expiredState = oauth.isValidState('test_state_123');
    
    const validation = validState.valid && !invalidState.valid && !expiredState.valid;
    
    if (!validation) {
      console.log('   Valid state check:', validState);
      console.log('   Invalid state check:', invalidState);
      console.log('   Expired state check:', expiredState);
    }
    
    return validation;
  });

  // Test 10: OAuthFlow - URL generation
  await runAsyncTest('OAuthFlow URL generation', async () => {
    const { OAuthFlow } = await import('../src/auth/oauth.js');
    
    const oauth = new OAuthFlow(
      testEnvVars.SALESFORCE_CLIENT_ID,
      testEnvVars.SALESFORCE_CLIENT_SECRET,
      testEnvVars.SALESFORCE_INSTANCE_URL
    );
    
    oauth.state = 'test_state_123';
    oauth.callbackPort = 8080;
    
    const authUrl = oauth.getAuthorizationUrl();
    
    const hasClientId = authUrl.includes(`client_id=${testEnvVars.SALESFORCE_CLIENT_ID}`);
    const hasRedirectUri = authUrl.includes('redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback');
    const hasState = authUrl.includes('state=test_state_123');
    const hasScope = authUrl.includes('scope=api+refresh_token');
    const hasPrompt = authUrl.includes('prompt=login');
    const hasInstanceUrl = authUrl.startsWith(testEnvVars.SALESFORCE_INSTANCE_URL);
    
    const urlValid = hasClientId && hasRedirectUri && hasState && hasScope && hasPrompt && hasInstanceUrl;
    
    if (!urlValid) {
      console.log('   Generated URL:', authUrl);
      console.log('   Has client ID:', hasClientId);
      console.log('   Has redirect URI:', hasRedirectUri);
      console.log('   Has state:', hasState);
      console.log('   Has scope:', hasScope);
      console.log('   Has prompt:', hasPrompt);
      console.log('   Has instance URL:', hasInstanceUrl);
    }
    
    return urlValid;
  });

  // Test 11: Integration - Environment variable flow
  await runAsyncTest('Integration - Environment variable flow', async () => {
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    // Test that TokenManager can be created with environment variables
    const tokenManager = new TokenManager(
      process.env.SALESFORCE_CLIENT_ID,
      process.env.SALESFORCE_CLIENT_SECRET,
      process.env.SALESFORCE_INSTANCE_URL
    );
    
    // Override storage to use test file
    tokenManager.storage.tokenFilePath = TEST_TOKEN_FILE;
    
    const envVarsMatch = tokenManager.clientId === testEnvVars.SALESFORCE_CLIENT_ID &&
                        tokenManager.clientSecret === testEnvVars.SALESFORCE_CLIENT_SECRET &&
                        tokenManager.instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL;
    
    if (!envVarsMatch) {
      console.log('   Environment variables not properly read');
      console.log('   Expected Client ID:', testEnvVars.SALESFORCE_CLIENT_ID);
      console.log('   Actual Client ID:', tokenManager.clientId);
    }
    
    return envVarsMatch;
  });

  // Test 12: Integration - Missing environment variables
  await runAsyncTest('Integration - Missing environment variables handling', async () => {
    // Temporarily clear environment variables
    const tempEnv = {};
    ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_INSTANCE_URL'].forEach(key => {
      tempEnv[key] = process.env[key];
      delete process.env[key];
    });
    
    try {
      const { TokenManager } = await import('../src/auth/token-manager.js');
      
      const tokenManager = new TokenManager(
        process.env.SALESFORCE_CLIENT_ID,
        process.env.SALESFORCE_CLIENT_SECRET,
        process.env.SALESFORCE_INSTANCE_URL
      );
      
      // Should handle undefined values gracefully
      const hasUndefinedValues = tokenManager.clientId === undefined &&
                                tokenManager.clientSecret === undefined &&
                                tokenManager.instanceUrl === undefined;
      
      return hasUndefinedValues;
    } finally {
      // Restore environment variables
      Object.assign(process.env, tempEnv);
    }
  });

  // Clean up
  await cleanupTestFile();

  // Restore original environment
  Object.keys(testEnvVars).forEach(key => {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  });

  // Results
  console.log('📋 Test Results:');
  console.log(`✅ Passed: ${testsPassed}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - testsPassed}/${totalTests}`);

  if (testsPassed === totalTests) {
    console.log('\n🎉 All credentials system tests passed!');
    console.log('\n✅ Credentials system components verified:');
    console.log('  - FileStorageManager: Secure credential and token storage');
    console.log('  - TokenManager: Token lifecycle management');
    console.log('  - OAuthFlow: OAuth state management and URL generation');
    console.log('  - Environment variable integration');
    console.log('  - File security with 600 permissions');
    console.log('  - Token validation and expiration logic');
    process.exit(0);
  } else {
    console.log('\n❌ Some credentials system tests failed!');
    console.log('\n🔧 Issues to investigate:');
    console.log('  - Check file permissions (should be 600)');
    console.log('  - Verify token storage and retrieval');
    console.log('  - Check environment variable handling');
    console.log('  - Verify OAuth flow components');
    process.exit(1);
  }
})();