import express from 'express';
import { createServer } from 'http';
import open from 'open';
import crypto from 'crypto';

export class OAuthFlow {
  constructor(clientId, clientSecret, instanceUrl, callbackPort = null) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.instanceUrl = instanceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.callbackPort = callbackPort || this.getPreferredPort();
    this.state = crypto.randomBytes(32).toString('hex');
    this.server = null;
  }

  /**
   * Get preferred port (8080 first, then random if not available)
   */
  getPreferredPort() {
    // Always try to use port 8080 first (matches most Connected App configurations)
    return 8080;
  }

  /**
   * Generate a random port between 8000-9000 as fallback
   */
  getRandomPort() {
    return Math.floor(Math.random() * 1000) + 8000;
  }

  /**
   * Build the OAuth authorization URL
   */
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: `http://localhost:${this.callbackPort}/callback`,
      scope: 'api refresh_token',
      state: this.state,
      prompt: 'login'
    });

    return `${this.instanceUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    const tokenUrl = `${this.instanceUrl}/services/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: `http://localhost:${this.callbackPort}/callback`,
      code: code
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${error}`);
      }

      const tokens = await response.json();
      
      // Calculate expiration time
      const expiresAt = tokens.expires_in 
        ? Date.now() + (tokens.expires_in * 1000)
        : null;

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        instance_url: tokens.instance_url || this.instanceUrl,
        expires_at: expiresAt,
        token_type: tokens.token_type || 'Bearer'
      };
    } catch (error) {
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Start the OAuth flow with automatic port fallback
   */
  async startFlow() {
    return new Promise((resolve, reject) => {
      const app = express();
      let resolved = false;

      // Callback endpoint
      app.get('/callback', async (req, res) => {
        try {
          const { code, state, error } = req.query;

          if (error) {
            const errorMsg = `OAuth error: ${error}`;
            res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
            if (!resolved) {
              resolved = true;
              reject(new Error(errorMsg));
            }
            return;
          }

          if (state !== this.state) {
            const errorMsg = 'Invalid state parameter - possible CSRF attack';
            res.status(400).send(`<h1>Security Error</h1><p>${errorMsg}</p>`);
            if (!resolved) {
              resolved = true;
              reject(new Error(errorMsg));
            }
            return;
          }

          if (!code) {
            const errorMsg = 'Authorization code not received';
            res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
            if (!resolved) {
              resolved = true;
              reject(new Error(errorMsg));
            }
            return;
          }

          // Exchange code for tokens
          const tokens = await this.exchangeCodeForTokens(code);

          res.send(`
            <h1>✅ Authentication Successful!</h1>
            <p>You can now close this window and return to your terminal.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          `);

          if (!resolved) {
            resolved = true;
            resolve(tokens);
          }
        } catch (error) {
          console.error('Callback error:', error);
          res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        }
      });

      // Health check endpoint
      app.get('/health', (req, res) => {
        res.json({ status: 'ready', port: this.callbackPort });
      });

      // Create server
      this.server = createServer(app);
      
      // Try to start server with automatic port fallback
      this.tryStartServer(this.server, this.callbackPort, resolve, reject);

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE' && !resolved) {
          console.log(`Port ${this.callbackPort} is busy, trying random port...`);
          this.callbackPort = this.getRandomPort();
          // Create new server instance for the new port
          this.server = createServer(app);
          this.tryStartServer(this.server, this.callbackPort, resolve, reject);
        } else if (!resolved) {
          resolved = true;
          reject(new Error(`Server error: ${error.message}`));
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('OAuth flow timed out after 5 minutes'));
        }
      }, 5 * 60 * 1000);
    }).finally(() => {
      // Clean up server
      if (this.server) {
        this.server.close();
        console.log('🔒 Callback server stopped');
      }
    });
  }

  /**
   * Try to start server on specified port
   */
  tryStartServer(server, port, resolve, reject) {
    server.listen(port, (err) => {
      if (err) {
        if (err.code === 'EADDRINUSE') {
          // Port is busy, will be handled by error event
          return;
        }
        reject(new Error(`Failed to start callback server: ${err.message}`));
        return;
      }

      console.log(`🔗 Callback server started on port ${port}`);
      
      // Open browser for authentication
      const authUrl = this.getAuthorizationUrl();
      console.log(`🌐 Opening browser for authentication...`);
      console.log(`📋 If browser doesn't open, visit: ${authUrl}`);
      console.log(`⚠️  Make sure your Salesforce Connected App callback URL includes: http://localhost:${port}/callback`);
      
      open(authUrl).catch(error => {
        console.warn(`Failed to open browser automatically: ${error.message}`);
        console.log(`Please manually visit: ${authUrl}`);
      });
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    const tokenUrl = `${this.instanceUrl}/services/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${error}`);
      }

      const tokens = await response.json();
      
      // Calculate expiration time
      const expiresAt = tokens.expires_in 
        ? Date.now() + (tokens.expires_in * 1000)
        : null;

      return {
        access_token: tokens.access_token,
        expires_at: expiresAt,
        token_type: tokens.token_type || 'Bearer'
      };
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }
}
