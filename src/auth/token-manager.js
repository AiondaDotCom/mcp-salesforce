import { KeychainManager } from './keychain.js';
import { OAuthFlow } from './oauth.js';

export class TokenManager {
  constructor(clientId, clientSecret, instanceUrl) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.instanceUrl = instanceUrl;
    this.keychain = new KeychainManager();
    this.currentTokens = null;
    this.refreshPromise = null; // Prevent concurrent refresh attempts
  }

  /**
   * Initialize token manager and load existing tokens
   */
  async initialize() {
    try {
      this.currentTokens = await this.keychain.getTokens();
      if (this.currentTokens) {
        console.log('✅ Loaded existing tokens from Keychain');
        
        // Check if tokens need refresh
        if (await this.needsRefresh()) {
          console.log('🔄 Tokens need refresh, attempting automatic refresh...');
          await this.refreshTokens();
        }
        return true;
      } else {
        console.log('⚠️  No existing tokens found - run setup first');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize tokens:', error.message);
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

      // Store updated tokens in Keychain
      await this.keychain.storeTokens(this.currentTokens);
      
      console.log('✅ Access token refreshed successfully');
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      
      // If refresh fails, clear tokens and require re-authentication
      await this.clearTokens();
      throw new Error(`Token refresh failed: ${error.message}. Please run setup again.`);
    }
  }

  /**
   * Perform initial OAuth flow and store tokens
   */
  async authenticateWithOAuth() {
    try {
      const oauth = new OAuthFlow(this.clientId, this.clientSecret, this.instanceUrl);
      console.log('🔐 Starting OAuth authentication flow...');
      
      const tokens = await oauth.startFlow();
      
      // Store tokens securely
      await this.keychain.storeTokens(tokens);
      this.currentTokens = tokens;
      
      console.log('✅ Authentication completed successfully!');
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
    await this.keychain.clearTokens();
    this.currentTokens = null;
    console.log('🗑️  All tokens cleared');
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
