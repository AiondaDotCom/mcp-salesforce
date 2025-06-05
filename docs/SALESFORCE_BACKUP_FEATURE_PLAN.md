# 🗄️ Salesforce Backup Feature - Comprehensive Implementation Plan

## 📋 Übersicht

Ein fortschrittliches Backup-System für Salesforce, das **alle Daten und Dateianhänge** sichert und dabei die drei verschiedenen Salesforce-Dateisysteme unterstützt.

---

## 🎯 Feature-Ziele

### Primäre Ziele
- ✅ **Vollständige Datensicherung** - Alle SObjects, Custom Objects, Felder
- ✅ **Dateianhang-Support** - Alle drei Salesforce-Dateisysteme
- ✅ **Inkrementelle Backups** - Nur Änderungen seit letztem Backup
- ✅ **Strukturierte Speicherung** - JSON + Binärdateien organisiert
- ✅ **API-Effizienz** - Parallelisierung und Bulk-Operations

### Erweiterte Ziele
- 🔄 **Wiederherstellung** - Structured restore capabilities
- 📊 **Backup-Berichte** - Detaillierte Statistiken und Logs
- 🔍 **Backup-Vergleich** - Diff zwischen Backups
- ⚡ **Delta-Sync** - Nur geänderte Datei-Inhalte
- 🗜️ **Komprimierung** - Gzip für große Backups

---

## 📚 Salesforce Dateisystem-Architektur

### 1. Modern Files (ContentDocument/ContentVersion)
```javascript
// Seit 2015 - Empfohlenes System
const modernFiles = {
  mainObject: 'ContentDocument',
  versionObject: 'ContentVersion', 
  linkObject: 'ContentDocumentLink',
  binaryField: 'VersionData',
  maxFileSize: '2GB',
  features: ['Versioning', 'Sharing', 'Lightning Support']
};
```

### 2. Legacy Attachments
```javascript
// Vor 2015 - Noch weit verbreitet
const legacyAttachments = {
  object: 'Attachment',
  binaryField: 'Body',
  maxFileSize: '25MB',
  parentField: 'ParentId',
  features: ['Direct Parent Relationship']
};
```

### 3. Documents
```javascript
// Ältestes System - Folder-basiert
const documents = {
  object: 'Document',
  binaryField: 'Body',
  maxFileSize: '5MB',
  folderField: 'FolderId',
  features: ['Folder Organization', 'Public Access']
};
```

---

## 🏗️ Technische Implementierung

### 1. Core Backup Tool Structure

```javascript
// src/tools/backup.js
export async function handleSalesforceBackup(args) {
  const {
    backup_type = 'incremental',  // 'full' | 'incremental' | 'files_only'
    include_files = true,
    include_attachments = true,
    include_documents = true,
    output_directory = './backups',
    compression = true,
    parallel_downloads = 5,
    since_date = null  // For incremental backups
  } = args;

  // Implementation logic here
}
```

### 2. Backup Directory Structure

```
backups/
├── salesforce-backup-2024-01-15T10-30-00/
│   ├── metadata/
│   │   ├── backup-info.json          # Backup metadata
│   │   ├── objects-schema.json       # Object definitions
│   │   └── file-manifest.json        # File inventory
│   ├── data/
│   │   ├── Account.json               # Account records
│   │   ├── Contact.json               # Contact records
│   │   ├── CustomObject__c.json       # Custom object records
│   │   └── ContentDocument.json       # File metadata
│   ├── files/
│   │   ├── content-versions/          # Modern files
│   │   │   ├── 068xxxxx.pdf
│   │   │   └── 068xxxxx.docx
│   │   ├── attachments/               # Legacy attachments
│   │   │   ├── 00Pxxxxx.pdf
│   │   │   └── 00Pxxxxx.jpg
│   │   └── documents/                 # Document objects
│   │       ├── 015xxxxx.pdf
│   │       └── 015xxxxx.png
│   └── logs/
│       ├── backup.log                 # Detailed backup log
│       ├── errors.log                 # Error details
│       └── api-usage.log              # API call statistics
```

### 3. File Download Implementation

```javascript
// src/backup/file-downloader.js
export class SalesforceFileDownloader {
  constructor(salesforceClient, options = {}) {
    this.client = salesforceClient;
    this.parallelLimit = options.parallelLimit || 5;
    this.retryAttempts = options.retryAttempts || 3;
  }

  async downloadContentVersion(contentVersionId, outputPath) {
    const endpoint = `/services/data/v${this.client.version}/sobjects/ContentVersion/${contentVersionId}/VersionData`;
    return await this.downloadBinaryFile(endpoint, outputPath);
  }

  async downloadAttachment(attachmentId, outputPath) {
    const endpoint = `/services/data/v${this.client.version}/sobjects/Attachment/${attachmentId}/Body`;
    return await this.downloadBinaryFile(endpoint, outputPath);
  }

  async downloadDocument(documentId, outputPath) {
    const endpoint = `/services/data/v${this.client.version}/sobjects/Document/${documentId}/Body`;
    return await this.downloadBinaryFile(endpoint, outputPath);
  }

  async downloadBinaryFile(endpoint, outputPath) {
    await this.client.ensureValidConnection();
    
    const response = await fetch(`${this.client.instanceUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${await this.client.tokenManager.getValidAccessToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`File download failed: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
    
    return {
      success: true,
      size: arrayBuffer.byteLength,
      path: outputPath
    };
  }
}
```

### 4. Incremental Backup Logic

```javascript
// src/backup/incremental-backup.js
export class IncrementalBackupManager {
  constructor(salesforceClient) {
    this.client = salesforceClient;
  }

  async getIncrementalData(sinceDate, objectName) {
    // Query records modified since last backup
    const soql = `
      SELECT Id, ${await this.getFieldList(objectName)}
      FROM ${objectName} 
      WHERE LastModifiedDate > ${sinceDate}
      ORDER BY LastModifiedDate ASC
    `;
    
    return await this.client.query(soql);
  }

  async getModifiedFiles(sinceDate) {
    const queries = [
      // Modern files
      `SELECT Id, ContentDocumentId, Title, FileType, ContentSize, LastModifiedDate 
       FROM ContentVersion 
       WHERE LastModifiedDate > ${sinceDate} AND IsLatest = true`,
       
      // Legacy attachments  
      `SELECT Id, Name, ContentType, BodyLength, ParentId, LastModifiedDate
       FROM Attachment
       WHERE LastModifiedDate > ${sinceDate}`,
       
      // Documents
      `SELECT Id, Name, Type, BodyLength, FolderId, LastModifiedDate
       FROM Document  
       WHERE LastModifiedDate > ${sinceDate}`
    ];

    const results = await Promise.all(
      queries.map(query => this.client.query(query))
    );

    return {
      contentVersions: results[0].records,
      attachments: results[1].records,
      documents: results[2].records
    };
  }
}
```

---

## 🔧 MCP Tool Definition

```javascript
// Integration into existing MCP server
{
  name: "salesforce_backup",
  description: "Create comprehensive backups of Salesforce data including all file attachments",
  inputSchema: {
    type: "object",
    properties: {
      backup_type: {
        type: "string",
        enum: ["full", "incremental", "files_only"],
        description: "Type of backup to perform",
        default: "incremental"
      },
      output_directory: {
        type: "string", 
        description: "Directory to store backup files",
        default: "./backups"
      },
      include_files: {
        type: "boolean",
        description: "Include ContentDocument/ContentVersion files",
        default: true
      },
      include_attachments: {
        type: "boolean", 
        description: "Include legacy Attachment files",
        default: true
      },
      include_documents: {
        type: "boolean",
        description: "Include Document object files", 
        default: true
      },
      objects_filter: {
        type: "array",
        items: { type: "string" },
        description: "Specific objects to backup (empty = all objects)"
      },
      since_date: {
        type: "string",
        description: "ISO date for incremental backup (YYYY-MM-DDTHH:mm:ss.sssZ)"
      },
      compression: {
        type: "boolean",
        description: "Compress backup files with gzip",
        default: true
      },
      parallel_downloads: {
        type: "number",
        description: "Number of parallel file downloads",
        default: 5,
        minimum: 1,
        maximum: 10
      }
    }
  }
}
```

---

## 📊 Performance-Optimierungen

### 1. API-Effizienz
- **Bulk Queries**: 2000 records per SOQL query
- **Parallel Downloads**: Bis zu 10 gleichzeitige Datei-Downloads  
- **Field Selection**: Nur benötigte Felder abfragen
- **Query Batching**: Große Object-Listen in Chunks aufteilen

### 2. Memory Management
- **Streaming Downloads**: Große Dateien nicht komplett in Memory laden
- **File Buffering**: Schreibe Dateien direkt auf Disk
- **Progress Tracking**: Live-Updates über Backup-Fortschritt

### 3. Error Handling & Resilience
- **Retry Logic**: 3 Versuche bei fehlgeschlagenen Downloads
- **Partial Recovery**: Backup fortsetzbar bei Unterbrechung
- **Detailed Logging**: Alle Fehler und API-Calls dokumentiert

---

## 🔍 Backup-Restore Integration

### 1. Restore Tool Concept
```javascript
{
  name: "salesforce_restore",
  description: "Restore data from Salesforce backup",
  inputSchema: {
    properties: {
      backup_directory: { type: "string" },
      restore_type: { 
        type: "string", 
        enum: ["data_only", "files_only", "complete"]
      },
      target_objects: {
        type: "array",
        items: { type: "string" }
      }
    }
  }
}
```

### 2. Backup Comparison Tool
```javascript
{
  name: "salesforce_backup_compare",
  description: "Compare two backups to see differences",
  inputSchema: {
    properties: {
      backup1_path: { type: "string" },
      backup2_path: { type: "string" },
      comparison_type: {
        type: "string",
        enum: ["records", "files", "schema", "complete"]
      }
    }
  }
}
```

---

## 📈 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- ✅ Basic backup tool structure
- ✅ Directory organization
- ✅ SObject data extraction
- ✅ Progress tracking

### Phase 2: File Download Support (Week 3-4)  
- ✅ ContentVersion download
- ✅ Attachment download
- ✅ Document download
- ✅ Parallel processing

### Phase 3: Advanced Features (Week 5-6)
- ✅ Incremental backup logic
- ✅ Compression support
- ✅ Error handling & retry
- ✅ Detailed logging

### Phase 4: Restore & Tools (Week 7-8)
- ✅ Restore functionality
- ✅ Backup comparison
- ✅ Performance optimization
- ✅ Documentation & testing

---

## 🎯 Success Metrics

### Functional Requirements
- ✅ Backup all standard and custom objects
- ✅ Download all three file types (ContentVersion, Attachment, Document)
- ✅ Support incremental backups with date filtering
- ✅ Organize backup in searchable directory structure
- ✅ Handle large files (up to 2GB) efficiently

### Performance Requirements  
- ✅ Full org backup under 2 hours (for typical org)
- ✅ Incremental backup under 15 minutes
- ✅ Parallel file downloads (5-10 concurrent)
- ✅ Memory usage under 500MB during backup
- ✅ Resume capability for interrupted backups

### User Experience Requirements
- ✅ Simple one-command backup execution
- ✅ Real-time progress indication
- ✅ Clear error messages with recovery suggestions
- ✅ Detailed backup reports and statistics
- ✅ Integration with existing MCP Salesforce tools

---

## 🚀 Usage Examples

### Full Backup
```javascript
// Claude: "Create a complete backup of our Salesforce org"
{
  "backup_type": "full",
  "include_files": true,
  "include_attachments": true,
  "include_documents": true,
  "output_directory": "./backups/full-backup-2024-01-15"
}
```

### Incremental Backup
```javascript
// Claude: "Backup all changes since last week"
{
  "backup_type": "incremental", 
  "since_date": "2024-01-08T00:00:00.000Z",
  "compression": true
}
```

### Files Only Backup
```javascript
// Claude: "Backup just the files and attachments"
{
  "backup_type": "files_only",
  "parallel_downloads": 8,
  "objects_filter": ["ContentDocument", "Attachment", "Document"]
}
```

---

## 💡 Advanced Features (Future)

### 1. Cloud Storage Integration
- AWS S3 upload after backup
- Google Drive integration
- Dropbox Business support

### 2. Scheduled Backups
- Cron-job integration
- Automated incremental backups
- Email notifications

### 3. Data Anonymization
- PII removal for test environments
- Field masking capabilities
- GDPR compliance features

### 4. Backup Analytics
- Storage usage trends
- File type distribution
- Growth rate analysis

---

This comprehensive backup feature would make the MCP Salesforce server a complete data management solution, ensuring that users never lose critical business data while maintaining full file attachment support across all Salesforce file systems.
