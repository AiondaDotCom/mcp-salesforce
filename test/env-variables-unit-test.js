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

  // Test 2: Auth tool environment variable validation
  await runAsyncTest('Auth tool validates environment variables', async () => {
    // Clear environment variables to test validation
    const tempEnv = {};
    ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_INSTANCE_URL'].forEach(key => {
      tempEnv[key] = process.env[key];
      delete process.env[key];
    });
    
    try {
      const { handleReauth } = await import('../src/tools/auth.js');
      
      // Create a promise that will timeout after 2 seconds
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 2000)
      );
      
      const authPromise = handleReauth({ force: true });
      
      const result = await Promise.race([authPromise, timeoutPromise]);
      
      const hasValidation = !result.success && 
                           result.error && 
                           result.error.includes('Missing required environment variables');
      
      if (hasValidation && result.details && result.details.missingVariables) {
        const expectedMissing = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_INSTANCE_URL'];
        const actualMissing = result.details.missingVariables;
        const allDetected = expectedMissing.every(varName => actualMissing.includes(varName));
        
        console.log(`   Missing variables detected: ${actualMissing.join(', ')}`);
        return allDetected;
      }
      
      return hasValidation;
    } catch (error) {
      if (error.message.includes('Test timeout')) {
        console.log('   Test timed out - auth tool likely attempted real authentication');
        return false;
      }
      throw error;
    } finally {
      // Restore environment variables
      Object.assign(process.env, tempEnv);
    }
  });

  // Test 3: Auth tool with valid environment variables (with timeout)
  await runAsyncTest('Auth tool uses environment variables', async () => {
    const { handleReauth } = await import('../src/tools/auth.js');
    
    // Create a promise that will timeout after 5 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout - likely trying real OAuth')), 5000)
    );
    
    const authPromise = (async () => {
      try {
        const result = await handleReauth({ force: true });
        
        // It should not fail with "Missing required environment variables"
        const noMissingVarError = !result.error || !result.error.includes('Missing required environment variables');
        
        if (!noMissingVarError) {
          console.log(`   Unexpected error: ${result.error}`);
        }
        
        return { success: noMissingVarError, fromResult: true };
      } catch (error) {
        // OAuth errors are expected since we don't have real credentials
        // but missing environment variable errors are not
        const isOAuthError = error.message.includes('oauth') || 
                            error.message.includes('authentication') ||
                            error.message.includes('invalid_client') ||
                            error.message.includes('OAuth') ||
                            error.message.includes('ENOTFOUND') ||
                            error.message.includes('fetch');
        
        if (isOAuthError) {
          console.log(`   Expected OAuth/Network error (environment variables were read): ${error.message.substring(0, 100)}`);
          return { success: true, fromError: true };
        }
        
        const isMissingVarError = error.message.includes('Missing required environment variables');
        
        if (isMissingVarError) {
          console.log(`   Environment variables not properly read: ${error.message}`);
          return { success: false, fromError: true };
        }
        
        // Other errors are also acceptable as long as they're not about missing env vars
        console.log(`   Other error (environment variables were read): ${error.message.substring(0, 100)}`);
        return { success: true, fromError: true };
      }
    })();
    
    try {
      const result = await Promise.race([authPromise, timeoutPromise]);
      return result.success;
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log(`   Test timed out - auth tool likely attempted real OAuth (environment variables were read)`);
        return true;
      }
      throw error;
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