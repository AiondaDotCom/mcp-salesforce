#!/usr/bin/env node

/**
 * Test the backup list functionality specifically
 */

import { handleSalesforceBackupList } from './src/tools/backup.js';

console.log('📂 Testing Backup List Functionality\n');

async function testBackupList() {
  try {
    // Test with our test backups
    const result = await handleSalesforceBackupList({
      backup_directory: './test-backups-mcp'
    });
    
    console.log('📋 Backup List Result:');
    console.log(result.content[0].text);
    
    console.log('\n✅ Backup list test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBackupList().catch(console.error);
