import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token file path in cache directory
const TOKEN_FILE_PATH = path.join(__dirname, '../../cache/salesforce-tokens.json');

export class FileStorageManager {
  constructor() {
    this.tokenFilePath = TOKEN_FILE_PATH;
  }

  /**
   * Store tokens securely in cache directory
   * @param {Object} tokens - Object containing access_token and refresh_token
   */
  async storeTokens(tokens) {
    try {
      // Ensure cache directory exists
      const cacheDir = path.dirname(this.tokenFilePath);
      await fs.mkdir(cacheDir, { recursive: true });

      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at || null,
        instance_url: tokens.instance_url,
        stored_at: new Date().toISOString()
      };

      // Write tokens to file with restricted permissions (600 = rw-------)
      await fs.writeFile(this.tokenFilePath, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
      
      // Explicitly set file permissions to ensure security
      await fs.chmod(this.tokenFilePath, 0o600);
      
      // Verify file permissions for security
      const stats = await fs.stat(this.tokenFilePath);
      const permissions = stats.mode & parseInt('777', 8);
      if (permissions !== parseInt('600', 8)) {
        console.warn(`⚠️ Warning: Token file permissions are ${permissions.toString(8)}, expected 600`);
      }
      
      console.log('✅ Tokens stored securely in cache directory (permissions: 600)');
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
      const data = await fs.readFile(this.tokenFilePath, 'utf8');
      const tokenData = JSON.parse(data);
      
      // Validate token structure
      if (!tokenData.access_token || !tokenData.refresh_token) {
        console.log('⚠️ Invalid token structure found, removing file');
        await this.clearTokens();
        return null;
      }

      return tokenData;
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
      console.log('✅ Tokens cleared successfully');
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
        console.log(`🔒 Fixing token file permissions from ${permissions.toString(8)} to 600`);
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
