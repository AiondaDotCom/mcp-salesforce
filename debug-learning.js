#!/usr/bin/env node

// Simple debug test for learning system
import { SalesforceClient } from './src/salesforce/client.js';
import { config } from 'dotenv';

config();

async function debugTest() {
  console.log('🔧 Debug Test for Learning System');
  console.log('==================================\n');
  
  try {
    console.log('1. Testing Salesforce connection...');
    const client = new SalesforceClient();
    await client.initialize();
    console.log('✅ Connection successful\n');
    
    console.log('2. Testing object description...');
    const zeitResult = await client.describe('Zeitabrechnung__c');
    console.log('✅ Zeitabrechnung__c description successful');
    console.log(`   - Fields: ${zeitResult.fields.length}`);
    console.log(`   - Label: ${zeitResult.label}`);
    console.log(`   - Custom: ${zeitResult.custom}\n`);
    
    console.log('3. Testing global description...');
    const globalResult = await client.describeGlobal();
    console.log('✅ Global description successful');
    console.log(`   - Total objects: ${globalResult.length}`);
    console.log(`   - Custom objects: ${globalResult.filter(obj => obj.custom).length}\n`);
    
    console.log('4. Testing directory creation...');
    const fs = await import('fs/promises');
    const path = await import('path');
    const cacheDir = path.join(process.cwd(), 'cache');
    
    try {
      await fs.access(cacheDir);
      console.log('✅ Cache directory exists');
    } catch {
      console.log('Creating cache directory...');
      await fs.mkdir(cacheDir, { recursive: true });
      console.log('✅ Cache directory created');
    }
    
    console.log('\n🎯 All basic tests passed - learning system should work');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTest().catch(console.error);
