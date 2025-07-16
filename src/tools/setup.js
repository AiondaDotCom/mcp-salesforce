import { FileStorageManager } from '../auth/file-storage.js';
import { logger } from '../utils/debug.js';

/**
 * Setup tool for collecting Salesforce credentials
 */
export const setupTool = {
  name: 'salesforce_setup',
  description: 'Configure Salesforce credentials (Client ID, Client Secret, Instance URL)',
  inputSchema: {
    type: 'object',
    properties: {
      clientId: {
        type: 'string',
        description: 'Salesforce Connected App Client ID (Consumer Key)'
      },
      clientSecret: {
        type: 'string',
        description: 'Salesforce Connected App Client Secret (Consumer Secret)'
      },
      instanceUrl: {
        type: 'string',
        description: 'Salesforce Instance URL (e.g., https://mycompany.salesforce.com)'
      }
    },
    required: ['clientId', 'clientSecret', 'instanceUrl']
  }
};

/**
 * Handle Salesforce setup
 * @param {Object} args - Setup arguments
 * @returns {Object} Setup result
 */
export async function handleSalesforceSetup(args) {
  try {
    logger.log('🔧 Setting up Salesforce credentials...');

    const { clientId, clientSecret, instanceUrl } = args;

    // Validate inputs
    if (!clientId || !clientSecret || !instanceUrl) {
      return {
        success: false,
        error: 'Missing required credentials. Please provide clientId, clientSecret, and instanceUrl.'
      };
    }

    // Validate instance URL format
    if (!instanceUrl.startsWith('https://') || !instanceUrl.includes('.salesforce.com')) {
      return {
        success: false,
        error: 'Invalid instance URL format. Must be https://yourorg.salesforce.com'
      };
    }

    // Clean up instance URL (remove trailing slash)
    const cleanInstanceUrl = instanceUrl.replace(/\/$/, '');

    // Store credentials
    const fileStorage = new FileStorageManager();
    await fileStorage.storeCredentials({
      clientId,
      clientSecret,
      instanceUrl: cleanInstanceUrl
    });

    logger.log('✅ Salesforce credentials configured successfully');

    return {
      success: true,
      message: 'Salesforce credentials have been configured successfully. You can now use other Salesforce tools.',
      details: {
        instanceUrl: cleanInstanceUrl,
        clientIdPreview: clientId.substring(0, 20) + '...'
      }
    };

  } catch (error) {
    logger.error('❌ Setup failed:', error);
    return {
      success: false,
      error: `Setup failed: ${error.message}`
    };
  }
}

/**
 * Check if credentials are configured
 * @returns {Object} Configuration status
 */
export async function checkCredentialsStatus() {
  try {
    const fileStorage = new FileStorageManager();
    const credentials = await fileStorage.getCredentials();
    
    if (!credentials) {
      return {
        configured: false,
        message: 'No Salesforce credentials found. Please run the salesforce_setup tool first.'
      };
    }

    return {
      configured: true,
      message: 'Salesforce credentials are configured.',
      details: {
        instanceUrl: credentials.instanceUrl,
        clientIdPreview: credentials.clientId.substring(0, 20) + '...',
        configuredAt: credentials.credentialsStoredAt
      }
    };

  } catch (error) {
    return {
      configured: false,
      error: `Error checking credentials: ${error.message}`
    };
  }
}