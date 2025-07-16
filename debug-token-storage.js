#!/usr/bin/env node

import { FileStorageManager } from './src/auth/file-storage.js';

async function debugTokenStorage() {
  console.log('🔍 Debug Token Storage\n');
  
  const storage = new FileStorageManager();
  
  console.log('1. Before storeTokens - checking existing data:');
  const beforeData = await storage.getAllData();
  console.log('   Credentials:', {
    clientId: beforeData.clientId,
    clientSecret: beforeData.clientSecret ? '***' : null,
    instanceUrl: beforeData.instanceUrl,
    credentialsStoredAt: beforeData.credentialsStoredAt
  });
  
  console.log('\n2. Simulating storeTokens:');
  const testTokens = {
    access_token: 'test_token_123',
    refresh_token: 'test_refresh_456',
    expires_at: Date.now() + 3600000,
    instance_url: 'https://aionda.my.salesforce.com'
  };
  
  const merged = {
    ...beforeData,
    access_token: testTokens.access_token,
    refresh_token: testTokens.refresh_token,
    expires_at: testTokens.expires_at,
    instance_url: testTokens.instance_url,
    stored_at: new Date().toISOString()
  };
  
  console.log('   Merged data before getCompleteDataStructure:');
  console.log('   Credentials:', {
    clientId: merged.clientId,
    clientSecret: merged.clientSecret ? '***' : null,
    instanceUrl: merged.instanceUrl,
    credentialsStoredAt: merged.credentialsStoredAt
  });
  
  const complete = storage.getCompleteDataStructure(merged);
  console.log('\n   After getCompleteDataStructure:');
  console.log('   Credentials:', {
    clientId: complete.clientId,
    clientSecret: complete.clientSecret ? '***' : null,
    instanceUrl: complete.instanceUrl,
    credentialsStoredAt: complete.credentialsStoredAt
  });
  
  // Actually store the tokens
  await storage.storeTokens(testTokens);
  
  console.log('\n3. After storeTokens - checking stored data:');
  const afterData = await storage.getAllData();
  console.log('   Credentials:', {
    clientId: afterData.clientId,
    clientSecret: afterData.clientSecret ? '***' : null,
    instanceUrl: afterData.instanceUrl,
    credentialsStoredAt: afterData.credentialsStoredAt
  });
}

debugTokenStorage().catch(console.error);