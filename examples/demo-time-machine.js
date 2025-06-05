#!/usr/bin/env node

// Demo script for Salesforce Time Machine functionality
// This script demonstrates the historical data query capabilities

import { SalesforceTimeMachine } from './src/tools/time_machine.js';

async function demonstrateTimeMachine() {
  console.log('🕰️  Salesforce Time Machine Demo');
  console.log('=================================\n');

  // Use the existing demo backups directory
  const backupDirectory = './demo-backups';
  const timeMachine = new SalesforceTimeMachine(backupDirectory);

  try {
    // 1. List all available backups
    console.log('📋 Step 1: Listing all available backups...');
    const backups = await timeMachine.getAllBackups();
    console.log(`Found ${backups.length} backup(s):`);
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup.timestamp} (${backup.manifest.downloadStats.contentVersions} ContentVersions, ${backup.manifest.downloadStats.attachments} Attachments)`);
    });
    console.log();

    if (backups.length === 0) {
      console.log('❌ No backups found. Please create some backups first using the backup tool.');
      return;
    }

    // 2. Query data at a specific point in time
    console.log('🔍 Step 2: Querying data at a specific point in time...');
    const targetDate = new Date('2025-06-04T15:20:00.000Z'); // After our demo backup
    const pointInTimeResult = await timeMachine.queryAtPointInTime(targetDate, 'ContentVersion');
    
    if (pointInTimeResult.success) {
      console.log(`✅ Found ${pointInTimeResult.count} ContentVersion records as of ${pointInTimeResult.snapshotDate}:`);
      pointInTimeResult.data.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.Title} (${record.FileType}, ${record.ContentSize} bytes)`);
      });
    } else {
      console.log(`❌ Point-in-time query failed: ${pointInTimeResult.error}`);
    }
    console.log();

    // 3. Query with filters
    console.log('🔍 Step 3: Querying with filters (PDF files only)...');
    const filteredResult = await timeMachine.queryAtPointInTime(targetDate, 'ContentVersion', { FileType: 'pdf' });
    
    if (filteredResult.success) {
      console.log(`✅ Found ${filteredResult.count} PDF files as of ${filteredResult.snapshotDate}:`);
      filteredResult.data.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.Title} (${record.FileType}, ${record.ContentSize} bytes)`);
      });
    } else {
      console.log(`❌ Filtered query failed: ${filteredResult.error}`);
    }
    console.log();

    // 4. Wildcard search
    console.log('🔍 Step 4: Wildcard search (files with "demo" in title)...');
    const wildcardResult = await timeMachine.queryAtPointInTime(targetDate, 'ContentVersion', { Title: '*demo*' });
    
    if (wildcardResult.success) {
      console.log(`✅ Found ${wildcardResult.count} files matching "*demo*" pattern:`);
      wildcardResult.data.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.Title} (${record.FileType}, ${record.ContentSize} bytes)`);
      });
    } else {
      console.log(`❌ Wildcard search failed: ${wildcardResult.error}`);
    }
    console.log();

    // 5. Show available operations
    console.log('📚 Step 5: Available Time Machine operations:');
    const operations = timeMachine.getAvailableOperations();
    operations.forEach((op, index) => {
      console.log(`  ${index + 1}. ${op.operation}: ${op.description}`);
      console.log(`     Parameters: ${op.parameters.join(', ')}`);
    });
    console.log();

    // 6. Demonstrate comparison (if we had multiple backups)
    if (backups.length > 1) {
      console.log('🔄 Step 6: Comparing data between two points in time...');
      const startDate = backups[backups.length - 1].timestamp; // Oldest backup
      const endDate = backups[0].timestamp; // Newest backup
      
      const comparisonResult = await timeMachine.compareDataOverTime(startDate, endDate, 'ContentVersion');
      
      if (comparisonResult.success) {
        console.log('✅ Data comparison results:');
        console.log(`   Start: ${comparisonResult.comparison.startSnapshot.date} (${comparisonResult.comparison.startSnapshot.count} records)`);
        console.log(`   End: ${comparisonResult.comparison.endSnapshot.date} (${comparisonResult.comparison.endSnapshot.count} records)`);
        console.log(`   Change: ${comparisonResult.comparison.changes.countDifference > 0 ? '+' : ''}${comparisonResult.comparison.changes.countDifference} records`);
      } else {
        console.log(`❌ Comparison failed: ${comparisonResult.error}`);
      }
    } else {
      console.log('ℹ️  Step 6: Need multiple backups for comparison demo (only 1 backup found)');
    }
    console.log();

    // 7. Show practical examples
    console.log('💡 Practical Usage Examples:');
    console.log('   • "What files existed in our Salesforce org on December 1st, 2024?"');
    console.log('   • "Show me all PDF documents that were in the system before the migration"');
    console.log('   • "Find all contacts with email addresses containing \'@oldcompany.com\' from last month"');
    console.log('   • "Compare our attachment counts between Q3 and Q4 2024"');
    console.log('   • "Show me the history of changes to account ID 001XXXXXXXXXXXX"');
    console.log();

    console.log('✨ Time Machine Demo completed successfully!');
    console.log('💡 Use this tool to query historical Salesforce data from any point in time.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTimeMachine().catch(console.error);
}

export { demonstrateTimeMachine };
