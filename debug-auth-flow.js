#!/usr/bin/env node

import { FileStorageManager } from './src/auth/file-storage.js';

async function debugAuthFlow() {
  console.log('🔍 Debug Auth Flow\n');
  
  const storage = new FileStorageManager();
  
  console.log('1. Initial state:');
  const initial = await storage.getAllData();
  console.log('   Credentials:', {
    clientId: initial.clientId,
    clientSecret: initial.clientSecret ? '***' : null,
    instanceUrl: initial.instanceUrl,
    credentialsStoredAt: initial.credentialsStoredAt
  });
  
  console.log('\n2. Calling clearTokens:');
  await storage.clearTokens();
  
  console.log('\n3. After clearTokens:');
  const afterClear = await storage.getAllData();
  console.log('   Credentials:', {
    clientId: afterClear.clientId,
    clientSecret: afterClear.clientSecret ? '***' : null,
    instanceUrl: afterClear.instanceUrl,
    credentialsStoredAt: afterClear.credentialsStoredAt
  });
  
  console.log('\n4. Test getCredentials method:');
  const creds = await storage.getCredentials();
  console.log('   getCredentials result:', {
    clientId: creds?.clientId,
    clientSecret: creds?.clientSecret ? '***' : null,
    instanceUrl: creds?.instanceUrl,
    credentialsStoredAt: creds?.credentialsStoredAt
  });
}

debugAuthFlow().catch(console.error);