import { TokenManager } from '../auth/token-manager.js';

export const reauth = {
  name: 'salesforce_reauth',
  description: 'Re-authenticate with Salesforce when tokens expire or become invalid. This starts a new OAuth flow to get fresh tokens.',
  inputSchema: {
    type: 'object',
    properties: {
      force: {
        type: 'boolean',
        description: 'Force re-authentication even if current tokens appear valid',
        default: false
      }
    },
    additionalProperties: false
  }
};

export async function handleReauth(args) {
  const { force = false } = args;

  try {
    // Validate environment variables
    const requiredVars = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_INSTANCE_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return {
        success: false,
        error: `Missing required environment variables: ${missingVars.join(', ')}. Please check your MCP configuration.`,
        details: {
          missingVariables: missingVars,
          requiredVariables: requiredVars
        }
      };
    }

    const tokenManager = new TokenManager(
      process.env.SALESFORCE_CLIENT_ID,
      process.env.SALESFORCE_CLIENT_SECRET,
      process.env.SALESFORCE_INSTANCE_URL
    );

    // Check current token status if not forcing
    if (!force) {
      await tokenManager.initialize();
      const tokenInfo = tokenManager.getTokenInfo();
      
      if (tokenInfo.authenticated) {
        // Test if tokens are actually working
        const testResult = await tokenManager.testTokens();
        if (testResult.valid) {
          return {
            success: true,
            message: 'Current tokens are still valid. Use force=true to re-authenticate anyway.',
            tokenInfo: {
              authenticated: true,
              expiresInMinutes: tokenInfo.expires_in_minutes,
              instanceUrl: tokenInfo.instance_url
            }
          };
        }
      }
    }

    // Clear existing tokens if forcing or if they're invalid
    await tokenManager.clearTokens();

    // Start OAuth flow
    const tokens = await tokenManager.authenticateWithOAuth();

    // Verify the new tokens work
    const testResult = await tokenManager.testTokens();
    
    if (!testResult.valid) {
      return {
        success: false,
        error: 'Authentication completed but token validation failed',
        details: testResult
      };
    }

    const tokenInfo = tokenManager.getTokenInfo();

    return {
      success: true,
      message: 'Successfully re-authenticated with Salesforce! New tokens have been stored securely.',
      authenticationFlow: 'OAuth completed successfully',
      tokenInfo: {
        authenticated: true,
        instanceUrl: tokenInfo.instance_url,
        expiresInMinutes: tokenInfo.expires_in_minutes,
        storedAt: tokenInfo.stored_at
      },
      nextSteps: [
        'Your MCP Salesforce tools should now work normally',
        'Tokens are stored securely in macOS Keychain',
        'They will auto-refresh before expiration'
      ]
    };

  } catch (error) {
    // Handle specific error types
    if (error.message.includes('OAuth flow timed out')) {
      return {
        success: false,
        error: 'Authentication timed out after 5 minutes',
        details: {
          reason: 'User did not complete OAuth flow in browser',
          suggestion: 'Please try again and complete the authentication in your browser quickly'
        }
      };
    }

    if (error.message.includes('User denied')) {
      return {
        success: false,
        error: 'Authentication was denied by user',
        details: {
          reason: 'User cancelled or denied the OAuth authorization',
          suggestion: 'Please try again and accept the OAuth authorization'
        }
      };
    }

    if (error.message.includes('invalid_client')) {
      return {
        success: false,
        error: 'Invalid Salesforce Connected App credentials',
        details: {
          reason: 'Client ID or Client Secret is incorrect',
          suggestion: 'Please verify your SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in MCP configuration'
        }
      };
    }

    if (error.message.includes('EADDRINUSE')) {
      return {
        success: false,
        error: 'Cannot start OAuth callback server - port conflict',
        details: {
          reason: 'OAuth callback port is already in use',
          suggestion: 'Please close any other applications using ports 8080-9000 and try again'
        }
      };
    }

    return {
      success: false,
      error: `Re-authentication failed: ${error.message}`,
      details: {
        errorType: error.constructor.name,
        troubleshooting: [
          'Verify your Salesforce Connected App configuration',
          'Check that callback URLs include http://localhost:8080/callback',
          'Ensure your Salesforce credentials are correct in MCP config',
          'Try running with force=true parameter'
        ]
      }
    };
  }
}
