#!/usr/bin/env node

// Import and run the main module
import { MCPSalesforceServer } from '../src/index.js';

// Start the server
const server = new MCPSalesforceServer();
server.run().catch(error => {
  console.error('Failed to start MCP Salesforce Server:', error);
  process.exit(1);
});
