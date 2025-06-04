#!/usr/bin/env node

/**
 * Migration script to move tokens from Keychain to file storage
 */

import { KeychainManager } from './src/auth/keychain.js';
import { FileStorageManager } from './src/auth/file-storage.js';

async function migrateTokens() {
  console.log('🔄 Migrating Salesforce tokens from Keychain to file storage\n');

  const keychain = new KeychainManager();
  const fileStorage = new FileStorageManager();

  try {
    // Step 1: Check if tokens exist in Keychain
    console.log('1. Checking for tokens in Keychain...');
    const keychainTokens = await keychain.getTokens();
    
    if (!keychainTokens) {
      console.log('   ℹ️ No tokens found in Keychain');
      
      // Check if tokens already exist in file storage
      const hasFileTokens = await fileStorage.hasTokens();
      if (hasFileTokens) {
        console.log('   ✅ Tokens already exist in file storage - migration not needed');
        return true;
      } else {
        console.log('   💡 No tokens found anywhere - run authentication to create new tokens');
        return false;
      }
    }

    console.log('   ✅ Found tokens in Keychain');
    console.log('   Instance URL:', keychainTokens.instance_url);
    console.log('   Stored at:', keychainTokens.stored_at);

    // Step 2: Check if file storage already has tokens
    console.log('\n2. Checking file storage...');
    const hasFileTokens = await fileStorage.hasTokens();
    
    if (hasFileTokens) {
      console.log('   ⚠️ Tokens already exist in file storage');
      console.log('   Do you want to overwrite with Keychain tokens? (y/N)');
      
      // For automation, we'll skip overwrite for now
      console.log('   Skipping overwrite to prevent data loss');
      console.log('   💡 If you want to use Keychain tokens, delete cache/salesforce-tokens.json first');
      return true;
    }

    // Step 3: Migrate tokens
    console.log('\n3. Migrating tokens to file storage...');
    await fileStorage.storeTokens(keychainTokens);
    console.log('   ✅ Tokens successfully migrated to file storage');

    // Step 4: Verify migration
    console.log('\n4. Verifying migration...');
    const migratedTokens = await fileStorage.getTokens();
    
    if (migratedTokens && 
        migratedTokens.access_token === keychainTokens.access_token &&
        migratedTokens.refresh_token === keychainTokens.refresh_token) {
      console.log('   ✅ Migration verified successfully');
      
      // Step 5: Clean up Keychain (optional)
      console.log('\n5. Cleaning up Keychain...');
      try {
        await keychain.clearTokens();
        console.log('   ✅ Keychain tokens cleared');
      } catch (error) {
        console.log('   ⚠️ Could not clear Keychain tokens:', error.message);
        console.log('   This is not critical - file storage will be used going forward');
      }
      
      return true;
    } else {
      console.log('   ❌ Migration verification failed');
      return false;
    }

  } catch (error) {
    console.log('❌ Migration failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 MCP Salesforce Token Migration\n');
  console.log('='.repeat(50));

  const success = await migrateTokens();

  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ Migration completed successfully!');
    console.log('💡 Future tokens will be stored in cache/salesforce-tokens.json');
    console.log('🔒 File permissions are set to 600 (readable only by owner)');
  } else {
    console.log('❌ Migration failed');
    console.log('💡 You may need to re-authenticate to create new tokens');
  }
}

main().catch(console.error);
