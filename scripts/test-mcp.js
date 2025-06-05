#!/usr/bin/env node

// Simple test script to call MCP tools directly
import { handleSalesforceLearn } from './src/tools/learn.js';
import { handleSalesforceInstallationInfo } from './src/tools/installation-info.js';
import { executeQuery } from './src/tools/query.js';
import { SalesforceClient } from './src/salesforce/client.js';
import { config } from 'dotenv';

config();

async function testMCP() {
  console.log('🧪 Testing MCP Salesforce Server');
  console.log('=================================\n');
  
  try {
    // Initialize Salesforce client
    console.log('1️⃣ Initializing Salesforce client...');
    const client = new SalesforceClient();
    await client.connect();
    console.log('✅ Connected to Salesforce\n');
    
    // Test 1: Learn the installation
    console.log('2️⃣ Learning Salesforce installation...');
    const learnResult = await handleSalesforceLearn({}, client);
    console.log('Learn Result:', JSON.stringify(learnResult, null, 2));
    console.log('\n');
    
    // Test 2: Check installation info
    console.log('3️⃣ Getting installation information...');
    const infoResult = await handleSalesforceInstallationInfo({});
    console.log('Installation Info:', JSON.stringify(infoResult, null, 2));
    console.log('\n');
    
    // Test 3: Query some standard objects
    console.log('4️⃣ Querying Account objects...');
    const queryResult = await executeQuery(client, {
      query: "SELECT Id, Name FROM Account LIMIT 5"
    });
    console.log('Query Result:', JSON.stringify(queryResult, null, 2));
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testMCP().catch(console.error);
