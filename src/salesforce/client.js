import jsforce from 'jsforce';
import { TokenManager } from '../auth/token-manager.js';

export class SalesforceClient {
  constructor(clientId, clientSecret, instanceUrl) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.instanceUrl = instanceUrl;
    this.tokenManager = new TokenManager(clientId, clientSecret, instanceUrl);
    this.connection = null;
    this.initialized = false;
  }

  /**
   * Initialize the Salesforce client
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      // Initialize token manager
      const hasTokens = await this.tokenManager.initialize();
      if (!hasTokens) {
        throw new Error('No authentication tokens found. Please run setup first.');
      }

      // Create jsforce connection
      await this.createConnection();
      
      this.initialized = true;
      console.log('✅ Salesforce client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Salesforce client:', error.message);
      throw error;
    }
  }

  /**
   * Create and configure jsforce connection
   */
  async createConnection() {
    try {
      const accessToken = await this.tokenManager.getValidAccessToken();
      const tokenInfo = this.tokenManager.getTokenInfo();

      this.connection = new jsforce.Connection({
        instanceUrl: tokenInfo.instance_url,
        accessToken: accessToken,
        version: process.env.SALESFORCE_API_VERSION || '58.0'
      });

      // Test connection
      await this.connection.identity();
      console.log('✅ jsforce connection established');
    } catch (error) {
      throw new Error(`Failed to create Salesforce connection: ${error.message}`);
    }
  }

  /**
   * Ensure connection is valid, refresh if needed
   */
  async ensureValidConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Check if token needs refresh
      if (await this.tokenManager.needsRefresh()) {
        console.log('🔄 Refreshing connection tokens...');
        await this.tokenManager.refreshTokens();
        await this.createConnection();
      }
    } catch (error) {
      console.error('❌ Connection validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute SOQL query
   */
  async query(soql, options = {}) {
    await this.ensureValidConnection();

    try {
      console.error(`🔍 Executing SOQL: ${soql.substring(0, 100)}${soql.length > 100 ? '...' : ''}`);
      
      const result = await this.connection.query(soql, options);
      
      console.error(`✅ Query successful: ${result.totalSize} records found`);
      return {
        totalSize: result.totalSize,
        done: result.done,
        records: result.records,
        nextRecordsUrl: result.nextRecordsUrl
      };
    } catch (error) {
      console.error('❌ SOQL Query Error Details:', {
        message: error.message,
        name: error.name,
        errorCode: error.errorCode,
        fields: error.fields,
        stack: error.stack?.substring(0, 200)
      });

      // Handle specific Salesforce errors
      if (error.name === 'INVALID_QUERY' || error.errorCode === 'INVALID_QUERY') {
        throw new Error(`Invalid SOQL query: ${error.message}`);
      }
      
      if (error.name === 'INVALID_FIELD' || error.errorCode === 'INVALID_FIELD') {
        throw new Error(`Invalid field in query: ${error.message}`);
      }

      if (error.name === 'INVALID_TYPE' || error.errorCode === 'INVALID_TYPE') {
        throw new Error(`Invalid object type: ${error.message}`);
      }

      // Handle authentication errors
      if (error.message.includes('Session expired') || error.message.includes('INVALID_SESSION_ID')) {
        console.error('🔄 Session expired, attempting to refresh...');
        await this.tokenManager.refreshTokens();
        await this.createConnection();
        // Retry once after token refresh
        try {
          const retryResult = await this.connection.query(soql, options);
          console.error(`✅ Query successful after retry: ${retryResult.totalSize} records found`);
          return {
            totalSize: retryResult.totalSize,
            done: retryResult.done,
            records: retryResult.records,
            nextRecordsUrl: retryResult.nextRecordsUrl
          };
        } catch (retryError) {
          throw new Error(`Query failed after token refresh: ${retryError.message}`);
        }
      }

      // Generic error handling with better message
      const errorMessage = error.message || 'Unknown Salesforce error';
      throw new Error(`Salesforce query error: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Create a new record
   */
  async create(sobject, data) {
    await this.ensureValidConnection();

    try {
      console.log(`➕ Creating ${sobject} record`);
      
      const result = await this.connection.sobject(sobject).create(data);
      
      if (result.success) {
        console.log(`✅ Created ${sobject} record: ${result.id}`);
        return {
          id: result.id,
          success: true,
          sobject: sobject,
          data: data
        };
      } else {
        throw new Error(`Create failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create ${sobject} record:`, error.message);
      throw new Error(`Create ${sobject} failed: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Update an existing record
   */
  async update(sobject, id, data) {
    await this.ensureValidConnection();

    try {
      console.log(`✏️  Updating ${sobject} record: ${id}`);
      
      const result = await this.connection.sobject(sobject).update({
        Id: id,
        ...data
      });
      
      if (result.success) {
        console.log(`✅ Updated ${sobject} record: ${id}`);
        return {
          id: result.id,
          success: true,
          sobject: sobject,
          data: data
        };
      } else {
        throw new Error(`Update failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update ${sobject} record:`, error.message);
      throw new Error(`Update ${sobject} failed: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Delete a record
   */
  async delete(sobject, id) {
    await this.ensureValidConnection();

    try {
      console.log(`🗑️  Deleting ${sobject} record: ${id}`);
      
      const result = await this.connection.sobject(sobject).destroy(id);
      
      if (result.success) {
        console.log(`✅ Deleted ${sobject} record: ${id}`);
        return {
          id: result.id,
          success: true,
          sobject: sobject
        };
      } else {
        throw new Error(`Delete failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (error) {
      console.error(`❌ Failed to delete ${sobject} record:`, error.message);
      throw new Error(`Delete ${sobject} failed: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Describe an SObject (get schema information)
   */
  async describe(sobject) {
    await this.ensureValidConnection();

    try {
      console.log(`📋 Describing ${sobject} schema`);
      
      const result = await this.connection.sobject(sobject).describe();
      
      console.log(`✅ Retrieved ${sobject} schema: ${result.fields.length} fields`);
      return {
        name: result.name,
        label: result.label,
        labelPlural: result.labelPlural,
        keyPrefix: result.keyPrefix,
        createable: result.createable,
        updateable: result.updateable,
        deletable: result.deletable,
        queryable: result.queryable,
        fields: result.fields.map(field => ({
          name: field.name,
          label: field.label,
          type: field.type,
          length: field.length,
          required: !field.nillable && !field.defaultedOnCreate,
          createable: field.createable,
          updateable: field.updateable,
          picklistValues: field.picklistValues || [],
          referenceTo: field.referenceTo || [],
          relationshipName: field.relationshipName
        })),
        recordTypeInfos: result.recordTypeInfos || []
      };
    } catch (error) {
      console.error(`❌ Failed to describe ${sobject}:`, error.message);
      throw new Error(`Describe ${sobject} failed: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Get all available SObjects
   */
  async describeGlobal() {
    await this.ensureValidConnection();

    try {
      console.log('🌐 Retrieving global SObject list');
      
      const result = await this.connection.describeGlobal();
      
      const sobjects = result.sobjects
        .filter(sobject => sobject.queryable) // Only queryable objects
        .map(sobject => ({
          name: sobject.name,
          label: sobject.label,
          labelPlural: sobject.labelPlural,
          keyPrefix: sobject.keyPrefix,
          custom: sobject.custom,
          createable: sobject.createable,
          updateable: sobject.updateable,
          deletable: sobject.deletable,
          queryable: sobject.queryable
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      console.log(`✅ Retrieved ${sobjects.length} queryable SObjects`);
      return sobjects;
    } catch (error) {
      console.error('❌ Failed to describe global:', error.message);
      throw new Error(`Global describe failed: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Get user information
   */
  async getUserInfo() {
    await this.ensureValidConnection();

    try {
      const identity = await this.connection.identity();
      return {
        id: identity.user_id,
        username: identity.username,
        display_name: identity.display_name,
        email: identity.email,
        organization_id: identity.organization_id,
        urls: identity.urls
      };
    } catch (error) {
      throw new Error(`Failed to get user info: ${this.formatSalesforceError(error)}`);
    }
  }

  /**
   * Format Salesforce error messages for better readability
   */
  formatSalesforceError(error) {
    if (error.name === 'INVALID_FIELD') {
      return `Invalid field: ${error.message}`;
    }
    if (error.name === 'REQUIRED_FIELD_MISSING') {
      return `Required field missing: ${error.message}`;
    }
    if (error.name === 'FIELD_CUSTOM_VALIDATION_EXCEPTION') {
      return `Validation rule failed: ${error.message}`;
    }
    if (error.name === 'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY') {
      return `Insufficient permissions: ${error.message}`;
    }
    if (error.name === 'INVALID_SESSION_ID') {
      return 'Session expired - please re-authenticate';
    }
    
    return error.message || 'Unknown Salesforce error';
  }

  /**
   * Test connection health
   */
  async testConnection() {
    try {
      await this.ensureValidConnection();
      const identity = await this.connection.identity();
      return {
        connected: true,
        user: identity.username,
        organization: identity.organization_id
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}
