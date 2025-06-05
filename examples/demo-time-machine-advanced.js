#!/usr/bin/env node

// Advanced Time Machine Demo - Shows more sophisticated scenarios
import { SalesforceTimeMachine } from './src/tools/time_machine.js';
import fs from 'fs';
import path from 'path';

async function createDemoScenario() {
  console.log('🏗️  Creating Advanced Time Machine Demo Scenario');
  console.log('===============================================\n');

  // Create a second backup with different data for comparison
  const secondBackupDir = './demo-backups/salesforce-backup-2025-06-04T16-00-00-000Z';
  
  if (!fs.existsSync(secondBackupDir)) {
    fs.mkdirSync(secondBackupDir, { recursive: true });
    fs.mkdirSync(path.join(secondBackupDir, 'data'));
    fs.mkdirSync(path.join(secondBackupDir, 'metadata'));
    fs.mkdirSync(path.join(secondBackupDir, 'files'));
    fs.mkdirSync(path.join(secondBackupDir, 'logs'));

    // Create evolved data - simulate changes over time
    const evolvedContentVersions = [
      {
        "Id": "068000001234567",
        "Title": "demo-file-updated.pdf",
        "FileType": "pdf",
        "ContentSize": 2048
      },
      {
        "Id": "068000001234568",
        "Title": "presentation.pptx",
        "FileType": "pptx",
        "ContentSize": 2048
      },
      {
        "Id": "068000001234569",
        "Title": "new-document.docx",
        "FileType": "docx",
        "ContentSize": 1536
      }
    ];

    const evolvedAccounts = [
      {
        "Id": "001000001234567",
        "Name": "ACME Corporation",
        "Type": "Customer",
        "BillingStreet": "123 Old Street",
        "BillingCity": "San Francisco",
        "Phone": "+1-555-0123"
      },
      {
        "Id": "001000001234568",
        "Name": "TechCorp Solutions",
        "Type": "Partner",
        "BillingStreet": "456 Innovation Blvd",
        "BillingCity": "Austin",
        "Phone": "+1-555-0456"
      }
    ];

    // Write evolved data
    fs.writeFileSync(
      path.join(secondBackupDir, 'data', 'ContentVersion.json'),
      JSON.stringify(evolvedContentVersions, null, 2)
    );

    fs.writeFileSync(
      path.join(secondBackupDir, 'data', 'Account.json'),
      JSON.stringify(evolvedAccounts, null, 2)
    );

    // Create manifest for second backup
    const secondManifest = {
      "backupInfo": {
        "timestamp": "2025-06-04T16:00:00.000Z",
        "type": "comprehensive",
        "duration": 0,
        "salesforceInstance": "https://demo.salesforce.com"
      },
      "options": {
        "outputDirectory": "./demo-backups",
        "includeFiles": true,
        "includeAttachments": true,
        "includeDocuments": true,
        "compression": false,
        "parallelDownloads": 3
      },
      "downloadStats": {
        "contentVersions": 3,
        "attachments": 1,
        "documents": 1,
        "totalBytes": 5632,
        "errors": 0,
        "totalMB": 0
      },
      "directories": {
        "metadata": "metadata/",
        "data": "data/",
        "files": "files/",
        "logs": "logs/"
      }
    };

    fs.writeFileSync(
      path.join(secondBackupDir, 'backup-manifest.json'),
      JSON.stringify(secondManifest, null, 2)
    );

    console.log('✅ Created second backup for comparison demo');
  }

  // Also add Account data to first backup for more interesting queries
  const firstBackupDir = './demo-backups/salesforce-backup-2025-06-04T15-15-42-098Z';
  const firstAccountPath = path.join(firstBackupDir, 'data', 'Account.json');
  
  if (!fs.existsSync(firstAccountPath)) {
    const originalAccounts = [
      {
        "Id": "001000001234567",
        "Name": "ACME Corporation",
        "Type": "Customer",
        "BillingStreet": "123 Main Street",
        "BillingCity": "San Francisco",
        "Phone": "+1-555-0123"
      },
      {
        "Id": "001000001234568",
        "Name": "TechCorp Solutions",
        "Type": "Prospect",
        "BillingStreet": "456 Tech Avenue",
        "BillingCity": "Austin",
        "Phone": "+1-555-0456"
      }
    ];

    fs.writeFileSync(firstAccountPath, JSON.stringify(originalAccounts, null, 2));
    console.log('✅ Added Account data to first backup');
  }
}

async function demonstrateAdvancedTimeMachine() {
  console.log('🕰️  Advanced Salesforce Time Machine Demo');
  console.log('========================================\n');

  const timeMachine = new SalesforceTimeMachine('./demo-backups');

  try {
    await createDemoScenario();
    console.log();

    // 1. Show all backups
    console.log('📋 Available Backups:');
    const backups = await timeMachine.getAllBackups();
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup.timestamp}`);
      console.log(`     ContentVersions: ${backup.manifest.downloadStats.contentVersions}`);
      console.log(`     Total Size: ${backup.manifest.downloadStats.totalBytes} bytes`);
    });
    console.log();

    // 2. Compare data evolution over time
    if (backups.length >= 2) {
      console.log('🔄 Data Evolution Analysis:');
      console.log('==========================');
      
      const comparison = await timeMachine.compareDataOverTime(
        backups[1].timestamp, // Older backup
        backups[0].timestamp, // Newer backup
        'ContentVersion'
      );

      if (comparison.success) {
        console.log(`📊 ContentVersion Changes:`);
        console.log(`   ${backups[1].timestamp}: ${comparison.comparison.startSnapshot.count} files`);
        console.log(`   ${backups[0].timestamp}: ${comparison.comparison.endSnapshot.count} files`);
        console.log(`   Change: ${comparison.comparison.changes.countDifference > 0 ? '+' : ''}${comparison.comparison.changes.countDifference}`);
        
        console.log('\n📁 File Details:');
        console.log('   Before:');
        comparison.comparison.startSnapshot.data.forEach(file => {
          console.log(`     - ${file.Title} (${file.FileType}, ${file.ContentSize} bytes)`);
        });
        console.log('   After:');
        comparison.comparison.endSnapshot.data.forEach(file => {
          console.log(`     - ${file.Title} (${file.FileType}, ${file.ContentSize} bytes)`);
        });
      }
      console.log();
    }

    // 3. Demonstrate "What if" scenarios
    console.log('🤔 Time Machine "What If" Scenarios:');
    console.log('===================================');

    // Scenario: "What PDF files existed before 4 PM today?"
    const beforeFourPM = '2025-06-04T15:30:00.000Z';
    const pdfQuery = await timeMachine.queryAtPointInTime(beforeFourPM, 'ContentVersion', { FileType: 'pdf' });
    
    if (pdfQuery.success) {
      console.log(`📄 PDF files that existed before 4 PM today:`);
      pdfQuery.data.forEach(file => {
        console.log(`   - ${file.Title} (${file.ContentSize} bytes)`);
      });
    }
    console.log();

    // Scenario: "Show me accounts that were prospects vs customers over time"
    console.log('🏢 Account Type Evolution:');
    if (backups.length >= 2) {
      const oldAccounts = await timeMachine.queryAtPointInTime(backups[1].timestamp, 'Account');
      const newAccounts = await timeMachine.queryAtPointInTime(backups[0].timestamp, 'Account');

      if (oldAccounts.success && newAccounts.success) {
        console.log(`   Before (${backups[1].timestamp}):`);
        oldAccounts.data.forEach(acc => {
          console.log(`     ${acc.Name}: ${acc.Type} (${acc.BillingStreet})`);
        });
        
        console.log(`   After (${backups[0].timestamp}):`);
        newAccounts.data.forEach(acc => {
          console.log(`     ${acc.Name}: ${acc.Type} (${acc.BillingStreet})`);
        });
      }
    }
    console.log();

    // 4. Record History Tracking
    console.log('📖 Individual Record History:');
    console.log('============================');
    
    const recordHistory = await timeMachine.getRecordHistory('001000001234567', 'Account');
    if (recordHistory.success) {
      console.log(`🏢 History of Account ${recordHistory.recordId}:`);
      recordHistory.history.forEach((snapshot, index) => {
        console.log(`   ${index + 1}. ${snapshot.timestamp}:`);
        console.log(`      Name: ${snapshot.data.Name}`);
        console.log(`      Type: ${snapshot.data.Type}`);
        console.log(`      Address: ${snapshot.data.BillingStreet}, ${snapshot.data.BillingCity}`);
      });
    }
    console.log();

    // 5. Practical Business Scenarios
    console.log('💼 Practical Business Use Cases:');
    console.log('===============================');
    
    const useCases = [
      {
        title: "Compliance Audit",
        description: "What customer data existed on a specific compliance audit date?",
        example: "timeMachine.queryAtPointInTime('2024-12-31T23:59:59Z', 'Account')"
      },
      {
        title: "Data Migration Verification", 
        description: "Compare data before and after a major system migration",
        example: "timeMachine.compareDataOverTime('pre-migration-date', 'post-migration-date', 'Contact')"
      },
      {
        title: "Lost Data Recovery",
        description: "Find what attachments existed before accidental deletion",
        example: "timeMachine.queryAtPointInTime('last-known-good-date', 'Attachment')"
      },
      {
        title: "Customer Journey Analysis",
        description: "Track how a customer record evolved over time",
        example: "timeMachine.getRecordHistory('customer-id', 'Account')"
      },
      {
        title: "Regulatory Reporting",
        description: "Generate reports showing data state at end of quarters",
        example: "timeMachine.queryAtPointInTime('quarter-end-date', 'Opportunity')"
      }
    ];

    useCases.forEach((useCase, index) => {
      console.log(`   ${index + 1}. ${useCase.title}:`);
      console.log(`      ${useCase.description}`);
      console.log(`      Example: ${useCase.example}`);
      console.log();
    });

    console.log('✨ Advanced Time Machine Demo completed!');
    console.log('🎯 Your Salesforce data now has complete historical queryability!');

  } catch (error) {
    console.error('❌ Advanced demo failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the advanced demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateAdvancedTimeMachine().catch(console.error);
}

export { demonstrateAdvancedTimeMachine };
