#!/usr/bin/env node

import { config } from 'dotenv';
import { TokenManager } from '../src/auth/token-manager.js';

// Load environment variables
config();

class StatusChecker {
  constructor() {
    this.requiredEnvVars = [
      'SALESFORCE_CLIENT_ID',
      'SALESFORCE_CLIENT_SECRET', 
      'SALESFORCE_INSTANCE_URL'
    ];
  }

  async checkStatus() {
    console.log('🔍 MCP Salesforce Server Status Check');
    console.log('=====================================\n');

    // Check environment
    console.log('📋 Environment Configuration:');
    const envStatus = this.checkEnvironment();
    
    if (!envStatus.valid) {
      console.log('\n❌ Environment configuration incomplete. Please run setup first.');
      return;
    }

    // Check authentication
    console.log('\n🔐 Authentication Status:');
    await this.checkAuthentication();
    
    console.log('\n💡 Next Steps:');
    console.log('- If authentication failed, run: npm run setup');
    console.log('- If successful, add to Claude Desktop configuration');
    console.log('- Use npm run config-help for Connected App setup');
  }

  checkEnvironment() {
    const missing = [];
    const config = {};

    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        missing.push(envVar);
        console.log(`❌ ${envVar}: Not set`);
      } else {
        config[envVar] = value;
        console.log(`✅ ${envVar}: ${this.maskSensitive(envVar, value)}`);
      }
    }

    if (missing.length > 0) {
      console.log('\n❌ Missing environment variables:');
      missing.forEach(envVar => console.log(`   - ${envVar}`));
      return { valid: false, missing };
    }

    return { valid: true, config };
  }

  async checkAuthentication() {
    try {
      const tokenManager = new TokenManager(
        process.env.SALESFORCE_CLIENT_ID,
        process.env.SALESFORCE_CLIENT_SECRET,
        process.env.SALESFORCE_INSTANCE_URL
      );

      const hasTokens = await tokenManager.initialize();
      
      if (!hasTokens) {
        console.log('❌ No authentication tokens found');
        console.log('   Run: npm run setup');
        return false;
      }

      const tokenInfo = tokenManager.getTokenInfo();
      console.log('✅ Tokens found in Keychain');
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
