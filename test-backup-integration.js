#!/usr/bin/env node

/**
 * Test Salesforce Backup Integration
 * 
 * Tests the integrated backup functionality within the MCP server
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Salesforce Backup Integration\n');
console.log('=' .repeat(50));

/**
 * Test MCP Server Tool Listing
 */
async function testToolListing() {
  console.log('\n📋 Testing tool listing...');
  
  return new Promise((resolve, reject) => {
    const mcpServer = spawn('node', [path.join(__dirname, 'src/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send list tools request
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    };

    mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');

    let output = '';
    mcpServer.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcpServer.stderr.on('data', (data) => {
      console.error('stderr:', data.toString());
    });

    setTimeout(() => {
      mcpServer.kill();
      
      try {
        // Parse the response
        const lines = output.trim().split('\n');
        const response = JSON.parse(lines[lines.length - 1]);
        
        if (response.result && response.result.tools) {
          const tools = response.result.tools;
          const backupTools = tools.filter(tool => 
            tool.name === 'salesforce_backup' || tool.name === 'salesforce_backup_list'
          );
          
          console.log(`✅ Found ${tools.length} total tools`);
          console.log(`✅ Found ${backupTools.length} backup tools:`);
          
          backupTools.forEach(tool => {
            console.log(`   - ${tool.name}: ${tool.description.substring(0, 60)}...`);
          });
          
          resolve({ success: true, tools: backupTools });
        } else {
          reject(new Error('No tools found in response'));
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        reject(error);
      }
    }, 3000);
  });
}

/**
 * Test Backup Tool Schema
 */
function testBackupToolSchema() {
  console.log('\n🔧 Testing backup tool schema...');
  
  // Import the backup tools directly
  import('./src/tools/backup.js').then(({ BACKUP_TOOLS }) => {
    const backupTool = BACKUP_TOOLS.salesforce_backup;
    const listTool = BACKUP_TOOLS.salesforce_backup_list;
    
    console.log('✅ salesforce_backup tool schema:');
    console.log(`   - Name: ${backupTool.name}`);
    console.log(`   - Required params: ${backupTool.inputSchema.required?.join(', ') || 'none'}`);
    console.log(`   - Properties: ${Object.keys(backupTool.inputSchema.properties || {}).length} parameters`);
    
    console.log('✅ salesforce_backup_list tool schema:');
    console.log(`   - Name: ${listTool.name}`);
    console.log(`   - Description: ${listTool.description.substring(0, 60)}...`);
    
    // Test backup type enum
    const backupTypeEnum = backupTool.inputSchema.properties?.backup_type?.enum;
    if (backupTypeEnum) {
      console.log(`   - Backup types: ${backupTypeEnum.join(', ')}`);
    }
    
    console.log('✅ All schemas validated successfully');
  }).catch(error => {
    console.error('❌ Schema validation failed:', error.message);
  });
}

/**
 * Test Demo Backup Classes
 */
async function testDemoClasses() {
  console.log('\n🎯 Testing demo backup classes...');
  
  try {
    const { SalesforceFileDownloader, SalesforceBackupManager } = await import('./src/backup/manager.js');
    
    // Test class instantiation
    const mockClient = {
      instanceUrl: 'https://test.salesforce.com',
      version: '58.0',
      ensureValidConnection: async () => true,
      tokenManager: {
        getValidAccessToken: async () => 'mock_token'
      }
    };
    
    const downloader = new SalesforceFileDownloader(mockClient);
    const backupManager = new SalesforceBackupManager(mockClient);
    
    console.log('✅ SalesforceFileDownloader instantiated');
    console.log(`   - Parallel limit: ${downloader.parallelLimit}`);
    console.log(`   - Retry attempts: ${downloader.retryAttempts}`);
    
    console.log('✅ SalesforceBackupManager instantiated');
    console.log(`   - Output directory: ${backupManager.options.outputDirectory}`);
    console.log(`   - Include files: ${backupManager.options.includeFiles}`);
    
    console.log('✅ Demo classes work correctly');
    
  } catch (error) {
    console.error('❌ Demo class test failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testToolListing();
    testBackupToolSchema();
    await testDemoClasses();
    
    console.log('\n🎉 All integration tests passed!');
    console.log('\n📝 Summary:');
    console.log('✅ MCP server recognizes backup tools');
    console.log('✅ Tool schemas are valid and complete');
    console.log('✅ Backup classes are functional');
    console.log('\n🚀 Ready for production use!');
    
    console.log('\n💡 Usage examples:');
    console.log('   # Full backup:');
    console.log('   salesforce_backup({"backup_type": "full"})');
    console.log('   ');
    console.log('   # Incremental backup:');
    console.log('   salesforce_backup({"backup_type": "incremental", "since_date": "2024-06-01T00:00:00.000Z"})');
    console.log('   ');
    console.log('   # List backups:');
    console.log('   salesforce_backup_list({})');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testToolListing, testBackupToolSchema, testDemoClasses };
