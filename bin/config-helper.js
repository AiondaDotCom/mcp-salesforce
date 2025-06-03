#!/usr/bin/env node

import { config } from 'dotenv';

// Load environment variables
config();

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

console.log('Current Environment:');
console.log(`• Instance URL: ${process.env.SALESFORCE_INSTANCE_URL}`);
console.log(`• Client ID: ${process.env.SALESFORCE_CLIENT_ID?.substring(0, 20)}...`);
console.log(`• Preferred Port: ${process.env.SALESFORCE_CALLBACK_PORT || 8080}`);

console.log('\nAfter updating your Connected App, run: npm run setup');
