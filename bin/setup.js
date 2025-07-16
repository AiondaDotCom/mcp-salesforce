#!/usr/bin/env node

import { config } from 'dotenv';
import { TokenManager } from '../src/auth/token-manager.js';
import { FileStorageManager } from '../src/auth/file-storage.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SetupTool {
  constructor() {
    this.fileStorage = new FileStorageManager();
  }

  /**
   * Display welcome message and instructions
   */
  displayWelcome() {
    console.log('🚀 MCP Salesforce Server Setup Tool');
    console.log('=====================================\n');
    
    console.log('This tool will help you authenticate with Salesforce using OAuth.');
    console.log('You will need:\n');
    
    console.log('1. A Salesforce Connected App with OAuth enabled');
    console.log('2. The Consumer Key (Client ID) and Consumer Secret');
    console.log('3. Your Salesforce instance URL (e.g., https://yourorg.salesforce.com)\n');
    
    console.log('📖 For setup instructions, see: docs/oauth-guide.md\n');
  }

  /**
   * Validate required configuration
   */
  async validateConfiguration() {
    console.log('🔍 Checking configuration...');
    
    try {
      const credentials = await this.fileStorage.getCredentials();
      
      if (!credentials) {
        console.error('\n❌ No Salesforce credentials found in ~/.mcp-salesforce.json');
        console.error('📝 Please run the salesforce_setup tool first to configure your credentials.');
        process.exit(1);
      }

      const { clientId, clientSecret, instanceUrl } = credentials;
      
      if (!clientId || !clientSecret || !instanceUrl) {
        console.error('\n❌ Incomplete credentials in ~/.mcp-salesforce.json');
        console.error('📝 Please run the salesforce_setup tool to reconfigure your credentials.');
        process.exit(1);
      }

      console.log(`✅ Client ID: ${this.maskSensitive('CLIENT_ID', clientId)}`);
      console.log(`✅ Client Secret: ${this.maskSensitive('CLIENT_SECRET', clientSecret)}`);
      console.log(`✅ Instance URL: ${instanceUrl}`);
      
      console.log('✅ Configuration valid\n');
      return credentials;
    } catch (error) {
      console.error(`\n❌ Error reading configuration: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Mask sensitive values for display
   */
  maskSensitive(key, value) {
    if (key.includes('SECRET')) {
      return value.substring(0, 8) + '***';
    }
    if (key.includes('CLIENT_ID')) {
      return value.substring(0, 12) + '***';
    }
    return value;
  }

  /**
   * Test Salesforce instance connectivity
   */
  async testConnectivity(instanceUrl) {
    console.log('🔗 Testing Salesforce instance connectivity...');
    
    try {
      const response = await fetch(`${instanceUrl}/services/data/`, {
        method: 'GET',
        timeout: 10000
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Successfully connected to ${instanceUrl}`);
        console.log(`📊 Available API versions: ${data.length}`);
        return true;
      } else {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Perform OAuth authentication flow
   */
  async performOAuth(clientId, clientSecret, instanceUrl) {
    console.log('🔐 Starting OAuth authentication flow...\n');
    
    try {
      const tokenManager = new TokenManager(clientId, clientSecret, instanceUrl);
      
      console.log('📝 Instructions:');
      console.log('1. Your browser will open to Salesforce login');
      console.log('2. Log in with your Salesforce credentials');
      console.log('3. If prompted, approve the OAuth request');
      console.log('4. The browser will redirect back automatically\n');
      
      // Wait for user to be ready
      console.log('Press Enter when ready to continue...');
      await this.waitForInput();
      
      // Perform authentication
      const tokens = await tokenManager.authenticateWithOAuth();
      
      console.log('\n✅ OAuth authentication successful!');
      console.log(`🏢 Instance: ${tokens.instance_url}`);
      console.log(`⏰ Token expires: ${new Date(tokens.expires_at).toLocaleString()}`);
      
      return tokens;
    } catch (error) {
      console.error(`\n❌ OAuth authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test the stored tokens by making an API call
   */
  async testAuthentication(credentials) {
    console.log('\n🧪 Testing authentication...');
    
    try {
      const tokenManager = new TokenManager(credentials.clientId, credentials.clientSecret, credentials.instanceUrl);
      await tokenManager.initialize();
      
      const result = await tokenManager.testTokens();
      
      if (result.valid) {
        console.log('✅ Authentication test successful!');
        console.log(`📡 API versions available: ${result.apiVersions}`);
        return true;
      } else {
        console.error(`❌ Authentication test failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Authentication test error: ${error.message}`);
      return false;
    }
  }

  /**
   * Display final setup summary
   */
  async displaySummary() {
    console.log('\n🎉 Setup Complete!');
    console.log('==================\n');
    
    console.log('Your MCP Salesforce server is now configured and ready to use.\n');
    
    console.log('Next steps:');
    console.log('1. Add the server to your Claude Desktop configuration');
    console.log('2. Restart Claude Desktop');
    console.log('3. Start using Salesforce tools in your conversations\n');
    
    console.log('Configuration for Claude Desktop:');
    console.log('```json');
    console.log('{');
    console.log('  "mcpServers": {');
    console.log('    "salesforce": {');
    console.log('      "command": "node",');
    console.log(`      "args": ["${join(process.cwd(), 'src/index.js')}"]`);
    console.log('    }');
    console.log('  }');
    console.log('}```\n');
    
    console.log('📚 For more information, see the documentation in the docs/ folder.');
    console.log('🔧 Your credentials are stored securely in ~/.mcp-salesforce.json');
  }

  /**
   * Wait for user input
   */
  async waitForInput() {
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  /**
   * Main setup process
   */
  async run() {
    try {
      this.displayWelcome();
      
      // Validate configuration
      const credentials = await this.validateConfiguration();
      
      // Test connectivity
      const connected = await this.testConnectivity(credentials.instanceUrl);
      if (!connected) {
        console.error('\n❌ Cannot connect to Salesforce instance. Please check your instance URL.');
        process.exit(1);
      }
      
      // Perform OAuth flow
      await this.performOAuth(
        credentials.clientId,
        credentials.clientSecret,
        credentials.instanceUrl
      );
      
      // Test authentication
      const authValid = await this.testAuthentication(credentials);
      
      if (!authValid) {
        console.error('\n❌ Authentication test failed. Please try running setup again.');
        process.exit(1);
      }
      
      // Show summary
      await this.displaySummary();
      
      console.log('✅ Setup completed successfully!');
      process.exit(0);
      
    } catch (error) {
      console.error(`\n💥 Setup failed: ${error.message}`);
      console.error('\n🔧 Troubleshooting:');
      console.error('1. Check your ~/.mcp-salesforce.json configuration');
      console.error('2. Verify your Salesforce Connected App settings');
      console.error('3. Ensure you have the correct permissions');
      console.error('4. Check your network connection\n');
      process.exit(1);
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new SetupTool();
  setup.run();
}
