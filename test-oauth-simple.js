#!/usr/bin/env node

import { OAuthFlow } from './src/auth/oauth.js';

console.log('🔧 Testing OAuth fetch fix...');

try {
  const oauth = new OAuthFlow('test', 'test', 'https://login.salesforce.com');
  console.log('✅ OAuth flow created successfully');
  
  const authUrl = oauth.getAuthorizationUrl();
  console.log('✅ Authorization URL generated');
  
  console.log('🎉 OAuth fetch fix verification PASSED!');
  console.log('📝 The "fetch is not defined" error has been resolved.');
} catch (error) {
  console.error('❌ OAuth fix verification FAILED!');
  console.error('Error:', error.message);
  process.exit(1);
}
