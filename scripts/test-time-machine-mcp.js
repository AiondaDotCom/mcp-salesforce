#!/usr/bin/env node

// Test script for Time Machine MCP integration
import { MCPSalesforceServer } from './src/index.js';

async function testTimeMachineMCP() {
  console.log('🕰️  Testing Salesforce Time Machine MCP Integration');
  console.log('=================================================\n');

  try {
    const server = new MCPSalesforceServer();

    // Test the time machine query handler directly
    console.log('📋 Test 1: List available backups...');
    const listResult = await server.handleTimeMachineQuery({
      operation: 'list_backups',
      backupDirectory: './demo-backups'
    });

    console.log('Result:', JSON.stringify(listResult, null, 2));
    console.log();

    // Test point-in-time query
    console.log('🔍 Test 2: Point-in-time query...');
    const queryResult = await server.handleTimeMachineQuery({
      operation: 'query_at_point_in_time',
      targetDate: '2025-06-04T15:20:00.000Z',
      objectType: 'ContentVersion',
      backupDirectory: './demo-backups'
    });

    console.log('Result:', JSON.stringify(queryResult, null, 2));
    console.log();

    // Test filtered query
    console.log('🔍 Test 3: Filtered query (PDF files only)...');
    const filteredResult = await server.handleTimeMachineQuery({
      operation: 'query_at_point_in_time',
      targetDate: '2025-06-04T15:20:00.000Z',
      objectType: 'ContentVersion',
      filters: { FileType: 'pdf' },
      backupDirectory: './demo-backups'
    });

    console.log('Result:', JSON.stringify(filteredResult, null, 2));
    console.log();

    // Test error handling
    console.log('❌ Test 4: Error handling (invalid operation)...');
    const errorResult = await server.handleTimeMachineQuery({
      operation: 'invalid_operation',
      backupDirectory: './demo-backups'
    });

    console.log('Result:', JSON.stringify(errorResult, null, 2));
    console.log();

    console.log('✅ All Time Machine MCP integration tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testTimeMachineMCP().catch(console.error);
}

export { testTimeMachineMCP };
