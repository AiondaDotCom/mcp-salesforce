# OAuth Configuration Guide

This guide walks you through setting up a Salesforce Connected App for OAuth authentication with the MCP Salesforce Server.

## Prerequisites

- Salesforce Developer/Administrator access
- Ability to create Connected Apps in your Salesforce org

## Step 1: Create a Connected App

1. **Login to Salesforce**
   - Go to your Salesforce instance (e.g., `https://yourorg.salesforce.com`)
   - Login with administrator credentials

2. **Navigate to App Manager**
   - Click the **gear icon** (Setup) in the top right
   - In Quick Find, search for "App Manager"
   - Click **App Manager**

3. **Create New Connected App**
   - Click **New Connected App**
   - Fill in the required fields:

### Basic Information
```
Connected App Name: MCP Salesforce Server
API Name: mcp_salesforce_server (auto-generated)
Contact Email: your-email@example.com
Description: OAuth integration for MCP Salesforce Server
```

### API (Enable OAuth Settings)
- ✅ **Enable OAuth Settings**

### OAuth Settings
```
Callback URLs (add ALL of these, one per line):
http://localhost:8080/callback
http://localhost:8000/callback
http://localhost:8001/callback
http://localhost:8002/callback
http://localhost:8003/callback
http://localhost:8004/callback
http://localhost:8005/callback

Selected OAuth Scopes:
- Manage user data via APIs (api)
- Perform requests at any time (refresh_token, offline_access)
```

**Note**: Multiple callback URLs are needed because the setup process will try different ports if 8080 is busy.

### Additional Settings
- ✅ **Require Secret for Web Server Flow**: Leave checked
- ✅ **Require Secret for Refresh Token Flow**: Leave checked
- ❌ **Enable PKCE**: Leave unchecked for compatibility

4. **Save the Connected App**
   - Click **Save**
   - You'll see a message that it may take 2-10 minutes to take effect

## Step 2: Get OAuth Credentials

1. **View the Connected App**
   - After saving, click **Continue** or navigate back to App Manager
   - Find your app and click **View**

2. **Copy OAuth Credentials**
   - **Consumer Key**: This is your `SALESFORCE_CLIENT_ID`
   - **Consumer Secret**: Click "Click to reveal" to see your `SALESFORCE_CLIENT_SECRET`

3. **Note Your Instance URL**
   - Your Salesforce instance URL (e.g., `https://yourcompany.salesforce.com`)
   - This is your `SALESFORCE_INSTANCE_URL`

## Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```bash
SALESFORCE_CLIENT_ID=3MVG9...your-consumer-key...
SALESFORCE_CLIENT_SECRET=1234567890...your-consumer-secret...  
SALESFORCE_INSTANCE_URL=https://yourorg.salesforce.com
```

## Step 4: Security Considerations

### IP Restrictions (Optional but Recommended)
1. In your Connected App settings, scroll to **OAuth Policies**
2. Set **Permitted Users** to "Admin approved users are pre-authorized"
3. Set **IP Relaxation** to "Enforce IP restrictions"

### User Permissions
Ensure the user authenticating has appropriate permissions:
- **API Enabled** permission
- Access to objects and fields you plan to use
- **Modify All Data** or specific object permissions as needed

## Step 5: Testing the Setup

After configuring your `.env` file:

```bash
npm run setup
```

This will:
1. Validate your environment configuration
2. Test connectivity to Salesforce
3. Open your browser for OAuth authentication
4. Store tokens securely in macOS Keychain

## Troubleshooting

### Common Issues

**"Invalid client credentials"**
- Verify Consumer Key and Secret are correct
- Check for extra spaces or characters
- Ensure Connected App is activated (wait 2-10 minutes after creation)

**"Invalid redirect URI"**
- The callback URL is auto-generated during setup
- No need to change it in Salesforce
- Ensure no firewall blocking localhost connections

**"User authentication failed"**
- Check user has API access enabled
- Verify user permissions for required objects
- Ensure user can login to Salesforce normally

**"Insufficient privileges"**
- User needs "API Enabled" permission
- Check object-level and field-level security
- Verify sharing rules don't restrict access

### Advanced Configuration

**Custom Callback Port**
```bash
SALESFORCE_CALLBACK_URL=http://localhost:9000/callback
```

**API Version**
```bash
SALESFORCE_API_VERSION=v58.0
```

**Timeout Settings**
```bash
SALESFORCE_TIMEOUT=30000
```

## Security Best Practices

1. **Rotate Secrets Regularly**: Update Consumer Secret periodically
2. **Monitor Usage**: Check Connected App usage in Setup > Apps > Connected Apps OAuth Usage
3. **Limit Scope**: Only grant necessary OAuth scopes
4. **Review Permissions**: Regularly audit user permissions
5. **Enable Monitoring**: Set up login monitoring and alerts

## Production Deployment

For production deployments:

1. **Use Environment Variables**: Never hardcode credentials
2. **Secure Secret Storage**: Use secure secret management
3. **Enable IP Restrictions**: Limit access to known IP ranges
4. **Monitor Access**: Set up alerts for unusual activity
5. **Regular Audits**: Review and audit Connected App usage

## API Limits and Considerations

- **Daily API Limits**: Monitor your org's API usage
- **Rate Limiting**: The server includes automatic retry logic
- **Bulk Operations**: Use SOQL efficiently for large datasets
- **Field-Level Security**: Respect Salesforce security model

This OAuth setup provides secure, long-term authentication for your MCP Salesforce Server while following Salesforce security best practices.
