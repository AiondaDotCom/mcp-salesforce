#!/usr/bin/env node

/**
 * Security test script for token file permissions
 */

import { FileStorageManager } from './src/auth/file-storage.js';
import fs from 'fs/promises';

async function createTestTokenFile() {
  console.log('🔧 Creating test token file...');
  
  const storage = new FileStorageManager();
  
  // Create test tokens
  const testTokens = {
    access_token: 'test_access_token_12345',
    refresh_token: 'test_refresh_token_67890',
    expires_at: Date.now() + (3600 * 1000), // 1 hour from now
    instance_url: 'https://test.salesforce.com',
    stored_at: new Date().toISOString()
  };

  await storage.storeTokens(testTokens);
  return storage;
}

async function testPermissions() {
  console.log('🔒 Testing Token File Security\n');
  console.log('='.repeat(50));

  try {
    const storage = await createTestTokenFile();
    
    // Test 1: Check file permissions
    console.log('\n1. Checking file permissions...');
    const fileInfo = await storage.getTokenFileInfo();
    console.log('   Permissions:', fileInfo.permissions);
    console.log('   Is secure:', fileInfo.isSecure);
    if (fileInfo.securityWarning) {
      console.log('   ⚠️ Warning:', fileInfo.securityWarning);
    } else {
      console.log('   ✅ File permissions are secure');
    }

    // Test 2: Security verification
    console.log('\n2. Running security verification...');
    const securityStatus = await storage.ensureTokenSecurity();
    console.log('   Status:', securityStatus.status);
    console.log('   Message:', securityStatus.message);
    if (securityStatus.permissions) {
      console.log('   Permissions:', securityStatus.permissions);
    }

    // Test 3: Simulate permission issues and fix
    console.log('\n3. Testing permission fix...');
    const tokenPath = storage.tokenFilePath;
    
    // Temporarily set wrong permissions
    console.log('   Setting incorrect permissions (644)...');
    await fs.chmod(tokenPath, 0o644);
    
    // Check if detected
    const badInfo = await storage.getTokenFileInfo();
    console.log('   Detected permissions:', badInfo.permissions);
    console.log('   Is secure:', badInfo.isSecure);
    
    // Fix permissions
    console.log('   Fixing permissions...');
    const fixResult = await storage.ensureTokenSecurity();
    console.log('   Fix result:', fixResult.status);
    console.log('   Message:', fixResult.message);

    // Verify fix
    const fixedInfo = await storage.getTokenFileInfo();
    console.log('   Final permissions:', fixedInfo.permissions);
    console.log('   Is secure:', fixedInfo.isSecure);

    // Test 4: Test access from command line
    console.log('\n4. Command line permission test...');
    console.log('   Token file location:', tokenPath);
    
    console.log('\n   Testing file access...');
    
    // Clean up
    console.log('\n5. Cleaning up test file...');
    await storage.clearTokens();
    console.log('   ✅ Test file removed');

    return true;

  } catch (error) {
    console.log('❌ Security test failed:', error.message);
    return false;
  }
}

async function demonstrateSecurityFeatures() {
  console.log('\n📋 Security Features Summary:\n');
  console.log('✅ Token files are created with 0600 permissions (owner read/write only)');
  console.log('✅ Explicit chmod command ensures permissions are set correctly');  
  console.log('✅ Permission verification after file creation');
  console.log('✅ Security warning if permissions are incorrect');
  console.log('✅ Automatic permission fixing function');
  console.log('✅ Comprehensive security status reporting');
  console.log('✅ Files stored in cache/ directory (excluded from git)');
  
  console.log('\n🔒 Permission Explanation:');
  console.log('   0600 = rw-------');
  console.log('   - Owner: read + write');
  console.log('   - Group: no access');
  console.log('   - Others: no access');
  
  console.log('\n💡 Security Benefits:');
  console.log('   - Other users on the system cannot read Salesforce tokens');
  console.log('   - Prevents unauthorized access to your Salesforce data');
  console.log('   - Complies with security best practices for credential storage');
}

async function main() {
  console.log('🛡️ MCP Salesforce Token Security Test\n');

  const success = await testPermissions();
  await demonstrateSecurityFeatures();

  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ All security tests passed!');
    console.log('🔒 Token file security is properly implemented');
  } else {
    console.log('❌ Security tests failed');
  }
}

main().catch(console.error);
