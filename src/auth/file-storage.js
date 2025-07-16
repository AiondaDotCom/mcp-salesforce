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
      
      // Create complete structure with updated credentials
      const credentialData = this.getCompleteDataStructure({
        ...existingData,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        instanceUrl: credentials.instanceUrl,
        credentialsStoredAt: new Date().toISOString()
      });

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
   * Get API configuration from config file
   * @returns {Object} API configuration with defaults
   */
  async getApiConfig() {
    try {
      const data = await this.getAllData();
      return {
        apiVersion: data.apiVersion || '58.0',
        callbackPort: data.callbackPort || 8080,
        timeout: data.timeout || 30000,
        callbackUrl: data.callbackUrl || null
      };
    } catch (error) {
      // Return defaults if config file doesn't exist
      return {
        apiVersion: '58.0',
        callbackPort: 8080,
        timeout: 30000,
        callbackUrl: null
      };
    }
  }

  /**
   * Fixed configuration schema - all fields that the config file needs
   * This ensures consistency and prevents dynamic field additions/removals
   */
  static CONFIG_SCHEMA = {
    // OAuth/API Credentials
    clientId: null,
    clientSecret: null,
    instanceUrl: null,
    credentialsStoredAt: null,
    
    // OAuth Tokens
    access_token: null,
    refresh_token: null,
    expires_at: null,
    instance_url: null,
    stored_at: null,
    
    // API Configuration
    apiVersion: null,
    callbackPort: null,
    timeout: null,
    callbackUrl: null
  };

  /**
   * Get the complete data structure with all required fields
   * @param {Object} existingData - Existing data to merge
   * @returns {Object} Complete data structure with all schema fields
   */
  getCompleteDataStructure(existingData = {}) {
    const result = {};
    
    // Use the fixed schema to ensure all fields are present
    for (const [key, defaultValue] of Object.entries(FileStorageManager.CONFIG_SCHEMA)) {
      result[key] = existingData.hasOwnProperty(key) ? existingData[key] : defaultValue;
    }
    
    return result;
  }

  /**
   * Validate that data conforms to the schema
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  validateSchema(data) {
    const extraFields = [];
    const missingFields = [];
    
    // Check for extra fields not in schema
    for (const key of Object.keys(data)) {
      if (!FileStorageManager.CONFIG_SCHEMA.hasOwnProperty(key)) {
        extraFields.push(key);
      }
    }
    
    // Check for missing required fields (none are truly required, but all should be present)
    for (const key of Object.keys(FileStorageManager.CONFIG_SCHEMA)) {
      if (!data.hasOwnProperty(key)) {
        missingFields.push(key);
      }
    }
    
    return {
      isValid: extraFields.length === 0 && missingFields.length === 0,
      extraFields,
      missingFields
    };
  }

  /**
   * Create a new configuration file with proper schema
   * @param {Object} initialData - Initial data to populate
   * @returns {Object} Complete configuration object
   */
  async createConfigFile(initialData = {}) {
    const configData = this.getCompleteDataStructure(initialData);
    
    // Validate schema
    const validation = this.validateSchema(configData);
    if (!validation.isValid) {
      throw new Error(`Schema validation failed: ${JSON.stringify(validation)}`);
    }
    
    // Write to file
    await fs.writeFile(this.tokenFilePath, JSON.stringify(configData, null, 2), { mode: 0o600 });
    await fs.chmod(this.tokenFilePath, 0o600);
    
    console.log('✅ Configuration file created with complete schema');
    return configData;
  }

  /**
   * Get all data from file (credentials and tokens)
   * @returns {Object} All data with complete schema
   */
  async getAllData() {
    try {
      const data = await fs.readFile(this.tokenFilePath, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Always return complete structure and validate
      const completeData = this.getCompleteDataStructure(parsedData);
      const validation = this.validateSchema(completeData);
      
      if (!validation.isValid) {
        console.warn('⚠️  Configuration file has schema issues:', validation);
        console.warn('   Auto-fixing schema...');
        
        // Auto-fix by recreating with proper schema
        return await this.createConfigFile(parsedData);
      }
      
      return completeData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create new file with complete structure
        console.log('📁 Creating new configuration file...');
        return await this.createConfigFile();
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
      
      // Create complete structure with updated tokens
      const tokenData = this.getCompleteDataStructure({
        ...existingData,
        // Update only token-related fields
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at || null,
        instance_url: tokens.instance_url,
        stored_at: new Date().toISOString()
      });

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
