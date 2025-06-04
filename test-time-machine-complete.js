#!/usr/bin/env node

// Complete integration test for Salesforce Time Machine
// Tests all operations and validates end-to-end functionality

import { MCPSalesforceServer } from './src/index.js';
import { SalesforceTimeMachine } from './src/tools/time_machine.js';
import fs from 'fs';

async function runComprehensiveTest() {
  console.log('🧪 Comprehensive Salesforce Time Machine Integration Test');
  console.log('=====================================================\n');

  const server = new MCPSalesforceServer();
  const timeMachine = new SalesforceTimeMachine('./demo-backups');
  
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`✅ ${testName}`);
      passedTests++;
    } else {
      console.log(`❌ ${testName}`);
    }
  }

  try {
    // Test 1: Backup Discovery
    console.log('🔍 Testing Backup Discovery...');
    const backups = await timeMachine.getAllBackups();
    assert(backups.length >= 2, 'Should find at least 2 backups');
    assert(backups[0].timestamp > backups[1].timestamp, 'Should sort backups by timestamp (newest first)');
    console.log(`   Found ${backups.length} backups`);
    console.log();

    // Test 2: MCP List Backups Operation
    console.log('📋 Testing MCP List Backups Operation...');
    const listResult = await server.handleTimeMachineQuery({
      operation: 'list_backups',
      backupDirectory: './demo-backups'
    });
    assert(!listResult.isError, 'List backups should not have errors');
    assert(listResult.content[0].text.includes('Time Machine Query Results'), 'Should contain results');
    console.log();

    // Test 3: Point-in-Time Query
    console.log('🕐 Testing Point-in-Time Queries...');
    const pointInTimeResult = await server.handleTimeMachineQuery({
      operation: 'query_at_point_in_time',
      targetDate: '2025-06-04T17:00:00.000Z',
      objectType: 'ContentVersion',
      backupDirectory: './demo-backups'
    });
    assert(!pointInTimeResult.isError, 'Point-in-time query should not have errors');
    assert(pointInTimeResult.content[0].text.includes('snapshotDate'), 'Should include snapshot date');
    console.log();

    // Test 4: Filtered Query
    console.log('🔍 Testing Filtered Queries...');
    const filteredResult = await server.handleTimeMachineQuery({
      operation: 'query_at_point_in_time',
      targetDate: '2025-06-04T17:00:00.000Z',
      objectType: 'ContentVersion',
      filters: { FileType: 'pdf' },
      backupDirectory: './demo-backups'
    });
    assert(!filteredResult.isError, 'Filtered query should not have errors');
    console.log();

    // Test 5: Wildcard Search
    console.log('🔍 Testing Wildcard Search...');
    const wildcardQuery = await timeMachine.queryAtPointInTime(
      '2025-06-04T17:00:00.000Z',
      'ContentVersion',
      { Title: '*demo*' }
    );
    assert(wildcardQuery.success, 'Wildcard search should succeed');
    assert(wildcardQuery.count >= 0, 'Should return valid count');
    console.log();

    // Test 6: Data Comparison
    console.log('🔄 Testing Data Comparison...');
    if (backups.length >= 2) {
      const comparisonResult = await server.handleTimeMachineQuery({
        operation: 'compare_over_time',
        startDate: backups[1].timestamp,
        endDate: backups[0].timestamp,
        objectType: 'ContentVersion',
        backupDirectory: './demo-backups'
      });
      assert(!comparisonResult.isError, 'Comparison query should not have errors');
      assert(comparisonResult.content[0].text.includes('comparison'), 'Should include comparison data');
    }
    console.log();

    // Test 7: Record History
    console.log('📖 Testing Record History...');
    const historyResult = await server.handleTimeMachineQuery({
      operation: 'get_record_history',
      recordId: '001000001234567',
      objectType: 'Account',
      backupDirectory: './demo-backups'
    });
    assert(!historyResult.isError, 'Record history should not have errors');
    console.log();

    // Test 8: Error Handling
    console.log('❌ Testing Error Handling...');
    const errorResult = await server.handleTimeMachineQuery({
      operation: 'invalid_operation',
      backupDirectory: './demo-backups'
    });
    assert(errorResult.isError, 'Invalid operation should produce error');
    assert(errorResult.content[0].text.includes('failed'), 'Should include error message');
    console.log();

    // Test 9: Missing Parameters
    console.log('❌ Testing Missing Parameters...');
    const missingParamsResult = await server.handleTimeMachineQuery({
      operation: 'query_at_point_in_time',
      // Missing targetDate and objectType
      backupDirectory: './demo-backups'
    });
    assert(missingParamsResult.isError, 'Missing parameters should produce error');
    console.log();

    // Test 10: Available Operations
    console.log('📚 Testing Available Operations...');
    const operations = timeMachine.getAvailableOperations();
    assert(operations.length === 4, 'Should have 4 available operations');
    assert(operations.some(op => op.operation === 'query_at_point_in_time'), 'Should include point-in-time query');
    assert(operations.some(op => op.operation === 'compare_over_time'), 'Should include comparison');
    assert(operations.some(op => op.operation === 'get_record_history'), 'Should include record history');
    assert(operations.some(op => op.operation === 'list_backups'), 'Should include list backups');
    console.log();

    // Test 11: Data Consistency
    console.log('🔍 Testing Data Consistency...');
    const directQuery = await timeMachine.queryAtPointInTime(
      '2025-06-04T17:00:00.000Z',
      'ContentVersion'
    );
    const mcpQuery = await server.handleTimeMachineQuery({
      operation: 'query_at_point_in_time',
      targetDate: '2025-06-04T17:00:00.000Z',
      objectType: 'ContentVersion',
      backupDirectory: './demo-backups'
    });
    
    assert(directQuery.success, 'Direct query should succeed');
    assert(!mcpQuery.isError, 'MCP query should succeed');
    
    // Extract count from MCP response
    const mcpResponseText = mcpQuery.content[0].text;
    const mcpCount = JSON.parse(mcpResponseText.split('Time Machine Query Results:\n\n')[1]).count;
    assert(directQuery.count === mcpCount, 'Direct and MCP queries should return same count');
    console.log();

    // Test 12: Backup Manifest Validation
    console.log('📋 Testing Backup Manifest Validation...');
    for (const backup of backups) {
      assert(backup.manifest.backupInfo, 'Backup should have backupInfo');
      assert(backup.manifest.backupInfo.timestamp, 'Backup should have timestamp');
      assert(backup.manifest.downloadStats, 'Backup should have download stats');
    }
    console.log();

    // Summary
    console.log('📊 Test Results Summary:');
    console.log('========================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log();

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! ✅');
      console.log('🚀 Salesforce Time Machine is ready for production use!');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }

    // Performance Test
    console.log('\n⚡ Performance Test:');
    console.log('==================');
    
    const startTime = Date.now();
    await timeMachine.queryAtPointInTime('2025-06-04T17:00:00.000Z', 'ContentVersion');
    const endTime = Date.now();
    
    const queryTime = endTime - startTime;
    console.log(`Point-in-time query execution time: ${queryTime}ms`);
    assert(queryTime < 1000, 'Query should complete within 1 second');
    
    console.log();
    console.log('🏁 Comprehensive integration test completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the comprehensive test
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTest().catch(console.error);
}

export { runComprehensiveTest };
