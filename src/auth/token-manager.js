import { FileStorageManager } from './file-storage.js';
import { OAuthFlow } from './oauth.js';

// Ensure fetch is available - use built-in fetch (Node.js 18+) or import node-fetch
const getFetch = async () => {
  if (typeof globalThis.fetch !== 'undefined') {
    return globalThis.fetch;
  }
  
  try {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch;
  } catch (error) {
    throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch package.');
  }
};

export class TokenManager {
  constructor(clientId, clientSecret, instanceUrl) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.instanceUrl = instanceUrl;
    this.storage = new FileStorageManager();
    this.currentTokens = null;
    this.refreshPromise = null; // Prevent concurrent refresh attempts
  }

  /**
   * Initialize token manager and load existing tokens
   */
  async initialize() {
    try {
      this.currentTokens = await this.storage.getTokens();
      if (this.currentTokens) {
        
        // Check if tokens need refresh
        if (await this.needsRefresh()) {
          await this.refreshTokens();
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken() {
    // If no tokens, throw error
    if (!this.currentTokens) {
      throw new Error('No authentication tokens available. Please run setup first.');
    }

    // Check if token needs refresh
    if (await this.needsRefresh()) {
      await this.refreshTokens();
    }

    return this.currentTokens.access_token;
  }

  /**
   * Check if token needs refresh (refresh 5 minutes before expiry)
   */
  async needsRefresh() {
    if (!this.currentTokens || !this.currentTokens.expires_at) {
      return false; // No expiry info, assume it's valid
    }

    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() >= (this.currentTokens.expires_at - bufferTime);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens() {
    // Prevent concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Internal method to perform token refresh
   */
  async _performRefresh() {
    if (!this.currentTokens || !this.currentTokens.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    try {
      const oauth = new OAuthFlow(this.clientId, this.clientSecret, this.instanceUrl);
      const newTokens = await oauth.refreshAccessToken(this.currentTokens.refresh_token);

      // Update tokens while preserving refresh token
      this.currentTokens = {
        ...this.currentTokens,
        access_token: newTokens.access_token,
        expires_at: newTokens.expires_at,
        updated_at: new Date().toISOString()
      };

      // Store updated tokens in file storage
      await this.storage.storeTokens(this.currentTokens);
      
    } catch (error) {
      
      // If refresh fails, clear tokens and require re-authentication
      await this.clearTokens();
      throw new Error(`Token refresh failed: ${error.message}. Please run setup again.`);
    }
  }

  /**
   * Perform initial OAuth flow with enhanced retry mechanism
   */
  async authenticateWithOAuth() {
    try {
      console.log('🚀 Starting enhanced OAuth authentication...');
      const oauth = new OAuthFlow(this.clientId, this.clientSecret, this.instanceUrl);
      
      // Use the enhanced authentication with retry logic
      const tokens = await oauth.authenticateWithRetry();
      
      console.log('💾 Storing tokens securely...');
      // Store tokens securely
      await this.storage.storeTokens(tokens);
      this.currentTokens = tokens;
      
      console.log('✅ OAuth authentication completed successfully');
      return tokens;
    } catch (error) {
      console.error('❌ OAuth authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens() {
    await this.storage.clearTokens();
    this.currentTokens = null;
  }

  /**
   * Get current token info for debugging
   */
  getTokenInfo() {
    if (!this.currentTokens) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      instance_url: this.currentTokens.instance_url,
      expires_at: this.currentTokens.expires_at,
      expires_in_minutes: this.currentTokens.expires_at 
        ? Math.round((this.currentTokens.expires_at - Date.now()) / (1000 * 60))
        : null,
      stored_at: this.currentTokens.stored_at,
      updated_at: this.currentTokens.updated_at
    };
  }

  /**
   * Test if current tokens are valid by making a test API call
   */
  async testTokens() {
    try {
      const fetch = await getFetch();
      const accessToken = await this.getValidAccessToken();
      
      // Make a simple API call to verify token validity
      const response = await fetch(`${this.currentTokens.instance_url}/services/data/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { valid: true, apiVersions: data.length };
      } else {
        return { valid: false, error: response.status };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
