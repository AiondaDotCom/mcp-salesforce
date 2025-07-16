#!/usr/bin/env node

import { config } from 'dotenv';
import { TokenManager } from '../src/auth/token-manager.js';
import { FileStorageManager } from '../src/auth/file-storage.js';

// Load environment variables
config();

class StatusChecker {
  constructor() {
    this.fileStorage = new FileStorageManager();
  }

  async checkStatus() {
    console.log('🔍 MCP Salesforce Server Status Check');
    console.log('=====================================\n');

    // Check configuration
    console.log('📋 Configuration Status:');
    const configStatus = await this.checkConfiguration();
    
    if (!configStatus.valid) {
      console.log('\n❌ Configuration incomplete. Please run salesforce_setup tool first.');
      return;
    }

    // Check authentication
    console.log('\n🔐 Authentication Status:');
    await this.checkAuthentication(configStatus.credentials);
    
    console.log('\n💡 Next Steps:');
    console.log('- If authentication failed, run: npm run setup');
    console.log('- If successful, add to Claude Desktop configuration');
    console.log('- Use npm run config-help for Connected App setup');
  }

  async checkConfiguration() {
    try {
      const credentials = await this.fileStorage.getCredentials();
      
      if (!credentials) {
        console.log('❌ No credentials found in ~/.mcp-salesforce.json');
        console.log('   Run the salesforce_setup tool to configure credentials');
        return { valid: false };
      }

      const { clientId, clientSecret, instanceUrl } = credentials;
      
      if (!clientId || !clientSecret || !instanceUrl) {
        console.log('❌ Incomplete credentials in ~/.mcp-salesforce.json');
        console.log('   Run the salesforce_setup tool to reconfigure credentials');
        return { valid: false };
      }

      console.log(`✅ Client ID: ${this.maskSensitive('CLIENT_ID', clientId)}`);
      console.log(`✅ Client Secret: ${this.maskSensitive('CLIENT_SECRET', clientSecret)}`);
      console.log(`✅ Instance URL: ${instanceUrl}`);
      
      // Check API config
      const apiConfig = await this.fileStorage.getApiConfig();
      console.log(`✅ API Version: ${apiConfig.apiVersion}`);
      console.log(`✅ Callback Port: ${apiConfig.callbackPort}`);

      return { valid: true, credentials };
    } catch (error) {
      console.log(`❌ Configuration check failed: ${error.message}`);
      return { valid: false };
    }
  }

  async checkAuthentication(credentials) {
    try {
      const tokenManager = new TokenManager(
        credentials.clientId,
        credentials.clientSecret,
        credentials.instanceUrl
      );

      const hasTokens = await tokenManager.initialize();
      
      if (!hasTokens) {
        console.log('❌ No authentication tokens found');
        console.log('   Run: npm run setup');
        return false;
      }

      const tokenInfo = tokenManager.getTokenInfo();
      console.log('✅ Tokens found in ~/.mcp-salesforce.json');
      console.log(`   Instance: ${tokenInfo.instance_url}`);
      
      if (tokenInfo.expires_at) {
        const expiresIn = Math.round((tokenInfo.expires_at - Date.now()) / (1000 * 60));
        console.log(`   Expires: ${expiresIn} minutes`);
      }

      // Test the tokens
      console.log('🧪 Testing token validity...');
      const testResult = await tokenManager.testTokens();
      
      if (testResult.valid) {
        console.log('✅ Authentication successful!');
        console.log(`   API versions available: ${testResult.apiVersions}`);
        return true;
      } else {
        console.log(`❌ Token validation failed: ${testResult.error}`);
        console.log('   Run: npm run setup');
        return false;
      }
    } catch (error) {
      console.log(`❌ Authentication check failed: ${error.message}`);
      return false;
    }
  }

  maskSensitive(key, value) {
    if (key.includes('SECRET')) {
      return value.substring(0, 8) + '***';
    }
    if (key.includes('CLIENT_ID')) {
      return value.substring(0, 12) + '***';
    }
    return value;
  }
}

// Run status check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new StatusChecker();
  checker.checkStatus().catch(error => {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  });
}
