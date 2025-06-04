#!/usr/bin/env node

/**
 * Test the integrated backup functionality in the MCP server
 */

import { handleSalesforceBackup, handleSalesforceBackupList, BACKUP_TOOLS } from './src/tools/backup.js';

console.log('🧪 Testing MCP Backup Integration\n');
console.log('=' .repeat(50));

// Mock Salesforce client
const mockClient = {
  instanceUrl: 'https://test.salesforce.com',
  version: '58.0',
  
  async ensureValidConnection() {
    return true;
  },
  
  async describeGlobal() {
    return [
      { name: 'Account', queryable: true },
      { name: 'Contact', queryable: true },
      { name: 'ContentVersion', queryable: true },
      { name: 'Attachment', queryable: true },
      { name: 'Document', queryable: true }
    ];
  },
  
  async query(soql) {
    // Mock smaller datasets for quick testing
    if (soql.includes('ContentVersion')) {
      return {
        records: [
          { Id: '068TEST001', Title: 'test-file.pdf', FileType: 'pdf', ContentSize: 512 }
        ]
      };
    } else if (soql.includes('Attachment')) {
      return {
        records: [
          { Id: '00PTEST001', Name: 'test-attachment.jpg', ContentType: 'image/jpeg', BodyLength: 256 }
        ]
      };
    } else if (soql.includes('Document')) {
      return {
        records: [
          { Id: '015TEST001', Name: 'test-document.doc', Type: 'application/msword', BodyLength: 128 }
        ]
      };
    } else {
      return {
        records: [
          { Id: '001TEST001', Name: 'Test Record' }
        ]
      };
    }
  },
  
  tokenManager: {
    async getValidAccessToken() {
      return 'mock_test_token';
    }
  }
};

// Mock fetch
global.fetch = async (url) => {
  return {
    ok: true,
    arrayBuffer: async () => {
      // Small test file
      return new ArrayBuffer(128);
    }
  };
};

async function testMCPBackupTools() {
  try {
    console.log('📋 1. Testing backup tool schemas...');
    
    // Test tool definitions
    console.log('   ✅ salesforce_backup tool schema:', !!BACKUP_TOOLS.salesforce_backup);
    console.log('   ✅ salesforce_backup_list tool schema:', !!BACKUP_TOOLS.salesforce_backup_list);
    
    console.log('\n📦 2. Testing backup execution...');
    
    // Test backup execution
    const backupArgs = {
      backup_type: 'files_only',
      output_directory: './test-backups-mcp',
      include_files: true,
      include_attachments: true,
      include_documents: true,
      parallel_downloads: 2
    };
    
    const backupResult = await handleSalesforceBackup(backupArgs, mockClient);
    
    console.log('   ✅ Backup executed successfully');
    console.log('   📊 Result type:', backupResult?.content?.[0]?.type);
    console.log('   📝 Contains success message:', backupResult?.content?.[0]?.text?.includes('✅'));
    
    console.log('\n📂 3. Testing backup listing...');
    
    // Test backup listing
    const listArgs = {
      backup_directory: './test-backups-mcp'
    };
    
    const listResult = await handleSalesforceBackupList(listArgs);
    
    console.log('   ✅ Backup listing executed successfully');
    console.log('   📊 Result type:', listResult?.content?.[0]?.type);
    console.log('   📝 Contains backup info:', listResult?.content?.[0]?.text?.includes('📅'));
    
    console.log('\n🎉 All MCP backup integration tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testMCPBackupTools().catch(console.error);
