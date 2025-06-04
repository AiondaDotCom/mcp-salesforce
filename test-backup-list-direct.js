#!/usr/bin/env node

/**
 * Test the salesforce_backup_list tool directly
 */

import { handleSalesforceBackupList } from './src/tools/backup.js';

console.log('🧪 Testing salesforce_backup_list tool directly');
console.log('='.repeat(50));

try {
  console.log('📋 Calling handleSalesforceBackupList...');
  const result = await handleSalesforceBackupList({});
  
  console.log('\n📊 Result:');
  console.log('Content type:', typeof result.content);
  console.log('Content length:', result.content.length);
  
  if (result.content && result.content[0] && result.content[0].text) {
    console.log('\n📝 Response text:');
    console.log(result.content[0].text);
  } else {
    console.log('❌ No text content found');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}
