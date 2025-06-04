#!/usr/bin/env node

// Test the learning system with the actual Salesforce org
import { handleSalesforceLearn } from './src/tools/learn.js';
import { handleSalesforceInstallationInfo } from './src/tools/installation-info.js';
import { SalesforceClient } from './src/salesforce/client.js';
import { config } from 'dotenv';

config();

async function testLearningSystem() {
  console.log('🎓 Testing MCP Salesforce Learning System');
  console.log('==========================================\n');
  
  try {
    // Initialize Salesforce client
    console.log('1️⃣ Initializing Salesforce client...');
    const client = new SalesforceClient();
    await client.initialize();
    console.log('✅ Connected to Salesforce\n');
    
    // Test learning the installation
    console.log('2️⃣ Learning your Salesforce installation...');
    console.log('   This will analyze all 814 objects and their fields...');
    const learnResult = await handleSalesforceLearn({
      include_unused: false,
      detailed_relationships: true
    }, client);
    
    console.log('✅ Learning completed!');
    console.log(`📊 Result: ${learnResult.content[0].text.substring(0, 200)}...\n`);
    
    // Test getting installation overview
    console.log('3️⃣ Getting installation overview...');
    const overviewResult = await handleSalesforceInstallationInfo({});
    console.log('Installation Overview:');
    console.log(overviewResult.content[0].text.substring(0, 500) + '...\n');
    
    // Test searching for specific custom objects
    console.log('4️⃣ Testing object-specific queries...');
    
    // Search for Zeitabrechnung (Time Tracking)
    console.log('🔍 Searching for Zeitabrechnung object...');
    const zeitabrechnungInfo = await handleSalesforceInstallationInfo({
      object_name: 'Zeitabrechnung__c'
    });
    console.log('Zeitabrechnung Details:');
    console.log(zeitabrechnungInfo.content[0].text.substring(0, 400) + '...\n');
    
    // Search for Projekt (Project)
    console.log('🔍 Searching for Projekt object...');
    const projektInfo = await handleSalesforceInstallationInfo({
      object_name: 'Projekt__c'
    });
    console.log('Projekt Details:');
    console.log(projektInfo.content[0].text.substring(0, 400) + '...\n');
    
    // Search for custom objects only
    console.log('5️⃣ Getting custom objects overview...');
    const customOnlyResult = await handleSalesforceInstallationInfo({
      show_custom_only: true
    });
    console.log('Custom Objects:');
    console.log(customOnlyResult.content[0].text.substring(0, 500) + '...\n');
    
    console.log('🎉 Learning System Test Complete!');
    console.log('\n✅ Your Salesforce installation has been successfully learned');
    console.log('✅ Local documentation cache created');
    console.log('✅ Intelligent assistance now available');
    console.log('\n💡 Try asking questions like:');
    console.log('   - "Show me all Zeitabrechnung records from this month"');
    console.log('   - "Create a new Projekt record"');
    console.log('   - "What fields are available on Rechnung__c?"');
    
  } catch (error) {
    console.error('❌ Error during learning system test:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testLearningSystem().catch(console.error);
