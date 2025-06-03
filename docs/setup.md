# Setup Instructions

Complete step-by-step guide to set up the MCP Salesforce Server.

## Quick Setup Checklist

- [ ] Node.js 18+ installed
- [ ] macOS system (required for Keychain)
- [ ] Salesforce Developer/Admin access
- [ ] Connected App created in Salesforce
- [ ] Environment variables configured
- [ ] OAuth authentication completed
- [ ] Claude Desktop configured

## Detailed Setup Steps

### 1. System Requirements

**Operating System**
- macOS (required for Keychain integration)
- Linux support planned for future releases

**Software Requirements**
```bash
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
```

If you need to install Node.js:
```bash
# Using Homebrew (recommended)
brew install node

# Or download from nodejs.org
```

### 2. Project Installation

**Clone the Repository**
```bash
git clone <repository-url>
cd mcp-salesforce
```

**Install Dependencies**
```bash
npm install
```

**Verify Installation**
```bash
npm run --silent
# Should show available scripts
```

### 3. Salesforce Connected App Setup

Follow the detailed [OAuth Configuration Guide](oauth-guide.md) to:
1. Create a Connected App in Salesforce
2. Get Consumer Key and Secret
3. Note your Salesforce instance URL

### 4. Environment Configuration

**Copy Environment Template**
```bash
cp .env.example .env
```

**Edit Environment File**
```bash
# Edit .env with your favorite editor
nano .env
# or
code .env
```

**Required Variables**
```bash
SALESFORCE_CLIENT_ID=3MVG9...your-consumer-key...
SALESFORCE_CLIENT_SECRET=1234567890...your-consumer-secret...
SALESFORCE_INSTANCE_URL=https://yourorg.salesforce.com
```

**Validate Configuration**
```bash
# Check environment variables are set
npm run setup -- --validate
```

### 5. OAuth Authentication

**Run Setup Wizard**
```bash
npm run setup
```

The setup process will:
1. ✅ Validate environment configuration
2. 🔗 Test Salesforce connectivity  
3. 🌐 Open browser for OAuth authentication
4. 🔐 Store tokens securely in Keychain
5. 🧪 Test authentication with API call

**What to Expect**
1. Browser opens to Salesforce login page
2. Login with your Salesforce credentials
3. Approve OAuth permissions if prompted
4. Browser redirects back automatically
5. Setup completes with success message

### 6. Claude Desktop Integration

**Locate Claude Desktop Config**
```bash
# Claude Desktop configuration file location
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Add Server Configuration**
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["/path/to/mcp-salesforce/src/index.js"],
      "env": {
        "SALESFORCE_CLIENT_ID": "your-client-id",
        "SALESFORCE_CLIENT_SECRET": "your-client-secret",
        "SALESFORCE_INSTANCE_URL": "https://yourorg.salesforce.com"
      }
    }
  }
}
```

**Update Path**
```bash
# Get absolute path for configuration
pwd
# Use this path in Claude Desktop config
```

**Restart Claude Desktop**
- Quit Claude Desktop completely
- Restart the application
- Verify server appears in Claude settings

### 7. Verification

**Test Server Manually**
```bash
# Test the MCP server
npm start
# Should show "MCP Salesforce Server started successfully"
# Press Ctrl+C to stop
```

**Test in Claude Desktop**
1. Start a new conversation in Claude Desktop
2. Try asking: "What Salesforce objects are available?"
3. Should see response with available tools and objects

### 8. First Usage Examples

**List Available Objects**
```
Can you show me what Salesforce objects are available in my org?
```

**Query Recent Records**
```
Show me the 10 most recent contacts created this month
```

**Get Object Schema**
```
What fields are available on the Contact object?
```

## Troubleshooting Setup Issues

### Environment Issues

**Missing Node.js**
```bash
# Install Node.js with Homebrew
brew install node

# Verify installation
node --version
npm --version
```

**Permission Errors**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Salesforce Connection Issues

**Cannot Connect to Salesforce**
- Verify `SALESFORCE_INSTANCE_URL` is correct
- Check network connectivity
- Ensure Salesforce instance is accessible

**Invalid Client Credentials**
- Double-check Consumer Key and Secret
- Verify no extra spaces or characters
- Wait 2-10 minutes after creating Connected App

**OAuth Flow Issues**
- Check if browser opens automatically
- Try manually visiting the OAuth URL shown
- Verify callback port is not blocked by firewall

### Authentication Issues

**No Tokens Found**
- Complete OAuth flow by running `npm run setup`
- Check macOS Keychain access permissions
- Verify setup completed successfully

**Token Expired/Invalid**
- Run `npm run setup` again to re-authenticate
- Check if user permissions changed in Salesforce
- Verify Connected App is still active

### Claude Desktop Issues

**Server Not Appearing**
- Check JSON syntax in configuration file
- Verify file path is absolute and correct
- Restart Claude Desktop completely

**Tools Not Working**
- Check server logs for errors
- Verify environment variables in Claude config
- Test server manually with `npm start`

## Advanced Configuration

### Custom API Version
```bash
SALESFORCE_API_VERSION=v58.0
```

### Timeout Settings
```bash
SALESFORCE_TIMEOUT=30000
```

### Debug Logging
```bash
LOG_LEVEL=debug
```

### Custom Callback Port
```bash
SALESFORCE_CALLBACK_URL=http://localhost:9000/callback
```

## Security Checklist

- [ ] Environment variables not committed to git
- [ ] `.env` file added to `.gitignore`
- [ ] Connected App uses secure settings
- [ ] User permissions reviewed and minimal
- [ ] API usage monitoring enabled
- [ ] Regular token rotation planned

## Getting Help

**Documentation**
- [OAuth Guide](oauth-guide.md) - Connected App setup
- [Usage Examples](examples.md) - Common use cases
- [Architecture](../mcp-salesforce-architecture.md) - Technical details

**Support Channels**
- GitHub Issues for bugs and feature requests
- GitHub Discussions for questions and community support

**Diagnostic Information**
When asking for help, include:
- Node.js version (`node --version`)
- macOS version
- Error messages (sanitized of credentials)
- Steps to reproduce the issue

## Next Steps

After successful setup:
1. 📖 Read [Usage Examples](examples.md) for common patterns
2. 🔍 Explore your Salesforce data with queries
3. 🛠️ Try creating and updating records
4. 📊 Use schema inspection to understand your data model
5. 🚀 Build custom workflows with Claude's help

Your MCP Salesforce Server is now ready for use! 🎉
