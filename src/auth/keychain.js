import keychain from 'keychain';

const SERVICE_NAME = 'mcp-salesforce';

export class KeychainManager {
  /**
   * Store tokens securely in macOS Keychain
   * @param {Object} tokens - Object containing access_token and refresh_token
   */
  async storeTokens(tokens) {
    try {
      const tokenData = JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at || null,
        instance_url: tokens.instance_url,
        stored_at: new Date().toISOString()
      });

      await new Promise((resolve, reject) => {
        keychain.setPassword({
          account: 'oauth-tokens',
          service: SERVICE_NAME,
          password: tokenData
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('✅ Tokens stored securely in macOS Keychain');
    } catch (error) {
      throw new Error(`Failed to store tokens in Keychain: ${error.message}`);
    }
  }

  /**
   * Retrieve tokens from macOS Keychain
   * @returns {Object} Token data or null if not found
   */
  async getTokens() {
    try {
      const result = await new Promise((resolve, reject) => {
        keychain.getPassword({
          account: 'oauth-tokens',
          service: SERVICE_NAME
        }, (err, password) => {
          if (err) {
            if (err.message && err.message.includes('not found')) {
              resolve(null);
            } else {
              reject(err);
            }
          } else {
            resolve(password);
          }
        });
      });

      if (!result) {
        return null;
      }

      const tokenData = JSON.parse(result);
      return tokenData;
    } catch (error) {
      if (error.message.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to retrieve tokens from Keychain: ${error.message}`);
    }
  }

  /**
   * Remove tokens from macOS Keychain
   */
  async clearTokens() {
    try {
      await new Promise((resolve, reject) => {
        keychain.deletePassword({
          account: 'oauth-tokens',
          service: SERVICE_NAME
        }, (err) => {
          if (err && !err.message.includes('not found')) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      console.log('✅ Tokens cleared from Keychain');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw new Error(`Failed to clear tokens from Keychain: ${error.message}`);
      }
    }
  }

  /**
   * Update access token while preserving refresh token
   * @param {string} accessToken - New access token
   * @param {number} expiresAt - Token expiration timestamp
   */
  async updateAccessToken(accessToken, expiresAt) {
    const existingTokens = await this.getTokens();
    if (!existingTokens) {
      throw new Error('No existing tokens found to update');
    }

    const updatedTokens = {
      ...existingTokens,
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    };

    await this.storeTokens(updatedTokens);
  }
}
