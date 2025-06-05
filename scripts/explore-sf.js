#!/usr/bin/env node

// Quick Salesforce object explorer
import { SalesforceClient } from './src/salesforce/client.js';
import { config } from 'dotenv';

config();

async function exploreSalesforce() {
  console.log('🔍 Exploring Your Salesforce Objects');
  console.log('====================================\n');
  
  try {
    console.log('🔗 Connecting to Salesforce...');
    const client = new SalesforceClient();
    await client.initialize();
    console.log('✅ Connected successfully!\n');
    
    // Get basic org info
    console.log('📊 Organization Information:');
    const userInfo = await client.getUserInfo();
    console.log(`🏢 Organization: ${userInfo.organization_id}`);
    console.log(`👤 User: ${userInfo.display_name}`);
    console.log(`🌐 Instance: ${client.instanceUrl}\n`);
    
    // List all objects
    console.log('📋 Available Objects:');
    const sobjects = await client.describeGlobal();
    
    // Group objects by type
    const standardObjects = [];
    const customObjects = [];
    
    sobjects.forEach(obj => {
      if (obj.custom) {
        customObjects.push(obj);
      } else {
        standardObjects.push(obj);
      }
    });
    
    console.log(`\n📦 Standard Objects (${standardObjects.length} total):`);
    console.log('Main objects: Account, Contact, Opportunity, Lead, Case, Task, Event');
    
    console.log(`\n🎯 Custom Objects (${customObjects.length} total):`);
    if (customObjects.length > 0) {
      customObjects.forEach(obj => {
        console.log(`   - ${obj.name} (${obj.label})`);
      });
    } else {
      console.log('   No custom objects found');
    }
    
    // Get sample data from Account
    console.log('\n💼 Sample Account Data:');
    try {
      const accounts = await client.query('SELECT Id, Name, Type, Industry FROM Account LIMIT 5');
      if (accounts.records && accounts.records.length > 0) {
        accounts.records.forEach((acc, i) => {
          console.log(`   ${i+1}. ${acc.Name} ${acc.Type ? `(${acc.Type})` : ''}${acc.Industry ? ` - ${acc.Industry}` : ''}`);
        });
      } else {
        console.log('   No Account records found');
      }
    } catch (queryError) {
      console.log('   Unable to query Account data:', queryError.message);
    }
    
    // Get sample data from Contact  
    console.log('\n👥 Sample Contact Data:');
    try {
      const contacts = await client.query('SELECT Id, Name, Title, Email FROM Contact LIMIT 5');
      if (contacts.records && contacts.records.length > 0) {
        contacts.records.forEach((contact, i) => {
          console.log(`   ${i+1}. ${contact.Name}${contact.Title ? ` (${contact.Title})` : ''}${contact.Email ? ` - ${contact.Email}` : ''}`);
        });
      } else {
        console.log('   No Contact records found');
      }
    } catch (queryError) {
      console.log('   Unable to query Contact data:', queryError.message);
    }
    
    console.log('\n🎉 Exploration Complete!');
    console.log('\nNext steps:');
    console.log('1. Run salesforce_learn to create local documentation');
    console.log('2. Use salesforce_installation_info to get detailed object information');
    console.log('3. Query specific objects with salesforce_query');
    
  } catch (error) {
    console.error('❌ Error exploring Salesforce:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

exploreSalesforce().catch(console.error);
