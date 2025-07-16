import express from 'express';
import { createServer } from 'http';
import open from 'open';
import crypto from 'crypto';
import { logger } from '../utils/debug.js';

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

export class OAuthFlow {
  constructor(clientId, clientSecret, instanceUrl, callbackPort = null) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.instanceUrl = instanceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.callbackPort = callbackPort || this.getPreferredPort();
    this.state = null; // Will be generated fresh for each auth attempt
    this.stateExpiration = null;
    this.server = null;
    this.retryCount = 0;
    this.maxRetries = 3;
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
   * Build the OAuth authorization URL with cache busting
   */
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: `http://localhost:${this.callbackPort}/callback`,
      scope: 'api refresh_token',
      state: this.state,
      prompt: 'login',
      // Add cache busting parameter to prevent browser caching issues
      t: Date.now().toString()
    });

    return `${this.instanceUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Validate state with expiration check
   */
  isValidState(receivedState) {
    if (Date.now() > this.stateExpiration) {
      logger.log('⏰ OAuth state expired');
      return { valid: false, reason: 'State expired - authentication session timed out (10 minutes). Please start a new authentication.' };
    }

    if (receivedState !== this.state) {
      logger.log('🚨 OAuth state mismatch:', {
        received: receivedState?.substring(0, 16) + '...',
        expected: this.state?.substring(0, 16) + '...'
      });
      return { valid: false, reason: 'Invalid state parameter - possible CSRF attack or browser cache issue' };
    }

    return { valid: true };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    const fetch = await getFetch();
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
    // Clean up any existing server
    if (this.server) {
      try {
        this.server.close();
        logger.log('🧹 Closed existing OAuth server');
      } catch (error) {
        logger.log('⚠️ Error closing existing server:', error.message);
      }
    }
    
    // Generate fresh state for this auth attempt
    this.state = crypto.randomBytes(32).toString('hex');
    this.stateExpiration = Date.now() + (10 * 60 * 1000);
    
    logger.log(`🔐 Generated fresh OAuth state: ${this.state.substring(0, 16)}...`);
    
    return new Promise((resolve, reject) => {
      const app = express();
      let resolved = false;

      // Callback endpoint
      app.get('/callback', async (req, res) => {
        try {
          const { code, state, error } = req.query;

          logger.log('📥 OAuth callback received:', {
            hasCode: !!code,
            hasState: !!state,
            hasError: !!error,
            receivedState: state?.substring(0, 16) + '...',
            expectedState: this.state?.substring(0, 16) + '...',
            statesMatch: state === this.state
          });

          if (error) {
            const errorMsg = `OAuth error: ${error}`;
            logger.error('❌ OAuth error received:', errorMsg);
            res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
            if (!resolved) {
              resolved = true;
              reject(new Error(errorMsg));
            }
            return;
          }

          if (state !== this.state) {
            // Use enhanced state validation
            const validation = this.isValidState(state);
            const errorMsg = validation.reason;
            
            logger.error('🚨 CSRF protection triggered:', {
              receivedState: state,
              expectedState: this.state,
              receivedLength: state?.length,
              expectedLength: this.state?.length,
              validation: validation
            });
            
            res.status(400).send(`
              <h1>🔐 Authentication Security Error</h1>
              <p><strong>${errorMsg}</strong></p>
              <details>
                <summary>🔍 Debug Information (Click to expand)</summary>
                <p><strong>Expected state:</strong> ${this.state?.substring(0, 16)}...</p>
                <p><strong>Received state:</strong> ${state?.substring(0, 16)}...</p>
                <p><strong>State expired:</strong> ${Date.now() > this.stateExpiration ? 'Yes' : 'No'}</p>
                <p><strong>Time remaining:</strong> ${Math.max(0, Math.floor((this.stateExpiration - Date.now()) / 1000))} seconds</p>
                <hr>
                <p><strong>💡 Common causes and solutions:</strong></p>
                <ul>
                  <li>🔄 <strong>Browser caching:</strong> Clear browser cache and try again</li>
                  <li>⏰ <strong>Session timeout:</strong> Authentication must complete within 10 minutes</li>
                  <li>🔀 <strong>Multiple attempts:</strong> Only one authentication session at a time</li>
                  <li>🔄 <strong>Server restart:</strong> Restart the MCP server and try again</li>
                </ul>
                <p><strong>🔧 Quick fix:</strong> Close this tab, restart the authentication, and complete it quickly.</p>
              </details>
              <br>
              <button onclick="window.close()">Close Window</button>
            `);
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

      
      // Open browser for authentication (unless disabled for testing)
      const authUrl = this.getAuthorizationUrl();
      logger.log(`🌐 Authentication URL: ${authUrl}`);
      
      // Check if browser opening is disabled (for testing)
      if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_BROWSER_OPEN !== 'true') {
        logger.log('🌐 Opening browser for authentication...');
        open(authUrl).catch(error => {
          logger.warn('⚠️ Failed to open browser automatically:', error.message);
          logger.log('💡 Please open the following URL manually:', authUrl);
        });
      } else {
        logger.log('🚫 Browser opening disabled (test mode or DISABLE_BROWSER_OPEN=true)');
        logger.log('💡 If this were not a test, would open:', authUrl);
      }
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    const fetch = await getFetch();
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

  /**
   * Enhanced authentication with retry logic and state regeneration
   */
  async authenticateWithRetry() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.log(`🔄 Authentication attempt ${attempt}/${this.maxRetries}`);
        
        // Reset state and expiration for each attempt to avoid CSRF issues
        this.state = crypto.randomBytes(32).toString('hex');
        this.stateExpiration = Date.now() + (10 * 60 * 1000);
        
        logger.log(`   📝 New state generated: ${this.state.substring(0, 16)}...`);
        logger.log(`   ⏰ Expires at: ${new Date(this.stateExpiration).toISOString()}`);
        
        const tokens = await this.startFlow();
        logger.log('✅ Authentication successful');
        return tokens;
        
      } catch (error) {
        logger.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Authentication failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = 1000 * Math.pow(2, attempt - 1);
        logger.log(`   ⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Main authenticate method - uses retry logic by default
   */
  async authenticate() {
    return this.authenticateWithRetry();
  }
}
