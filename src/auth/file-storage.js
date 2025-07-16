import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/debug.js';

// Token file path in home directory
const TOKEN_FILE_PATH = path.join(os.homedir(), '.mcp-salesforce.json');

export class FileStorageManager {
  constructor() {
    this.tokenFilePath = TOKEN_FILE_PATH;
  }

  /**
   * Store credentials securely in home directory
   * @param {Object} credentials - Object containing clientId, clientSecret, instanceUrl
   */
  async storeCredentials(credentials) {
    try {
      const existingData = await this.getAllData();
      
      const credentialData = {
        ...existingData,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        instanceUrl: credentials.instanceUrl,
        credentialsStoredAt: new Date().toISOString()
      };

      // Write credentials to file with restricted permissions (600 = rw-------)
      await fs.writeFile(this.tokenFilePath, JSON.stringify(credentialData, null, 2), { mode: 0o600 });
      
      // Explicitly set file permissions to ensure security
      await fs.chmod(this.tokenFilePath, 0o600);
      
      logger.log('✅ Credentials stored securely in home directory (permissions: 600)');
    } catch (error) {
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve credentials from file
   * @returns {Object} Credential data or null if not found
   */
  async getCredentials() {
    try {
      const data = await this.getAllData();
      
      // Check if we have valid tokens and instance URL (credentials might be null but tokens exist)
      if (!data) {
        return null;
      }

      // If we have tokens but no credentials, use placeholder values
      if (data.access_token && data.refresh_token && data.instance_url) {
        return {
          clientId: data.clientId || 'token_based_auth',
          clientSecret: data.clientSecret || 'token_based_auth',
          instanceUrl: data.instanceUrl || data.instance_url,
          credentialsStoredAt: data.credentialsStoredAt || data.stored_at
        };
      }

      // Traditional credentials check
      if (!data.clientId || !data.clientSecret || !data.instanceUrl) {
        return null;
      }

      return {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        instanceUrl: data.instanceUrl,
        credentialsStoredAt: data.credentialsStoredAt
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to retrieve credentials: ${error.message}`);
    }
  }

  /**
   * Check if credentials exist
   * @returns {boolean} True if credentials exist
   */
  async hasCredentials() {
    try {
      const credentials = await this.getCredentials();
      return credentials !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get all data from file (credentials and tokens)
   * @returns {Object} All data or empty object if not found
   */
  async getAllData() {
    try {
      const data = await fs.readFile(this.tokenFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  /**
   * Store tokens securely in home directory
   * @param {Object} tokens - Object containing access_token and refresh_token
   */
  async storeTokens(tokens) {
    try {
      const existingData = await this.getAllData();
      
      // Ensure credentials are preserved - they should never be overwritten
      const tokenData = {
        // Keep existing credentials if they exist, otherwise preserve what we have
        clientId: existingData.clientId,
        clientSecret: existingData.clientSecret,
        instanceUrl: existingData.instanceUrl || tokens.instance_url,
        credentialsStoredAt: existingData.credentialsStoredAt,
        
        // Update tokens
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at || null,
        instance_url: tokens.instance_url,
        stored_at: new Date().toISOString()
      };
      
      // Validate that we're not overwriting credentials with null
      if (existingData.clientId && !tokenData.clientId) {
        throw new Error('BUG: Attempted to overwrite clientId with null');
      }
      if (existingData.clientSecret && !tokenData.clientSecret) {
        throw new Error('BUG: Attempted to overwrite clientSecret with null');
      }

      // Write tokens to file with restricted permissions (600 = rw-------)
      await fs.writeFile(this.tokenFilePath, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
      
      // Explicitly set file permissions to ensure security
      await fs.chmod(this.tokenFilePath, 0o600);
      
      // Verify file permissions for security
      const stats = await fs.stat(this.tokenFilePath);
      const permissions = stats.mode & parseInt('777', 8);
      if (permissions !== parseInt('600', 8)) {
        logger.warn(`⚠️ Warning: Token file permissions are ${permissions.toString(8)}, expected 600`);
      }
      
      logger.log('✅ Tokens stored securely in home directory (permissions: 600)');
    } catch (error) {
      throw new Error(`Failed to store tokens in file: ${error.message}`);
    }
  }

  /**
   * Retrieve tokens from cache file
   * @returns {Object} Token data or null if not found
   */
  async getTokens() {
    try {
      const data = await this.getAllData();
      
      // Validate token structure
      if (!data || !data.access_token || !data.refresh_token) {
        return null;
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        instance_url: data.instance_url,
        stored_at: data.stored_at
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File not found - no tokens stored
        return null;
      }
      throw new Error(`Failed to retrieve tokens from file: ${error.message}`);
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens() {
    try {
      await fs.unlink(this.tokenFilePath);
      logger.log('✅ Tokens cleared successfully');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to clear tokens: ${error.message}`);
      }
    }
  }

  /**
   * Check if tokens exist
   * @returns {boolean} True if tokens exist
   */
  async hasTokens() {
    try {
      await fs.access(this.tokenFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get token file information for debugging
   */
  async getTokenFileInfo() {
    try {
      const stats = await fs.stat(this.tokenFilePath);
      const data = await this.getTokens();
      const permissions = stats.mode & parseInt('777', 8);
      const isSecure = permissions === parseInt('600', 8);
      
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        permissions: '0' + permissions.toString(8),
        isSecure: isSecure,
        securityWarning: !isSecure ? 'File permissions are not secure (should be 600)' : null,
        hasValidStructure: !!(data?.access_token && data?.refresh_token),
        storedAt: data?.stored_at,
        instanceUrl: data?.instance_url
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Verify and fix token file security
   */
  async ensureTokenSecurity() {
    try {
      const hasTokens = await this.hasTokens();
      if (!hasTokens) {
        return { status: 'no_tokens', message: 'No token file exists' };
      }

      const stats = await fs.stat(this.tokenFilePath);
      const permissions = stats.mode & parseInt('777', 8);
      const expectedPermissions = parseInt('600', 8);

      if (permissions !== expectedPermissions) {
        logger.log(`🔒 Fixing token file permissions from ${permissions.toString(8)} to 600`);
        await fs.chmod(this.tokenFilePath, 0o600);
        
        // Verify the change
        const newStats = await fs.stat(this.tokenFilePath);
        const newPermissions = newStats.mode & parseInt('777', 8);
        
        if (newPermissions === expectedPermissions) {
          return { 
            status: 'fixed', 
            message: 'Token file permissions fixed to 600',
            oldPermissions: permissions.toString(8),
            newPermissions: newPermissions.toString(8)
          };
        } else {
          return { 
            status: 'error', 
            message: 'Failed to fix permissions',
            permissions: newPermissions.toString(8)
          };
        }
      } else {
        return { 
          status: 'secure', 
          message: 'Token file permissions are correct (600)',
          permissions: permissions.toString(8)
        };
      }
    } catch (error) {
      return { 
        status: 'error', 
        message: `Error checking token security: ${error.message}` 
      };
    }
  }
}
