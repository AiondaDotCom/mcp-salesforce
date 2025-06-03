#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

// Import Salesforce client and tools
import { SalesforceClient } from './salesforce/client.js';
import { queryTool, executeQuery } from './tools/query.js';
import { createTool, executeCreate } from './tools/create.js';
import { updateTool, executeUpdate } from './tools/update.js';
import { deleteTool, executeDelete } from './tools/delete.js';
import { describeTool, executeDescribe } from './tools/describe.js';

// Load environment variables
config();

class MCPSalesforceServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-salesforce',
        version: '1.0.0',
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
          queryTool,
          createTool,
          updateTool,
          deleteTool,
          describeTool
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
          case 'salesforce_query':
            return await executeQuery(this.salesforceClient, args);
          
          case 'salesforce_create':
            return await executeCreate(this.salesforceClient, args);
          
          case 'salesforce_update':
            return await executeUpdate(this.salesforceClient, args);
          
          case 'salesforce_delete':
            return await executeDelete(this.salesforceClient, args);
          
          case 'salesforce_describe':
            return await executeDescribe(this.salesforceClient, args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error executing ${name}: ${error.message}\n\n` +
                    `If this is an authentication error, try running: npm run setup`
            }
          ],
          isError: true
        };
      }
    });
  }

  async initializeSalesforceClient() {
    const requiredEnvVars = [
      'SALESFORCE_CLIENT_ID',
      'SALESFORCE_CLIENT_SECRET',
      'SALESFORCE_INSTANCE_URL'
    ];

    // Check for required environment variables
    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}. Please check your .env file.`);
    }

    // Create and initialize Salesforce client
    this.salesforceClient = new SalesforceClient(
      process.env.SALESFORCE_CLIENT_ID,
      process.env.SALESFORCE_CLIENT_SECRET,
      process.env.SALESFORCE_INSTANCE_URL
    );

    await this.salesforceClient.initialize();
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
