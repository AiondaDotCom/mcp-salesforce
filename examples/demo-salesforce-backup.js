#!/usr/bin/env node

/**
 * Salesforce Backup Feature - Demo Script
 * 
 * This script demonstrates the backup functionality using mock data.
 * For the actual implementation, see src/backup/manager.js
 */

import { SalesforceBackupManager } from './src/backup/manager.js';
import { debug as logger } from './src/utils/debug.js';

/**
 * Demo function - Mock implementation for testing
 */
async function demonstrateBackupFeature() {
  logger.log('🗄️ Salesforce Backup Feature - Demo\n');
  logger.log('=' .repeat(50));
  
  // Mock Salesforce client for demonstration
  const mockClient = {
    instanceUrl: 'https://demo.salesforce.com',
    version: '58.0',
    
    async ensureValidConnection() {
      return true;
    },
    
    async describeGlobal() {
      return [
        { name: 'Account', queryable: true },
        { name: 'Contact', queryable: true },
        { name: 'Opportunity', queryable: true },
        { name: 'ContentDocument', queryable: true },
        { name: 'ContentVersion', queryable: true },
        { name: 'Attachment', queryable: true },
        { name: 'Document', queryable: true }
      ];
    },
    
    async query(soql) {
      // Mock query results
      if (soql.includes('ContentVersion')) {
        return {
          records: [
            { Id: '068000001234567', Title: 'demo-file.pdf', FileType: 'pdf', ContentSize: 1024 },
            { Id: '068000001234568', Title: 'presentation.pptx', FileType: 'pptx', ContentSize: 2048 }
          ]
        };
      } else if (soql.includes('Attachment')) {
        return {
          records: [
            { Id: '00P000001234567', Name: 'attachment.jpg', ContentType: 'image/jpeg', BodyLength: 512 }
          ]
        };
      } else if (soql.includes('Document')) {
        return {
          records: [
            { Id: '015000001234567', Name: 'document.doc', Type: 'application/msword', BodyLength: 768 }
          ]
        };
      } else {
        return {
          records: [
            { Id: '001000001234567', Name: 'Demo Record 1' },
            { Id: '001000001234568', Name: 'Demo Record 2' }
          ]
        };
      }
    },
    
    tokenManager: {
      async getValidAccessToken() {
        return 'mock_access_token';
      }
    }
  };
  
  // Mock fetch for file downloads
  global.fetch = async (url) => {
    return {
      ok: true,
      arrayBuffer: async () => {
        // Return mock binary data
        const size = Math.floor(Math.random() * 1000) + 500;
        return new ArrayBuffer(size);
      }
    };
  };
  
  try {
    // Create backup manager
    const backupManager = new SalesforceBackupManager(mockClient, {
      outputDirectory: './demo-backups',
      includeFiles: true,
      includeAttachments: true,
      includeDocuments: true,
      parallelDownloads: 3
    });
    
    // Run backup
    const result = await backupManager.createBackup('full');
    
    logger.log('\n📊 Backup Results:');
    logger.log(`   💾 Duration: ${result.duration} seconds`);
    logger.log(`   📁 Location: ${result.backupDirectory}`);
    logger.log(`   📈 Stats:`, result.stats);
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run demo if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateBackupFeature().catch(console.error);
}
