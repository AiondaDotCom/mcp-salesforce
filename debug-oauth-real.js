#!/usr/bin/env node

import { FileStorageManager } from './src/auth/file-storage.js';
import { TokenManager } from './src/auth/token-manager.js';
import fs from 'fs/promises';

async function debugOAuthReal() {
  console.log('🔍 Debug OAuth Real Flow\n');
  
  const storage = new FileStorageManager();
  
  console.log('1. Initial state:');
  const initial = await storage.getAllData();
  console.log('   Credentials:', {
    clientId: initial.clientId,
    clientSecret: initial.clientSecret ? '***' : null,
    instanceUrl: initial.instanceUrl,
    credentialsStoredAt: initial.credentialsStoredAt
  });
  
  console.log('\n2. Creating TokenManager:');
  const creds = await storage.getCredentials();
  if (!creds) {
    console.log('   ERROR: No credentials found!');
    return;
  }
  
  const tokenManager = new TokenManager(
    creds.clientId,
    creds.clientSecret,
    creds.instanceUrl
  );
  
  console.log('   TokenManager created with:', {
    clientId: tokenManager.clientId,
    instanceUrl: tokenManager.instanceUrl
  });
  
  console.log('\n3. Before clearTokens:');
  const beforeClear = await storage.getAllData();
  console.log('   File contents:', JSON.stringify(beforeClear, null, 2));
  
  console.log('\n4. Calling clearTokens:');
  await tokenManager.clearTokens();
  
  console.log('\n5. After clearTokens:');
  const afterClear = await storage.getAllData();
  console.log('   File contents:', JSON.stringify(afterClear, null, 2));
  
  // Check if file still exists
  try {
    await fs.access(storage.tokenFilePath);
    console.log('   ✅ File still exists');
  } catch (error) {
    console.log('   ❌ File was deleted!');
  }
}

debugOAuthReal().catch(console.error);