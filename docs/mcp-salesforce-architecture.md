# MCP Salesforce Server - Architecture Plan

## Overview

This document describes the architecture for a **Model Context Protocol (MCP) server** that provides seamless integration with Salesforce using OAuth authentication. The server is designed to be generic and work with any Salesforce organization, including custom objects and fields.

## Key Design Principles

### 1. OAuth-Only Authentication
- **Single authentication method**: OAuth Authorization Code Flow
- **No username/password**: Avoids 2FA complications
- **Browser-based setup**: One-time authentication via web browser
- **Secure token storage**: Uses macOS Keychain for production security

### 2. Generic Salesforce Integration
- **Dynamic schema loading**: Discovers all SObjects at runtime
- **Universal CRUD operations**: Works with standard and custom objects
- **No hardcoded object types**: Adapts to any Salesforce organization
- **Field-agnostic**: Handles custom fields automatically

### 3. MCP Protocol Compliance
- **stdio communication**: Standard MCP server interface
- **Tool-based architecture**: Exposes Salesforce operations as MCP tools
- **Resource discovery**: Provides schema information as MCP resources

## Project Structure

```
mcp-salesforce/
├── package.json                 # Node.js dependencies and scripts
├── README.md                   # User documentation and setup guide
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore file
├── bin/
│   └── setup.js              # OAuth setup CLI tool
├── src/
│   ├── index.js              # MCP server entry point
│   ├── auth/
│   │   ├── oauth.js          # OAuth Authorization Code Flow
│   │   ├── keychain.js       # macOS Keychain integration
│   │   └── token-manager.js  # Token refresh and validation
│   ├── salesforce/
│   │   ├── client.js         # Salesforce API client wrapper
│   │   ├── schema.js         # Dynamic schema discovery
│   │   └── query-builder.js  # SOQL query construction
│   ├── tools/
│   │   ├── query.js          # Generic SOQL execution tool
│   │   ├── create.js         # Generic record creation tool
│   │   ├── update.js         # Generic record update tool
│   │   ├── delete.js         # Generic record deletion tool
│   │   └── describe.js       # Schema inspection tool
│   └── resources/
│       ├── sobjects.js       # SObject metadata as MCP resources
│       └── schema.js         # Field definitions as MCP resources
└── docs/
    ├── setup.md              # Setup instructions
    ├── oauth-guide.md        # OAuth configuration guide
    └── examples.md           # Usage examples
```

## Authentication Architecture

### OAuth Flow Implementation

**Phase 1: One-time Setup**
```javascript
// User runs: npm run setup
1. Check environment variables (CLIENT_ID, CLIENT_SECRET, INSTANCE_URL)
2. Start local HTTP server on random port for callback
3. Generate OAuth authorization URL with proper scopes
4. Open macOS browser using `open` command
5. User authenticates in Salesforce (handles 2FA automatically)
6. Receive authorization code via callback
7. Exchange code for access + refresh tokens
8. Store tokens securely in macOS Keychain
9. Save metadata (instance_url, expires_at) in ~/.mcp-salesforce.json
```

**Phase 2: Runtime Token Management**
```javascript
// During MCP server operation
1. Load tokens from Keychain on startup
2. Check token expiration before each API call
3. Automatically refresh access token using refresh token
4. Handle token refresh failures gracefully
5. Re-authenticate only if refresh token is invalid
```

### Required OAuth Scopes
- `api` - Access Salesforce APIs
- `refresh_token` - Obtain refresh tokens for long-term access

### Salesforce Connected App Configuration
```javascript
// Required settings in Salesforce:
- OAuth Settings: Enabled
- Callback URL: http://localhost:{random-port}/callback
- Selected OAuth Scopes: "Manage user data via APIs (api)", "Perform requests at any time (refresh_token, offline_access)"
- PKCE: Disabled (for compatibility)
```

## MCP Tools Architecture

### Generic Tool Design Philosophy

Instead of creating specific tools for each Salesforce object (Contact, Account, etc.), implement **5 universal tools** that work with any SObject:

### 1. `salesforce_query` Tool
```javascript
{
  name: "salesforce_query",
  description: "Execute SOQL queries against any Salesforce object",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SOQL query string (e.g., 'SELECT Id, Name FROM Account LIMIT 10')"
      }
    },
    required: ["query"]
  }
}
```

### 2. `salesforce_create` Tool
```javascript
{
  name: "salesforce_create",
  description: "Create a new record in any Salesforce object",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name (e.g., 'Contact', 'Account', 'CustomObject__c')"
      },
      data: {
        type: "object",
        description: "Field values for the new record"
      }
    },
    required: ["sobject", "data"]
  }
}
```

### 3. `salesforce_update` Tool
```javascript
{
  name: "salesforce_update",
  description: "Update an existing record in any Salesforce object",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name"
      },
      id: {
        type: "string",
        description: "Salesforce record ID (18-character)"
      },
      data: {
        type: "object",
        description: "Field values to update"
      }
    },
    required: ["sobject", "id", "data"]
  }
}
```

### 4. `salesforce_delete` Tool
```javascript
{
  name: "salesforce_delete",
  description: "Delete a record from any Salesforce object",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name"
      },
      id: {
        type: "string",
        description: "Salesforce record ID to delete"
      }
    },
    required: ["sobject", "id"]
  }
}
```

### 5. `salesforce_describe` Tool
```javascript
{
  name: "salesforce_describe",
  description: "Get schema information for any Salesforce object",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name to describe"
      }
    },
    required: ["sobject"]
  }
}
```

## Dynamic Schema Discovery

### Runtime Schema Loading
```javascript
// On MCP server startup:
1. Call describeGlobal() to get all available SObjects
2. Cache SObject names and basic metadata
3. Load detailed schema for SObjects on-demand
4. Provide schema information through MCP resources
```

### Schema Caching Strategy
```javascript
// Efficient schema management:
1. Cache schemas in memory during server lifetime
2. Refresh schema cache every 24 hours or on demand
3. Handle schema changes gracefully
4. Provide schema information to LLM for intelligent queries
```

## Error Handling Strategy

### API Error Categories
1. **Authentication Errors** - Token refresh or re-authentication
2. **Permission Errors** - Clear user feedback about missing permissions
3. **Validation Errors** - Field-level validation with specific error messages
4. **Rate Limiting** - Automatic retry with exponential backoff
5. **Network Errors** - Connection retry logic with timeout

### Error Response Format
```javascript
// Consistent error format for MCP:
{
  error: {
    code: "SALESFORCE_VALIDATION_ERROR",
    message: "Field 'Email' is required for Contact creation",
    details: {
      sobject: "Contact",
      field: "Email",
      salesforce_error: "REQUIRED_FIELD_MISSING"
    }
  }
}
```

## Implementation Phases

### Phase 1: Core OAuth Setup
- [ ] Environment variable validation
- [ ] OAuth Authorization Code Flow
- [ ] macOS Keychain integration
- [ ] Token refresh mechanism
- [ ] Setup CLI tool

### Phase 2: Salesforce Client
- [ ] jsforce integration with OAuth tokens
- [ ] Connection management and retry logic
- [ ] Error handling and user feedback
- [ ] Schema discovery and caching

### Phase 3: MCP Tools
- [ ] Generic SOQL query tool
- [ ] Universal CRUD operations (create, update, delete)
- [ ] Schema describe functionality
- [ ] Input validation using Salesforce schemas

### Phase 4: MCP Resources
- [ ] SObject metadata as resources
- [ ] Dynamic field information
- [ ] Relationship mapping
- [ ] Picklist values and dependencies

### Phase 5: Testing & Documentation
- [ ] Unit tests for all modules
- [ ] Integration tests with Salesforce sandbox
- [ ] Comprehensive setup documentation
- [ ] Usage examples and best practices

## Environment Configuration

### Required Environment Variables
```bash
# .env file
SALESFORCE_CLIENT_ID=3MVG9...           # Connected App Consumer Key
SALESFORCE_CLIENT_SECRET=1234567890...  # Connected App Consumer Secret  
SALESFORCE_INSTANCE_URL=https://mycompany.salesforce.com
SALESFORCE_CALLBACK_URL=http://localhost:8080/callback  # Optional, auto-generated
```

### Optional Environment Variables
```bash
SALESFORCE_API_VERSION=v58.0           # Default: latest
SALESFORCE_TIMEOUT=30000              # API timeout in milliseconds
LOG_LEVEL=info                        # Logging verbosity
```

## Security Considerations

### Token Security
- **Keychain Storage**: Refresh tokens stored in macOS Keychain
- **Memory-only Access Tokens**: Access tokens never written to disk
- **Token Rotation**: Automatic refresh before expiration
- **Secure Cleanup**: Tokens removed from memory after use

### API Security
- **Input Sanitization**: All user inputs validated and sanitized
- **SOQL Injection Prevention**: Parameterized queries where possible
- **Permission Validation**: Respect Salesforce field-level security
- **Audit Logging**: Log all API operations for security monitoring

## Deployment & Usage

### Installation
```bash
npm install -g @your-org/mcp-salesforce
```

### Setup Process
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Salesforce Connected App details

# 2. Run OAuth setup
mcp-salesforce setup

# 3. Add to Claude Desktop config
# Add server configuration to MCP settings
```

### Claude Desktop Integration
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "mcp-salesforce",
      "args": [],
      "env": {
        "SALESFORCE_CLIENT_ID": "your-client-id",
        "SALESFORCE_CLIENT_SECRET": "your-client-secret",
        "SALESFORCE_INSTANCE_URL": "https://yourorg.salesforce.com"
      }
    }
  }
}
```

## Success Metrics

### Functional Requirements
- ✅ Authenticate with any Salesforce org using OAuth
- ✅ Work with standard and custom objects without code changes
- ✅ Handle custom fields automatically
- ✅ Provide schema information to LLM for intelligent queries
- ✅ Maintain secure, long-term authentication

### Performance Requirements
- ✅ Schema discovery under 5 seconds
- ✅ CRUD operations under 2 seconds
- ✅ Token refresh transparent to user
- ✅ Handle up to 100 concurrent operations

### User Experience Requirements
- ✅ One-time setup process under 5 minutes
- ✅ Clear error messages with actionable guidance
- ✅ No manual token management required
- ✅ Works with 2FA-enabled Salesforce orgs

This architecture provides a robust, secure, and flexible foundation for Salesforce integration via MCP, designed to work seamlessly with any Salesforce organization while maintaining enterprise-grade security standards.
