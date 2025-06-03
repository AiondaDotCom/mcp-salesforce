#!/usr/bin/env node

import { config } from 'dotenv';
import { TokenManager } from '../src/auth/token-manager.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SetupTool {
  constructor() {
    this.requiredEnvVars = [
      'SALESFORCE_CLIENT_ID',
      'SALESFORCE_CLIENT_SECRET', 
      'SALESFORCE_INSTANCE_URL'
    ];
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
   * Validate required environment variables
   */
  validateEnvironment() {
    console.log('🔍 Checking environment configuration...');
    
    const missing = [];
    const config = {};

    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        missing.push(envVar);
      } else {
        config[envVar] = value;
        console.log(`✅ ${envVar}: ${this.maskSensitive(envVar, value)}`);
      }
    }

    if (missing.length > 0) {
      console.error('\n❌ Missing required environment variables:');
      missing.forEach(envVar => console.error(`   - ${envVar}`));
      console.error('\n📝 Please set these in your .env file or environment.');
      console.error('💡 Copy .env.example to .env and fill in your values.\n');
      process.exit(1);
    }

    console.log('✅ Environment configuration valid\n');
    return config;
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
  async testAuthentication(clientId, clientSecret, instanceUrl) {
    console.log('\n🧪 Testing authentication...');
    
    try {
      const tokenManager = new TokenManager(clientId, clientSecret, instanceUrl);
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
    console.log(`      "args": ["${join(process.cwd(), 'src/index.js')}"],`);
    console.log('      "env": {');
    console.log(`        "SALESFORCE_CLIENT_ID": "${process.env.SALESFORCE_CLIENT_ID}",`);
    console.log(`        "SALESFORCE_CLIENT_SECRET": "${process.env.SALESFORCE_CLIENT_SECRET}",`);
    console.log(`        "SALESFORCE_INSTANCE_URL": "${process.env.SALESFORCE_INSTANCE_URL}"`);
    console.log('      }');
    console.log('    }');
    console.log('  }');
    console.log('}```\n');
    
    console.log('📚 For more information, see the documentation in the docs/ folder.');
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
      
      // Validate environment
      const config = this.validateEnvironment();
      
      // Test connectivity
      const connected = await this.testConnectivity(config.SALESFORCE_INSTANCE_URL);
      if (!connected) {
        console.error('\n❌ Cannot connect to Salesforce instance. Please check your SALESFORCE_INSTANCE_URL.');
        process.exit(1);
      }
      
      // Perform OAuth flow
      await this.performOAuth(
        config.SALESFORCE_CLIENT_ID,
        config.SALESFORCE_CLIENT_SECRET,
        config.SALESFORCE_INSTANCE_URL
      );
      
      // Test authentication
      const authValid = await this.testAuthentication(
        config.SALESFORCE_CLIENT_ID,
        config.SALESFORCE_CLIENT_SECRET,
        config.SALESFORCE_INSTANCE_URL
      );
      
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
      console.error('1. Check your .env file configuration');
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
