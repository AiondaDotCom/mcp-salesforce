#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Salesforce client and tools
import { SalesforceClient } from './salesforce/client.js';
import { FileStorageManager } from './auth/file-storage.js';
import { queryTool, executeQuery } from './tools/query.js';
import { createTool, executeCreate } from './tools/create.js';
import { updateTool, executeUpdate } from './tools/update.js';
import { deleteTool, executeDelete } from './tools/delete.js';
import { describeTool, executeDescribe } from './tools/describe.js';
import { reauth, handleReauth } from './tools/auth.js';
import { setupTool, handleSalesforceSetup } from './tools/setup.js';
import { salesforceLearnTool, handleSalesforceLearn } from './tools/learn.js';
import { salesforceInstallationInfoTool, handleSalesforceInstallationInfo } from './tools/installation-info.js';
import { salesforceLearnContextTool, handleSalesforceLearnContext } from './tools/learn-context.js';
import { BACKUP_TOOLS, handleSalesforceBackup, handleSalesforceBackupList, handleSalesforceBackupStatus } from './tools/backup.js';
import { TIME_MACHINE_TOOLS, SalesforceTimeMachine } from './tools/time_machine.js';

// Load environment variables
config();

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  console.log('1.1.5');
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
@aiondadotcom/mcp-salesforce v1.1.5

USAGE:
  npx -p @aiondadotcom/mcp-salesforce mcp-salesforce              # Start MCP server
  
SETUP:
  Use the salesforce_setup tool to configure your Salesforce credentials
  - Client ID (Consumer Key from Connected App)
  - Client Secret (Consumer Secret from Connected App)
  - Instance URL (e.g., https://mycompany.salesforce.com)
  
DOCUMENTATION:
  https://github.com/AiondaDotCom/mcp-salesforce
`);
  process.exit(0);
}

// Handle setup command
if (args.includes('setup')) {
  (async () => {
    try {
      // Simple approach: just run the setup tool
      const { execSync } = await import('child_process');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const setupPath = join(__dirname, '..', 'bin', 'setup.js');
      
      execSync(`node "${setupPath}"`, { stdio: 'inherit' });
      process.exit(0);
    } catch (error) {
      console.error('Setup failed:', error.message);
      process.exit(1);
    }
  })();
}

class MCPSalesforceServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-salesforce',
        version: '1.1.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.salesforceClient = null;
    this.setupServer();
  }

  setupServer() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          setupTool,
          salesforceLearnTool,
          salesforceInstallationInfoTool,
          salesforceLearnContextTool,
          queryTool,
          createTool,
          updateTool,
          deleteTool,
          describeTool,
          reauth,
          BACKUP_TOOLS.salesforce_backup,
          BACKUP_TOOLS.salesforce_backup_list,
          BACKUP_TOOLS.salesforce_backup_status,
          TIME_MACHINE_TOOLS[0]
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Initialize Salesforce client if not already done
        if (!this.salesforceClient) {
          await this.initializeSalesforceClient();
        }

        // Route to appropriate tool handler
        switch (name) {
          case 'salesforce_setup':
            // Special case: setup doesn't need existing client
            return await handleSalesforceSetup(args);
          
          case 'salesforce_query':
            return await executeQuery(this.salesforceClient, args);
          
          case 'salesforce_learn':
            return await handleSalesforceLearn(args, this.salesforceClient);
          
          case 'salesforce_installation_info':
            return await handleSalesforceInstallationInfo(args);
          
          case 'salesforce_learn_context':
            return await handleSalesforceLearnContext(args);
          
          case 'salesforce_create':
            return await executeCreate(this.salesforceClient, args);
          
          case 'salesforce_update':
            return await executeUpdate(this.salesforceClient, args);
          
          case 'salesforce_delete':
            return await executeDelete(this.salesforceClient, args);
          
          case 'salesforce_describe':
            return await executeDescribe(this.salesforceClient, args);
          
          case 'salesforce_auth':
            // Special case: auth doesn't need existing client
            return await this.handleAuth(args);
          
          case 'salesforce_backup':
            return await handleSalesforceBackup(args, this.salesforceClient);
          
          case 'salesforce_backup_list':
            return await handleSalesforceBackupList(args);
          
          case 'salesforce_backup_status':
            return await handleSalesforceBackupStatus(args, this.salesforceClient);
          
          case 'salesforce_time_machine_query':
            return await this.handleTimeMachineQuery(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // Check if this is an authentication-related error
        const isAuthError = this.isAuthenticationError(error);
        
        if (isAuthError) {
          return {
            content: [
              {
                type: "text",
                text: `🔐 **Authentication Required**\n\n` +
                      `${error.message}\n\n` +
                      `**Solution:** Use the \`salesforce_auth\` tool to authenticate with Salesforce. This will automatically handle the OAuth flow and store your tokens securely.\n\n` +
                      `Simply call: \`salesforce_auth\` and I'll handle the rest!`
              }
            ],
            isError: true
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `❌ Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async initializeSalesforceClient() {
    // Get stored credentials
    const fileStorage = new FileStorageManager();
    const credentials = await fileStorage.getCredentials();

    if (!credentials) {
      // Create a client without credentials - it will prompt for setup when needed
      this.salesforceClient = new SalesforceClient();
      return;
    }

    // Create and initialize Salesforce client with stored credentials
    this.salesforceClient = new SalesforceClient(
      credentials.clientId,
      credentials.clientSecret,
      credentials.instanceUrl
    );

    await this.salesforceClient.initialize();
  }

  async handleAuth(args) {
    try {
      const result = await handleReauth(args);
      
      // Reset client after successful auth to force reconnection
      if (result.success) {
        this.salesforceClient = null;
      }

      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `✅ ${result.message}\n\n${JSON.stringify(result.tokenInfo, null, 2)}`
              : `❌ ${result.error}\n\n${JSON.stringify(result.details || {}, null, 2)}`
          }
        ],
        isError: !result.success
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Re-authentication failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle Time Machine queries
   */
  async handleTimeMachineQuery(args) {
    try {
      // Resolve backup directory relative to project root, not current working directory
      const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const defaultBackupDir = path.join(projectRoot, 'backups');
      
      const { operation, backupDirectory = defaultBackupDir, ...operationArgs } = args;
      const timeMachine = new SalesforceTimeMachine(backupDirectory);

      let result;
      
      switch (operation) {
        case 'list_backups':
          const backups = await timeMachine.getAllBackups();
          result = {
            success: true,
            backups: backups.map(b => ({
              timestamp: b.timestamp,
              path: b.path,
              stats: b.manifest.downloadStats
            })),
            count: backups.length
          };
          break;

        case 'query_at_point_in_time':
          const { targetDate, objectType, filters } = operationArgs;
          if (!targetDate || !objectType) {
            throw new Error('targetDate and objectType are required for point-in-time queries');
          }
          result = await timeMachine.queryAtPointInTime(targetDate, objectType, filters);
          break;

        case 'compare_over_time':
          const { startDate, endDate, objectType: compObjectType, filters: compFilters } = operationArgs;
          if (!startDate || !endDate || !compObjectType) {
            throw new Error('startDate, endDate, and objectType are required for comparison queries');
          }
          result = await timeMachine.compareDataOverTime(startDate, endDate, compObjectType, compFilters);
          break;

        case 'get_record_history':
          const { recordId, objectType: histObjectType } = operationArgs;
          if (!recordId || !histObjectType) {
            throw new Error('recordId and objectType are required for record history queries');
          }
          result = await timeMachine.getRecordHistory(recordId, histObjectType);
          break;

        default:
          throw new Error(`Unknown Time Machine operation: ${operation}`);
      }

      return {
        content: [
          {
            type: "text",
            text: result.success 
              ? `🕰️ Time Machine Query Results:\n\n${JSON.stringify(result, null, 2)}`
              : `❌ Time Machine Query Failed: ${result.error}`
          }
        ],
        isError: !result.success
      };

    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Time Machine operation failed: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Detect if an error is authentication-related
   */
  isAuthenticationError(error) {
    const authErrorIndicators = [
      'INVALID_SESSION_ID',
      'Session expired',
      'invalid_grant',
      'Authentication failure',
      'Unauthorized',
      'Invalid token',
      'Token expired',
      'Not authenticated',
      'Authentication required',
      'No access token available',
      'refresh token is invalid',
      'Session has expired'
    ];

    const errorMessage = error.message || '';
    const errorString = error.toString() || '';
    
    return authErrorIndicators.some(indicator => 
      errorMessage.includes(indicator) || errorString.includes(indicator)
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MCPSalesforceServer();
  server.run().catch(error => {
    process.exit(1);
  });
}

export { MCPSalesforceServer };
