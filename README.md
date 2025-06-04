# MCP Salesforce Server

A **Model Context Protocol (MCP) server** that provides seamless integration with Salesforce using OAuth authentication. This server enables AI assistants like Claude to interact with any Salesforce organization through a secure, generic interface.

## ✨ Features

- **🎯 Seamless Authentication** - Claude automatically detects when authentication is needed and handles it transparently
- **🚀 Zero Manual Setup** - No need to run terminal commands or manual OAuth flows
- **🔐 OAuth-Only Authentication** - Secure browser-based setup with automatic token refresh
- **🌐 Universal Salesforce Integration** - Works with any Salesforce org, including custom objects and fields  
- **🧠 Smart Installation Learning** - Analyzes your complete Salesforce setup to provide intelligent assistance
- **🔍 Dynamic Schema Discovery** - Automatically adapts to your Salesforce configuration
- **🔒 Secure Token Storage** - Uses macOS Keychain for production-grade security
- **📝 Full CRUD Operations** - Query, create, update, and delete any Salesforce records
- **📊 Schema Inspection** - Get detailed information about objects and fields
- **💡 Context-Aware Suggestions** - Provides intelligent field and object name suggestions

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **macOS** (required for Keychain integration)
- **Salesforce Connected App** with OAuth configured

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd mcp-salesforce
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Salesforce Connected App details
   ```

3. **Add to Claude Desktop** (see [Configuration](#configuration) below)

4. **🎯 Start Using**: That's it! Claude will automatically handle authentication when you first use any Salesforce tool.

**✨ No More Manual Setup!** 
- No need to run `npm run setup`
- No terminal authentication required
- Claude automatically detects when authentication is needed
- Seamless OAuth flow directly from Claude Desktop

**🧠 Smart Learning System**
- Use `salesforce_learn` to analyze your complete Salesforce installation
- Claude learns all your custom objects, fields, and relationships
- Provides intelligent suggestions based on your specific setup
- Context-aware assistance for complex Salesforce environments

## 📸 Demo Screenshots

Here's a step-by-step walkthrough of the MCP Salesforce Server in action, showing a real-world use case of verifying and updating company address information:

### Step 1: Address Verification Request
![Address Verification](docs/step1.png)
*Claude checking if the Aionda GmbH account in Salesforce has the correct address by comparing it with their current website address*

### Step 2: Address Comparison Results  
![Address Analysis](docs/step2.png)
*Claude identifying that the Salesforce address is outdated, showing detailed comparison between the current Salesforce data and the actual address from the company website*

### Step 3: Automated Address Update
![Address Update](docs/step3.png)
*Claude successfully updating the Salesforce account with the correct current address, showing exactly which fields were changed*

### Step 4: Verification in Salesforce
![Salesforce Confirmation](docs/step4.png)
*The updated account record in Salesforce showing the corrected address information is now accurate and up-to-date*

## 🔧 Configuration

### Salesforce Connected App Setup

1. In Salesforce Setup, create a new Connected App:
   - **App Name**: MCP Salesforce Integration
   - **API Name**: mcp_salesforce_integration
   - **Contact Email**: Your email
   - **Enable OAuth Settings**: ✅ Yes
   - **Callback URL**: `http://localhost:8080/callback` (will be auto-generated)
   - **Selected OAuth Scopes**:
     - Manage user data via APIs (api)
     - Perform requests at any time (refresh_token, offline_access)

2. After saving, copy the **Consumer Key** and **Consumer Secret**

### Environment Configuration

Create a `.env` file with your Salesforce details:

```bash
SALESFORCE_CLIENT_ID=3MVG9...your-consumer-key...
SALESFORCE_CLIENT_SECRET=1234567890...your-consumer-secret...
SALESFORCE_INSTANCE_URL=https://yourorg.salesforce.com

# Optional settings
SALESFORCE_API_VERSION=v58.0
SALESFORCE_TIMEOUT=30000
LOG_LEVEL=info
```

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration:

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

## 🛠️ Available Tools

### `salesforce_learn`
**🧠 Lernt deine komplette Salesforce-Installation kennen** - Analysiert alle Objekte, Felder und Anpassungen einmalig und speichert diese Informationen lokal für intelligente Unterstützung.

```javascript
// Einmalige Analyse der Salesforce-Installation
{}

// Erzwinge komplette Neuanalyse
{
  "force_refresh": true,
  "detailed_relationships": true
}
```

**Warum wichtig?** 
- Claude lernt deine Custom Objects wie "Zeitabrechnung__c", "Projekt__c", etc.
- Erkennt alle Custom Fields und deren Datentypen
- Bietet intelligente Vorschläge basierend auf deiner spezifischen Konfiguration
- Einmalig ausführen, dann profitiert die KI dauerhaft davon

### `salesforce_installation_info`
**📊 Überblick über deine gelernte Salesforce-Installation** - Zeigt verfügbare Objekte, Custom Fields und Anpassungen.

```javascript
// Gesamtüberblick über die Installation
{}

// Details zu einem spezifischen Objekt
{
  "object_name": "Zeitabrechnung__c"
}

// Suche nach bestimmten Feldern
{
  "field_search": "email",
  "show_custom_only": true
}
```

### `salesforce_query`
Execute SOQL queries against any Salesforce object.

```javascript
// Example: Get recent contacts
{
  "query": "SELECT Id, FirstName, LastName, Email FROM Contact WHERE CreatedDate = THIS_MONTH ORDER BY CreatedDate DESC LIMIT 10"
}
```

**🧠 Smart Learning Integration:** 
- Warnt automatisch, wenn Installation noch nicht gelernt wurde
- Schlägt verfügbare Objekte und Felder vor
- Hilft bei korrekten API-Namen

### `salesforce_create`  
Create new records in any Salesforce object.

```javascript
// Example: Create a new contact
{
  "sobject": "Contact",
  "data": {
    "FirstName": "John",
    "LastName": "Doe", 
    "Email": "john.doe@example.com",
    "Phone": "555-1234"
  }
}
```

**🧠 Smart Context:** Zeigt automatisch erforderliche Felder für das gewählte Objekt an, wenn die Installation gelernt wurde.

### `salesforce_update`
Update existing records.

```javascript
// Example: Update a contact's email
{
  "sobject": "Contact",
  "id": "003XX000008b6cYAQ",
  "data": {
    "Email": "new.email@example.com",
    "Phone": "555-5678"
  }
}
```

**🧠 Smart Context:** Berücksichtigt Feld-Berechtigungen und Datentypen aus der gelernten Installation.

### `salesforce_delete`
Delete records (⚠️ permanent action).

```javascript
// Example: Delete a record
{
  "sobject": "Contact", 
  "id": "003XX000008b6cYAQ"
}
```

### `salesforce_describe`
Get schema information for objects and fields.

```javascript
// Example: Get Contact object schema
{
  "sobject": "Contact"
}

// Or get list of all available objects
{} // Empty parameters
```

### `salesforce_auth`
Authenticate with Salesforce. Automatically detects if authentication is needed and handles OAuth flow.

```javascript
// Example: Standard authentication (detects if needed)
{}

// Example: Force re-authentication even if tokens appear valid
{
  "force": true
}
```

**✨ Key Features:**
- **Automatic Detection**: Claude automatically suggests this tool when authentication is needed
- **No Manual Setup**: Eliminates the need to run `npm run setup` manually  
- **Smart Authentication**: Only authenticates when necessary, checks existing tokens first
- **Seamless Integration**: Works transparently in the background

This tool is **automatically suggested** when:
- You try to use Salesforce tools without authentication
- Your tokens have expired
- Authentication errors occur
- First-time setup is needed

## 🧠 Smart Learning System

### Warum ist das Learning wichtig?

Jede Salesforce-Installation ist einzigartig mit:
- **Custom Objects** wie "Zeitabrechnung__c", "Projekt__c", "Kundenbetreuung__c"
- **Custom Fields** auf Standard-Objekten
- **Spezifische Workflows** und Validierungsregeln
- **Individuelle Datenstrukturen**

Das normale Trainingsmodell der KI kennt nur Salesforce-Standardobjekte. Ohne Kenntnisse deiner spezifischen Installation kann die KI nicht intelligent assistieren.

### Wie funktioniert das Learning?

1. **Einmalige Analyse**: `salesforce_learn` analysiert deine komplette Installation
2. **Lokale Dokumentation**: Alle Objekte, Felder und Beziehungen werden lokal gespeichert
3. **Intelligente Unterstützung**: Claude kann dann präzise Vorschläge machen und komplexe Fragen beantworten

### Beispiel-Workflow:

```
Du: "Gibt es eine Zeitabrechnung für Juli 2025?"

Ohne Learning:
❌ Claude: "Ich kenne kein Objekt namens 'Zeitabrechnung'"

Mit Learning:
✅ Claude: "Ich prüfe das Objekt 'Zeitabrechnung__c' nach Einträgen für Juli 2025..."
   Führt automatisch die richtige SOQL-Abfrage aus
```

### Wann solltest du das Learning verwenden?

- **Beim ersten Setup** - Einmalig nach der Installation
- **Bei größeren Änderungen** - Wenn neue Custom Objects hinzugefügt werden
- **Bei Problemen** - Wenn Claude Objekte oder Felder nicht findet

### Was wird gelernt?

- **Alle SObjects** (Standard und Custom)
- **Alle Felder** mit Datentypen und Berechtigungen
- **Beziehungen** zwischen Objekten
- **Picklist-Werte** und Validierungsregeln
- **Erforderliche Felder** für bessere Validation

**💡 Das Learning läuft nur einmal und macht dann alle weiteren Interaktionen viel intelligenter!**

## 💡 Usage Examples

### 🚀 Erste Schritte nach der Installation

1. **Authentifizierung**: Claude erkennt automatisch, wenn Authentifizierung benötigt wird
2. **Learning starten**: 
   ```
   Du: "Lerne meine Salesforce-Installation kennen"
   Claude: Verwendet automatisch das salesforce_learn Tool
   ```
3. **Installation erkunden**:
   ```
   Du: "Zeige mir einen Überblick über meine Salesforce-Installation"
   Claude: Verwendet salesforce_installation_info für eine Zusammenfassung
   ```

### 🔍 Intelligente Abfragen mit gelernter Installation

```
Du: "Zeige mir alle Projekte aus diesem Jahr"
Claude: Erkennt automatisch dein "Projekt__c" Custom Object und erstellt:
SELECT Id, Name, StartDatum__c, Status__c FROM Projekt__c WHERE CALENDAR_YEAR(CreatedDate) = 2025
```

```
Du: "Gibt es Zeitabrechnungen für Juli 2025?"
Claude: Findet dein "Zeitabrechnung__c" Objekt und fragt:
SELECT Id, Name, Monat__c, Stunden__c FROM Zeitabrechnung__c WHERE Monat__c = 'Juli 2025'
```

### Query Examples

```soql
-- Get all accounts in the technology industry
SELECT Id, Name, Industry, Website FROM Account WHERE Industry = 'Technology'

-- Find contacts created this week
SELECT Id, Name, Email, CreatedDate FROM Contact WHERE CreatedDate = THIS_WEEK

-- Get opportunities closing this quarter
SELECT Id, Name, Amount, CloseDate FROM Opportunity WHERE CloseDate = THIS_QUARTER
```

### Working with Custom Objects

The server automatically discovers custom objects:

```javascript
// Describe a custom object
{
  "sobject": "CustomProject__c"
}

// Query custom object
{
  "query": "SELECT Id, Name, CustomField__c FROM CustomProject__c LIMIT 10"
}

// Create custom object record
{
  "sobject": "CustomProject__c",
  "data": {
    "Name": "New Project",
    "CustomField__c": "Custom Value"
  }
}
```

## 🔒 Security

- **Token Storage**: Refresh tokens stored securely in macOS Keychain
- **No Plaintext Secrets**: Access tokens kept in memory only
- **Automatic Refresh**: Tokens refreshed automatically before expiration
- **Secure Cleanup**: Tokens removed from memory after use
- **Input Validation**: All inputs validated and sanitized

## 🧪 Testing

```bash
# Run tests
npm test

# Test authentication
npm run setup -- --test

# Validate configuration
npm run setup -- --validate
```

## 🐛 Troubleshooting

### Authentication Issues

**🎯 Automatic Authentication**: Claude automatically detects authentication issues and suggests the `salesforce_auth` tool. No manual troubleshooting needed!

**Common Scenarios:**
1. **First-time use**: Claude will automatically suggest authentication when you first try to use Salesforce tools
2. **Token expiration**: When tokens expire, Claude detects this and prompts for re-authentication  
3. **Invalid credentials**: Clear error messages guide you to fix configuration issues
4. **Session expired**: Automatic detection with friendly prompts to re-authenticate

### Quick Fix in Claude Desktop
If you get authentication errors, simply tell Claude:
```
Authenticate with Salesforce
```
Or Claude will automatically suggest: `Use the salesforce_auth tool to authenticate with Salesforce`

**✨ No more manual terminal setup!** Everything happens seamlessly through Claude Desktop.

### Connection Issues

1. **"Cannot connect to Salesforce"**: Verify your Instance URL
2. **"Insufficient permissions"**: Check user permissions in Salesforce
3. **"CORS errors"**: Ensure Connected App callback URL is correct

### Common SOQL Errors

1. **Field not found**: Use API names, not field labels
2. **Object not found**: Check spelling and API name of objects
3. **Syntax errors**: Ensure proper SOQL syntax with single quotes

## 📚 Documentation

- [OAuth Setup Guide](docs/oauth-guide.md) - Detailed Connected App configuration
- [Setup Instructions](docs/setup.md) - Step-by-step setup process  
- [Usage Examples](docs/examples.md) - Comprehensive usage examples
- [Architecture Plan](mcp-salesforce-architecture.md) - Technical architecture details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: Check the `docs/` folder for detailed guides
- **Community**: Join discussions in GitHub Discussions

---

**Made with ❤️ for the MCP ecosystem**
