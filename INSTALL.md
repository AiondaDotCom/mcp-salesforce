# MCP Salesforce Installation Guide

## 🚀 **Recommended: NPX Usage (No Installation Required)**

The easiest way to use MCP Salesforce is with NPX - no installation needed!

### NPX Installation

**No installation required!** NPX automatically downloads and runs the latest version.

```bash
# Test NPX access
npx @aiondadotcom/mcp-salesforce --version
npx @aiondadotcom/mcp-salesforce --help
```

### MCP Configuration with NPX

#### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["@aiondadotcom/mcp-salesforce"],
      "env": {
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret", 
        "SALESFORCE_INSTANCE_URL": "https://your-org.salesforce.com"
      }
    }
  }
}
```

#### VS Code MCP
Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "salesforce": {
      "command": "npx",
      "args": ["@aiondadotcom/mcp-salesforce"],
      "env": {
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret", 
        "SALESFORCE_INSTANCE_URL": "https://your-org.my.salesforce.com"
      }
    }
  }
}
```

### NPX Setup Process

1. **Add MCP Configuration** (above)
2. **Start Claude/VS Code** - MCP server runs automatically
3. **First Use**: Claude will automatically handle OAuth authentication
4. **That's it!** No manual setup required

## 🔧 **Alternative: Traditional Installation Methods**

### Global Installation
```bash
npm install -g @aiondadotcom/mcp-salesforce
```

#### Global Installation MCP Configuration

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "mcp-salesforce",
      "env": {
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret", 
        "SALESFORCE_INSTANCE_URL": "https://your-org.salesforce.com"
      }
    }
  }
}
```

### Local Project Installation

```bash
npm install @aiondadotcom/mcp-salesforce
```

#### Local Installation MCP Configuration

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["./node_modules/@aiondadotcom/mcp-salesforce/src/index.js"],
      "env": {
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret", 
        "SALESFORCE_INSTANCE_URL": "https://your-org.salesforce.com"
      }
    }
  }
}
```

## 🛠️ **Development Installation**

For contributing or customizing:

```bash
git clone https://github.com/AiondaDotCom/mcp-salesforce.git
cd mcp-salesforce
npm install
```

### Development MCP Configuration

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["/path/to/mcp-salesforce/src/index.js"],
      "env": {
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret", 
        "SALESFORCE_INSTANCE_URL": "https://your-org.salesforce.com"
      }
    }
  }
}
```

## ✅ **Benefits Comparison**

| Method | Pros | Cons | Use Case |
|--------|------|------|----------|
| **NPX** | 🔄 Always latest, 💾 No storage, ⚡ Easy updates | Requires internet | **Recommended for most users** |
| **Global** | 🚀 Fast startup, 📶 Works offline | Takes disk space, manual updates | Power users, offline scenarios |
| **Local** | 🎯 Project-specific, 📦 Version control | Per-project setup | Multi-project environments |
| **Development** | 🔧 Full customization, 🧪 Testing | Manual setup, maintenance | Contributors, customization |

## 🚀 **Quick Start After Installation**

1. **Configure Environment**: Set up your Salesforce Connected App
2. **Start Using**: Claude automatically handles authentication
3. **Learn Installation**: Use `salesforce_learn` to analyze your Salesforce setup
4. **Explore Tools**: Query, create, update, backup, and analyze your Salesforce data

## 📚 **Next Steps**

- Read the [README.md](README.md) for complete feature overview
- Check [Salesforce Connected App Setup](README.md#salesforce-connected-app-setup)
- Explore the [Available Tools](README.md#available-tools)
- Try the [Backup & Time Machine features](README.md#backup--time-machine-features)
  instanceUrl: 'https://your-org.my.salesforce.com'
});

await client.authenticate();
const accounts = await client.query('SELECT Id, Name FROM Account LIMIT 10');
```

## 🔧 Requirements
- Node.js >= 18.0.0
- macOS (for Keychain integration)
- Salesforce Connected App

## 📖 Full Documentation
See the [GitHub repository](https://github.com/AiondaDotCom/mcp-salesforce) for complete documentation.