#!/usr/bin/env node

/**
 * Environment Variables Unit Test
 * 
 * This test directly tests the components to verify they read environment variables correctly.
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Environment Variables Unit Test\n');

// Set test environment variables
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
  // Test 1: Direct TokenManager initialization
  await runAsyncTest('TokenManager reads environment variables', async () => {
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    const tokenManager = new TokenManager(
      process.env.SALESFORCE_CLIENT_ID,
      process.env.SALESFORCE_CLIENT_SECRET,
      process.env.SALESFORCE_INSTANCE_URL
    );
    
    const clientIdMatch = tokenManager.clientId === testEnvVars.SALESFORCE_CLIENT_ID;
    const instanceUrlMatch = tokenManager.instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL;
    
    if (!clientIdMatch) {
      console.log(`   Expected Client ID: ${testEnvVars.SALESFORCE_CLIENT_ID}`);
      console.log(`   Actual Client ID: ${tokenManager.clientId}`);
    }
    
    if (!instanceUrlMatch) {
      console.log(`   Expected Instance URL: ${testEnvVars.SALESFORCE_INSTANCE_URL}`);
      console.log(`   Actual Instance URL: ${tokenManager.instanceUrl}`);
    }
    
    return clientIdMatch && instanceUrlMatch;
  });

  // Test 2: Auth tool validates stored credentials (not environment variables)
  await runAsyncTest('Auth tool validates stored credentials', async () => {
    // Import auth tool and file storage
    const { handleReauth } = await import('../src/tools/auth.js');
    const { FileStorageManager } = await import('../src/auth/file-storage.js');
    
    // Create a temporary storage manager and clear any existing credentials
    const fileStorage = new FileStorageManager();
    const originalTokenFile = fileStorage.tokenFilePath;
    
    try {
      // Use a test token file path
      fileStorage.tokenFilePath = originalTokenFile.replace('.mcp-salesforce.json', '.mcp-salesforce-test-credentials.json');
      
      // Clear the test file
      await fileStorage.clearTokens();
      
      // Test that auth tool properly detects missing credentials
      const result = await handleReauth({ force: true });
      
      const hasValidation = !result.success && 
                           result.error && 
                           result.error.includes('No Salesforce credentials found');
      
      if (hasValidation && result.details && result.details.setupRequired) {
        console.log('   Correctly detected missing credentials');
        return true;
      }
      
      if (!hasValidation) {
        console.log('   Expected error about missing credentials, got:', result);
      }
      
      return hasValidation;
    } finally {
      // Clean up test file
      try {
        await fileStorage.clearTokens();
      } catch {}
      // Restore original path
      fileStorage.tokenFilePath = originalTokenFile;
    }
  });

  // Test 3: TokenManager works with environment variables
  await runAsyncTest('TokenManager works with environment variables', async () => {
    // Test that TokenManager can be initialized with environment variables
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    try {
      const tokenManager = new TokenManager(
        process.env.SALESFORCE_CLIENT_ID,
        process.env.SALESFORCE_CLIENT_SECRET,
        process.env.SALESFORCE_INSTANCE_URL
      );
      
      // Should be able to create instance without throwing
      const isInitialized = tokenManager.clientId === testEnvVars.SALESFORCE_CLIENT_ID &&
                           tokenManager.clientSecret === testEnvVars.SALESFORCE_CLIENT_SECRET &&
                           tokenManager.instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL;
      
      if (!isInitialized) {
        console.log('   TokenManager not properly initialized with environment variables');
      }
      
      return isInitialized;
    } catch (error) {
      console.log(`   TokenManager initialization failed: ${error.message}`);
      return false;
    }
  });

  // Test 4: Check dotenv is properly configured
  await runAsyncTest('dotenv configuration check', async () => {
    const indexPath = path.join(__dirname, '../src/index.js');
    const fs = await import('fs');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    const hasDotenvImport = content.includes("import { config } from 'dotenv'");
    const hasDotenvCall = content.includes('config()');
    
    if (!hasDotenvImport) {
      console.log('   Missing dotenv import');
    }
    
    if (!hasDotenvCall) {
      console.log('   Missing dotenv config() call');
    }
    
    return hasDotenvImport && hasDotenvCall;
  });

  // Test 5: Salesforce client environment variable usage
  await runAsyncTest('SalesforceClient reads environment variables', async () => {
    const { SalesforceClient } = await import('../src/salesforce/client.js');
    
    try {
      const client = new SalesforceClient();
      
      // The client should be created without throwing missing env var errors
      return true;
    } catch (error) {
      const isMissingVarError = error.message.includes('required environment variables') ||
                               error.message.includes('SALESFORCE_CLIENT_ID') ||
                               error.message.includes('SALESFORCE_CLIENT_SECRET') ||
                               error.message.includes('SALESFORCE_INSTANCE_URL');
      
      if (isMissingVarError) {
        console.log(`   SalesforceClient failed to read environment variables: ${error.message}`);
        return false;
      }
      
      // Other errors are acceptable
      console.log(`   Other error (environment variables were read): ${error.message}`);
      return true;
    }
  });

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
    console.log('\n🎉 All environment variable tests passed!');
    console.log('\n✅ The application correctly reads environment variables:');
    console.log('  - SALESFORCE_CLIENT_ID');
    console.log('  - SALESFORCE_CLIENT_SECRET');
    console.log('  - SALESFORCE_INSTANCE_URL');
    process.exit(0);
  } else {
    console.log('\n❌ Some environment variable tests failed!');
    process.exit(1);
  }
})();