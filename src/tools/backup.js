import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SalesforceBackupManager } from '../backup/manager.js';
import { debug as logger } from '../utils/debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Salesforce Backup MCP Tool
 * 
 * Creates comprehensive backups of Salesforce data including all file attachments
 * from ContentDocument/ContentVersion, Attachments, and Documents
 */
export async function handleSalesforceBackup(args, client) {
  const {
    backup_type = 'incremental',
    include_files = true,
    include_attachments = true,
    include_documents = true,
    objects_filter = [],
    since_date = null,
    compression = false,
    parallel_downloads = 5
  } = args;

  // Resolve backup directory relative to project root, not current working directory
  const projectRoot = path.resolve(__dirname, '../..');
  const output_directory = path.join(projectRoot, 'backups');

  try {
    // Ensure backup directory exists
    await fs.mkdir(output_directory, { recursive: true });
    
    logger.log(`🗄️ Starting Salesforce ${backup_type} backup...`);
    
    // Validate parameters
    const validBackupTypes = ['full', 'incremental', 'files_only'];
    if (!validBackupTypes.includes(backup_type)) {
      throw new Error(`Invalid backup_type. Must be one of: ${validBackupTypes.join(', ')}`);
    }
    
    if (parallel_downloads < 1 || parallel_downloads > 10) {
      throw new Error('parallel_downloads must be between 1 and 10');
    }
    
    // Parse since_date if provided
    let parsedSinceDate = null;
    if (since_date) {
      try {
        parsedSinceDate = new Date(since_date).toISOString();
      } catch (error) {
        throw new Error(`Invalid since_date format. Use ISO format: YYYY-MM-DDTHH:mm:ss.sssZ`);
      }
    }
    
    // Create backup manager with options
    const backupManager = new SalesforceBackupManager(client, {
      outputDirectory: output_directory,
      includeFiles: include_files,
      includeAttachments: include_attachments,
      includeDocuments: include_documents,
      compression: compression,
      parallelDownloads: parallel_downloads,
      objectsFilter: objects_filter
    });
    
    // Execute async backup - returns immediately
    const jobResult = await backupManager.startAsyncBackup(backup_type, parsedSinceDate);
    
    // Return immediate response with job information
    let successMessage = `🚀 **Salesforce ${backup_type} backup started successfully!**\n\n`;
    successMessage += `📋 **Job ID**: \`${jobResult.jobId}\`\n`;
    successMessage += `📁 **Backup Location**: \`${jobResult.backupDirectory}\`\n`;
    successMessage += `⚡ **Status**: ${jobResult.status} - Running in background\n\n`;
    successMessage += `ℹ️ **Monitor Progress**: Use the \`salesforce_backup_status\` tool to check job progress\n`;
    successMessage += `📊 **View All Jobs**: Use \`salesforce_backup_status\` without parameters to see all jobs\n\n`;
    
    successMessage += `🔄 **What happens next?**\n`;
    successMessage += `- The backup is now running in the background\n`;
    successMessage += `- You can continue using other tools immediately\n`;
    successMessage += `- Check progress anytime with \`salesforce_backup_status\`\n`;
    successMessage += `- You'll find the completed backup in the specified directory\n\n`;
    
    successMessage += `📁 **Expected Directory Structure**:\n`;
    successMessage += `\`\`\`\n`;
    successMessage += `${path.basename(jobResult.backupDirectory)}/\n`;
    successMessage += `├── metadata/           # Schemas and manifest\n`;
    successMessage += `├── data/               # Object records (JSON)\n`;
    successMessage += `├── files/\n`;
    successMessage += `│   ├── content-versions/  # Modern files\n`;
    successMessage += `│   ├── attachments/       # Legacy attachments\n`;
    successMessage += `│   └── documents/         # Document objects\n`;
    successMessage += `└── logs/               # Backup logs\n`;
    successMessage += `\`\`\`\n\n`;
    
    // Add next steps suggestions
    successMessage += `🔄 **Next Steps**:\n`;
    successMessage += `- Monitor progress: Use \`salesforce_backup_status ${jobResult.jobId}\` for detailed status\n`;
    successMessage += `- Check all jobs: Use \`salesforce_backup_status\` to see all running/completed jobs\n`;
    
    if (backup_type === 'full') {
      successMessage += `- Schedule incremental backups using \`since_date\` parameter\n`;
    }
    
    if (compression) {
      successMessage += `- Archive will be created with compression enabled\n`;
    }
    
    return {
      content: [
        {
          type: "text",
          text: successMessage
        }
      ]
    };
    
  } catch (error) {
    let errorMessage = `❌ **Salesforce backup failed**\n\n`;
    errorMessage += `**Error**: ${error.message}\n\n`;
    
    errorMessage += `🔧 **Troubleshooting**:\n`;
    
    if (error.message.includes('Authentication')) {
      errorMessage += `- Run \`salesforce_auth\` to refresh your authentication\n`;
    }
    
    if (error.message.includes('permission') || error.message.includes('access')) {
      errorMessage += `- Check your Salesforce user permissions for objects and files\n`;
      errorMessage += `- Ensure you have \`View All Data\` or appropriate object permissions\n`;
    }
    
    if (error.message.includes('API')) {
      errorMessage += `- Check your Salesforce API limits in Setup > System Overview\n`;
      errorMessage += `- Consider reducing \`parallel_downloads\` parameter\n`;
    }
    
    if (error.message.includes('since_date')) {
      errorMessage += `- Use ISO date format: \`2024-01-15T10:30:00.000Z\`\n`;
      errorMessage += `- Check that the date is not in the future\n`;
    }
    
    errorMessage += `\n💡 **Suggestions**:\n`;
    errorMessage += `- Try a smaller backup first with \`backup_type: "files_only"\`\n`;
    errorMessage += `- Use \`objects_filter\` to backup specific objects only\n`;
    errorMessage += `- Check available disk space\n`;
    
    return {
      content: [
        {
          type: "text",
          text: errorMessage
        }
      ]
    };
  }
}

/**
 * Salesforce Backup List MCP Tool
 * 
 * Lists available backups and their information
 */
export async function handleSalesforceBackupList(args) {
  // Resolve backup directory relative to project root, not current working directory
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const backup_directory = path.join(projectRoot, 'backups');
  
  try {
    // Check if backup directory exists
    try {
      await fs.access(backup_directory);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `📁 No backups found.\n\nCreate your first backup using the \`salesforce_backup\` tool.`
          }
        ]
      };
    }
    
    // Read backup directory
    const entries = await fs.readdir(backup_directory, { withFileTypes: true });
    const backupDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('salesforce-backup-'))
      .sort((a, b) => b.name.localeCompare(a.name)); // Most recent first
    
    if (backupDirs.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `📁 No Salesforce backups found.\n\nCreate your first backup using the \`salesforce_backup\` tool.`
          }
        ]
      };
    }
    
    let response = `📋 **Available Salesforce Backups** (${backupDirs.length} found)\n\n`;
    
    // Analyze each backup
    for (const [index, backupDir] of backupDirs.slice(0, 10).entries()) { // Show max 10
      const backupPath = path.join(backup_directory, backupDir.name);
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      
      try {
        const manifestData = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestData);
        
        const backupInfo = manifest.backupInfo;
        const stats = manifest.downloadStats || {};
        const totalFiles = (stats.contentVersions || 0) + (stats.attachments || 0) + (stats.documents || 0);
        const sizeMB = Math.round((stats.totalBytes || 0) / (1024 * 1024) * 100) / 100;
        
        response += `**${index + 1}. ${backupDir.name}**\n`;
        response += `   📅 Date: ${new Date(backupInfo.timestamp).toLocaleString()}\n`;
        response += `   ⏱️ Duration: ${backupInfo.duration} seconds\n`;
        response += `   📦 Files: ${totalFiles} (${sizeMB} MB)\n`;
        response += `   🏢 Instance: ${backupInfo.salesforceInstance}\n`;
        response += `   📁 Path: \`${backupPath}\`\n\n`;
        
      } catch (error) {
        response += `**${index + 1}. ${backupDir.name}**\n`;
        response += `   ⚠️ Manifest not found or corrupted\n`;
        response += `   📁 Path: \`${backupPath}\`\n\n`;
      }
    }
    
    if (backupDirs.length > 10) {
      response += `... and ${backupDirs.length - 10} more backups\n\n`;
    }
    
    response += `🔧 **Management**:\n`;
    response += `- View backup details: Check \`backup-manifest.json\` in each directory\n`;
    response += `- Clean old backups: Manually delete directories you no longer need\n`;
    response += `- Restore from backup: Use the data files to recreate records\n`;
    
    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
    
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ **Failed to list backups**: ${error.message}\n\nPlease check your backup directory access.`
        }
      ]
    };
  }
}

/**
 * Salesforce Backup Status MCP Tool
 * 
 * Check the status of backup jobs (running, completed, failed)
 */
export async function handleSalesforceBackupStatus(args, client) {
  const { job_id = null } = args;

  // Resolve backup directory relative to project root
  const projectRoot = path.resolve(__dirname, '../..');
  const backupDirectory = path.join(projectRoot, 'backups');

  try {
    // Ensure backup directory exists
    await fs.mkdir(backupDirectory, { recursive: true });

    // Create backup manager to access status methods
    const backupManager = new SalesforceBackupManager(client, {
      outputDirectory: backupDirectory
    });

    if (job_id) {
      // Get status of specific job
      const jobStatus = await backupManager.getBackupJobStatus(job_id);
      
      if (!jobStatus) {
        return {
          content: [{
            type: "text",
            text: `❌ **Job not found**: No backup job found with ID \`${job_id}\`\n\nUse \`salesforce_backup_status\` without parameters to see all jobs.`
          }]
        };
      }

      // Format single job status
      let statusMessage = `📋 **Backup Job Status**\n\n`;
      statusMessage += `🆔 **Job ID**: \`${jobStatus.jobId}\`\n`;
      statusMessage += `⚡ **Status**: ${getStatusEmoji(jobStatus.status)} ${jobStatus.status.toUpperCase()}\n`;
      statusMessage += `📅 **Started**: ${new Date(jobStatus.startTime).toLocaleString()}\n`;
      
      if (jobStatus.endTime) {
        statusMessage += `🏁 **Completed**: ${new Date(jobStatus.endTime).toLocaleString()}\n`;
      }
      
      statusMessage += `📁 **Backup Directory**: \`${jobStatus.backupDirectory}\`\n`;
      statusMessage += `📊 **Progress**: ${jobStatus.progress}%\n`;
      statusMessage += `💬 **Message**: ${jobStatus.message}\n`;
      
      if (jobStatus.result) {
        const stats = jobStatus.result.stats;
        const totalFiles = stats.contentVersions + stats.attachments + stats.documents;
        const sizeMB = Math.round(stats.totalBytes / (1024 * 1024) * 100) / 100;
        
        statusMessage += `\n📊 **Backup Results**:\n`;
        statusMessage += `- ⏱️ **Duration**: ${jobStatus.result.duration} seconds\n`;
        statusMessage += `- 📄 **ContentVersion files**: ${stats.contentVersions}\n`;
        statusMessage += `- 📎 **Attachment files**: ${stats.attachments}\n`;
        statusMessage += `- 📋 **Document files**: ${stats.documents}\n`;
        statusMessage += `- 📦 **Total files**: ${totalFiles}\n`;
        statusMessage += `- 💾 **Total size**: ${sizeMB} MB\n`;
        
        if (stats.errors > 0) {
          statusMessage += `- ⚠️ **Errors**: ${stats.errors} failed downloads\n`;
        }
      }
      
      if (jobStatus.error) {
        statusMessage += `\n❌ **Error**: ${jobStatus.error}\n`;
      }

      return {
        content: [{
          type: "text",
          text: statusMessage
        }]
      };

    } else {
      // Get status of all jobs
      const allJobs = await backupManager.getBackupJobStatuses();
      
      if (allJobs.length === 0) {
        return {
          content: [{
            type: "text",
            text: `📋 **No backup jobs found**\n\nNo backup jobs have been started yet. Use the \`salesforce_backup\` tool to start a backup.`
          }]
        };
      }

      // Format all jobs status
      let statusMessage = `📋 **All Backup Jobs** (${allJobs.length} total)\n\n`;
      
      allJobs.forEach((job, index) => {
        statusMessage += `**${index + 1}. ${job.jobId}**\n`;
        statusMessage += `   ${getStatusEmoji(job.status)} Status: ${job.status.toUpperCase()}\n`;
        statusMessage += `   📅 Started: ${new Date(job.startTime).toLocaleString()}\n`;
        statusMessage += `   📊 Progress: ${job.progress}%\n`;
        statusMessage += `   💬 ${job.message}\n`;
        
        if (job.endTime) {
          statusMessage += `   🏁 Completed: ${new Date(job.endTime).toLocaleString()}\n`;
        }
        
        if (job.error) {
          statusMessage += `   ❌ Error: ${job.error}\n`;
        }
        
        statusMessage += `\n`;
      });
      
      statusMessage += `ℹ️ **Tip**: Use \`salesforce_backup_status\` with a specific \`job_id\` to get detailed information about a single job.`;

      return {
        content: [{
          type: "text",
          text: statusMessage
        }]
      };
    }

  } catch (error) {
    logger.log('Backup status error:', error);
    
    return {
      content: [{
        type: "text",
        text: `❌ **Error checking backup status**: ${error.message}\n\nPlease check that the backup system is properly configured.`
      }]
    };
  }
}

/**
 * Helper function to get status emoji
 */
function getStatusEmoji(status) {
  const emojis = {
    'starting': '🚀',
    'running': '⚡',
    'completed': '✅',
    'failed': '❌'
  };
  return emojis[status] || '❓';
}

export const BACKUP_TOOLS = {
  salesforce_backup: {
    name: "salesforce_backup",
    description: "Start comprehensive backups of Salesforce data including all file attachments. Runs asynchronously in background - returns immediately with job ID. Check progress with salesforce_backup_status.",
    inputSchema: {
      type: "object",
      properties: {
        backup_type: {
          type: "string",
          enum: ["full", "incremental", "files_only"],
          description: "Type of backup to perform: 'full' backs up everything, 'incremental' backs up changes since a date, 'files_only' backs up just attachments",
          default: "incremental"
        },
        include_files: {
          type: "boolean",
          description: "Include modern Files (ContentDocument/ContentVersion) in backup",
          default: true
        },
        include_attachments: {
          type: "boolean", 
          description: "Include legacy Attachment files in backup",
          default: true
        },
        include_documents: {
          type: "boolean",
          description: "Include Document object files in backup", 
          default: true
        },
        objects_filter: {
          type: "array",
          items: { type: "string" },
          description: "Specific objects to backup (empty array = all objects). Example: ['Account', 'Contact', 'CustomObject__c']",
          default: []
        },
        since_date: {
          type: "string",
          description: "ISO date for incremental backup - only backup records modified after this date. Format: YYYY-MM-DDTHH:mm:ss.sssZ",
          default: null
        },
        compression: {
          type: "boolean",
          description: "Compress backup files with gzip to save space",
          default: false
        },
        parallel_downloads: {
          type: "number",
          description: "Number of parallel file downloads (1-10). Higher values = faster but more API usage",
          default: 5,
          minimum: 1,
          maximum: 10
        }
      }
    }
  },
  
  salesforce_backup_list: {
    name: "salesforce_backup_list",
    description: "List all available Salesforce backups with their details including timestamp, duration, file counts, and sizes",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  
  salesforce_backup_status: {
    name: "salesforce_backup_status",
    description: "Check the status of Salesforce backup jobs. Monitor running, completed, or failed backup operations. Use without parameters to see all jobs, or specify a job_id to get detailed status of a specific backup job.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Optional: Specific backup job ID to check status for. If not provided, shows status of all backup jobs."
        }
      }
    }
  }
};
