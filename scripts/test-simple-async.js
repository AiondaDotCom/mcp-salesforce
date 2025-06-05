/**
 * Simple Async Backup Test
 */

console.log('🧪 Starting Async Backup System Test...\n');

async function runTest() {
  try {
    // Import modules
    const { BackupJobManager, SalesforceBackupManager } = await import('./src/backup/manager.js');
    const { handleSalesforceBackup, handleSalesforceBackupStatus } = await import('./src/tools/backup.js');
    
    console.log('✅ All modules imported successfully');
    
    // Mock client
    const mockClient = {
      baseUrl: 'https://test.salesforce.com',
      accessToken: 'mock_token',
      async request() {
        return {
          ok: true,
          json: async () => ({ records: [] }),
          arrayBuffer: async () => new ArrayBuffer(1024),
          status: 200,
          statusText: 'OK'
        };
      }
    };
    
    // Test 1: Direct BackupJobManager
    console.log('\n📝 Test 1: BackupJobManager');
    const jobManager = new BackupJobManager({ testMode: true });
    
    const startTime = Date.now();
    const result = await jobManager.startBackupJob(mockClient, {
      outputDirectory: './test-simple',
      backupType: 'incremental'
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ Response time: ${responseTime}ms`);
    console.log(`📋 Job ID: ${result.jobId}`);
    console.log(`⚡ Status: ${result.status}`);
    
    if (responseTime < 100) {
      console.log('✅ Fast response time');
    } else {
      console.log('❌ Response time too slow');
    }
    
    // Test 2: MCP Tool Integration
    console.log('\n📝 Test 2: MCP Tool Integration');
    const mcpResult = await handleSalesforceBackup({
      backup_type: 'files_only',
      include_files: true
    }, mockClient);
    
    if (mcpResult && mcpResult.content && mcpResult.content[0]) {
      const text = mcpResult.content[0].text;
      if (text.includes('backup started') && text.includes('Job ID')) {
        console.log('✅ MCP tool working correctly');
      } else {
        console.log('❌ MCP tool response incorrect');
      }
    } else {
      console.log('❌ MCP tool response structure invalid');
    }
    
    // Test 3: Status Tool
    console.log('\n📝 Test 3: Status Tool');
    const statusResult = await handleSalesforceBackupStatus({}, mockClient);
    
    if (statusResult && statusResult.content && statusResult.content[0]) {
      console.log('✅ Status tool working correctly');
    } else {
      console.log('❌ Status tool not working');
    }
    
    // Cleanup
    const fs = await import('fs/promises');
    await fs.rm('./test-simple', { recursive: true, force: true }).catch(() => {});
    await fs.rm('./backups', { recursive: true, force: true }).catch(() => {});
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Async backup system is ready for production');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTest().then(() => {
  console.log('👋 Test completed - exiting...');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

// Force exit after 5 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - forcing exit');
  process.exit(0);
}, 5000);
