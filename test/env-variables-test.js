#!/usr/bin/env node

/**
 * Environment Variables Test
 * 
 * This test verifies that the application properly reads environment variables
 * like SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, and SALESFORCE_INSTANCE_URL.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Environment Variables Reading...\n');

// Test environment variables
const testEnvVars = {
  SALESFORCE_CLIENT_ID: 'test_client_id_12345',
  SALESFORCE_CLIENT_SECRET: 'test_client_secret_67890',
  SALESFORCE_INSTANCE_URL: 'https://test.salesforce.com',
  NODE_ENV: 'test',
  DISABLE_BROWSER_OPEN: 'true'
};

console.log('📋 Test Environment Variables:');
Object.entries(testEnvVars).forEach(([key, value]) => {
  console.log(`  ${key}=${value}`);
});
console.log('');

// Test 1: Test auth tool with environment variables
console.log('🧪 Test 1: Testing auth tool with ENV variables...');

const testAuthWithEnv = () => {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../src/index.js');
    
    // Create test process with custom environment
    const env = { ...process.env, ...testEnvVars };
    
    const child = spawn('node', [serverPath], {
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Send MCP request to test auth tool
    const mcpRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'salesforce_auth',
        arguments: { force: true }
      }
    }) + '\n';

    child.stdin.write(mcpRequest);

    setTimeout(() => {
      child.kill();
      
      // Check if the environment variables were used
      const hasClientId = output.includes(testEnvVars.SALESFORCE_CLIENT_ID) || 
                         errorOutput.includes(testEnvVars.SALESFORCE_CLIENT_ID);
      const hasInstanceUrl = output.includes(testEnvVars.SALESFORCE_INSTANCE_URL) || 
                            errorOutput.includes(testEnvVars.SALESFORCE_INSTANCE_URL);
      
      resolve({
        output,
        errorOutput,
        hasClientId,
        hasInstanceUrl,
        envVarsUsed: hasClientId || hasInstanceUrl
      });
    }, 3000);
  });
};

// Test 2: Import and check TokenManager directly
console.log('🧪 Test 2: Testing TokenManager with ENV variables...');

const testTokenManagerDirectly = async () => {
  // Set environment variables
  Object.entries(testEnvVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  try {
    const { TokenManager } = await import('../src/auth/token-manager.js');
    
    const tokenManager = new TokenManager(
      process.env.SALESFORCE_CLIENT_ID,
      process.env.SALESFORCE_CLIENT_SECRET,
      process.env.SALESFORCE_INSTANCE_URL
    );

    // Check if TokenManager received the correct values
    const clientId = tokenManager.clientId || tokenManager._clientId;
    const instanceUrl = tokenManager.instanceUrl || tokenManager._instanceUrl;
    
    return {
      clientIdMatch: clientId === testEnvVars.SALESFORCE_CLIENT_ID,
      instanceUrlMatch: instanceUrl === testEnvVars.SALESFORCE_INSTANCE_URL,
      clientId,
      instanceUrl
    };
  } catch (error) {
    return {
      error: error.message,
      clientIdMatch: false,
      instanceUrlMatch: false
    };
  }
};

// Test 3: Check if auth tool validates ENV variables correctly
console.log('🧪 Test 3: Testing ENV variable validation...');

const testEnvValidation = async () => {
  // Test with missing environment variables
  const originalEnv = { ...process.env };
  
  // Clear Salesforce env vars
  delete process.env.SALESFORCE_CLIENT_ID;
  delete process.env.SALESFORCE_CLIENT_SECRET;
  delete process.env.SALESFORCE_INSTANCE_URL;
  
  try {
    const { handleReauth } = await import('../src/tools/auth.js');
    const result = await handleReauth({ force: true });
    
    // Restore environment
    Object.assign(process.env, originalEnv);
    
    return {
      detectedMissingVars: !result.success && result.error.includes('Missing required environment variables'),
      errorMessage: result.error,
      missingVars: result.details?.missingVariables || []
    };
  } catch (error) {
    // Restore environment
    Object.assign(process.env, originalEnv);
    
    return {
      error: error.message,
      detectedMissingVars: false
    };
  }
};

// Run all tests
(async () => {
  try {
    // Test 1: Auth tool with environment
    console.log('Running auth tool test...');
    const authResult = await testAuthWithEnv();
    
    if (authResult.envVarsUsed) {
      console.log('✅ Auth tool reads environment variables');
    } else {
      console.log('❌ Auth tool does not read environment variables');
      console.log('   Output:', authResult.output.substring(0, 200));
      console.log('   Error Output:', authResult.errorOutput.substring(0, 200));
    }
    
    // Test 2: TokenManager direct test
    console.log('\nRunning TokenManager direct test...');
    const tokenResult = await testTokenManagerDirectly();
    
    if (tokenResult.error) {
      console.log('❌ TokenManager test failed:', tokenResult.error);
    } else if (tokenResult.clientIdMatch && tokenResult.instanceUrlMatch) {
      console.log('✅ TokenManager correctly reads environment variables');
      console.log(`   Client ID: ${tokenResult.clientId}`);
      console.log(`   Instance URL: ${tokenResult.instanceUrl}`);
    } else {
      console.log('❌ TokenManager does not correctly read environment variables');
      console.log(`   Expected Client ID: ${testEnvVars.SALESFORCE_CLIENT_ID}`);
      console.log(`   Actual Client ID: ${tokenResult.clientId}`);
      console.log(`   Expected Instance URL: ${testEnvVars.SALESFORCE_INSTANCE_URL}`);
      console.log(`   Actual Instance URL: ${tokenResult.instanceUrl}`);
    }
    
    // Test 3: Environment validation
    console.log('\nRunning environment validation test...');
    const validationResult = await testEnvValidation();
    
    if (validationResult.error) {
      console.log('❌ Environment validation test failed:', validationResult.error);
    } else if (validationResult.detectedMissingVars) {
      console.log('✅ Application correctly detects missing environment variables');
      console.log(`   Missing variables detected: ${validationResult.missingVars.join(', ')}`);
    } else {
      console.log('❌ Application does not properly validate environment variables');
      console.log('   Error message:', validationResult.errorMessage);
    }
    
    console.log('\n📋 Test Summary:');
    console.log(`- Auth tool ENV reading: ${authResult.envVarsUsed ? '✅' : '❌'}`);
    console.log(`- TokenManager ENV reading: ${tokenResult.clientIdMatch && tokenResult.instanceUrlMatch ? '✅' : '❌'}`);
    console.log(`- ENV validation: ${validationResult.detectedMissingVars ? '✅' : '❌'}`);
    
    const allPassed = authResult.envVarsUsed && 
                     tokenResult.clientIdMatch && 
                     tokenResult.instanceUrlMatch && 
                     validationResult.detectedMissingVars;
    
    if (allPassed) {
      console.log('\n🎉 All environment variable tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some environment variable tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
})();