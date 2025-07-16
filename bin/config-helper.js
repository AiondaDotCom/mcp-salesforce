#!/usr/bin/env node

import { config } from 'dotenv';
import { FileStorageManager } from '../src/auth/file-storage.js';

// Load environment variables
config();

async function showConfigHelper() {
  console.log('🔧 MCP Salesforce Connected App Configuration Helper');
  console.log('===================================================\n');

  console.log('Your Salesforce Connected App needs to be configured with the following callback URLs:\n');

  // Show multiple callback URLs to cover different scenarios
  const ports = [8080, 8000, 8001, 8002, 8003, 8004, 8005];
  console.log('Callback URLs to add to your Salesforce Connected App:');
  ports.forEach(port => {
    console.log(`• http://localhost:${port}/callback`);
  });

  console.log('\nInstructions:');
  console.log('1. Go to Salesforce Setup → App Manager');
  console.log('2. Find your Connected App and click "View"');
  console.log('3. Click "Manage" → "Edit Policies"');
  console.log('4. In "Callback URL" section, add ALL the URLs listed above');
  console.log('5. Save the changes');
  console.log('6. Wait 2-10 minutes for changes to propagate\n');

  console.log('Current Configuration:');
  try {
    const fileStorage = new FileStorageManager();
    const credentials = await fileStorage.getCredentials();
    const apiConfig = await fileStorage.getApiConfig();
    
    if (credentials) {
      console.log(`• Instance URL: ${credentials.instanceUrl}`);
      console.log(`• Client ID: ${credentials.clientId?.substring(0, 20)}...`);
      console.log(`• Preferred Port: ${apiConfig.callbackPort}`);
    } else {
      console.log('• No configuration found in ~/.mcp-salesforce.json');
      console.log('• Please run the salesforce_setup tool first');
    }
  } catch (error) {
    console.log(`• Error reading configuration: ${error.message}`);
  }

  console.log('\nAfter updating your Connected App, run: npm run setup');
}

showConfigHelper().catch(console.error);
