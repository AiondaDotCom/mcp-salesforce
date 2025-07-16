#!/usr/bin/env node

import { SalesforceClient } from '../src/salesforce/client.js';
import { FileStorageManager } from '../src/auth/file-storage.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function debugQuery() {
  try {
    console.log('🔧 Starting Salesforce Query Debug...\n');

    // Check configuration
    const fileStorage = new FileStorageManager();
    const credentials = await fileStorage.getCredentials();
    
    if (!credentials) {
      console.error('❌ No credentials found in ~/.mcp-salesforce.json');
      console.error('Please run the salesforce_setup tool first');
      process.exit(1);
    }

    // Initialize client
    const client = new SalesforceClient(
      credentials.clientId,
      credentials.clientSecret,
      credentials.instanceUrl
    );

    await client.initialize();
    console.log('✅ Client initialized successfully\n');

    // Test simple query
    console.log('🔍 Testing simple Account query...');
    try {
      const result = await client.query('SELECT Id, Name FROM Account LIMIT 5');
      console.log(`✅ Simple query successful: ${result.totalSize} records found\n`);
    } catch (error) {
      console.error('❌ Simple query failed:', error.message, '\n');
    }

    // Test potentially problematic query
    const testQuery = process.argv[2] || "SELECT Id, Name, Industry FROM Account WHERE Name LIKE '%Test%' LIMIT 10";
    console.log(`🔍 Testing provided query: ${testQuery}`);
    
    try {
      const result = await client.query(testQuery);
      console.log(`✅ Query successful: ${result.totalSize} records found`);
      console.log('Sample result:', JSON.stringify(result.records.slice(0, 2), null, 2));
    } catch (error) {
      console.error('❌ Query failed with detailed error:');
      console.error('Message:', error.message);
      console.error('Name:', error.name);
      console.error('Stack:', error.stack?.substring(0, 300));
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run debug if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugQuery();
}
