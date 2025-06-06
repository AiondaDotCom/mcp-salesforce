/**
 * Salesforce Backup Manager - Core Implementation
 * 
 * This module provides the core backup functionality including
 * file attachment download from all three Salesforce file systems:
 * - Modern Files (ContentDocument/ContentVersion)
 * - Legacy Attachments 
 * - Documents
 * 
 * Supports both synchronous and asynchronous backup operations with
 * lock file management for background processing.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { debug as logger } from '../utils/debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Asynchronous Backup Job Manager
 * Manages background backup operations with lock files
 */

/**
 * Salesforce File Downloader Class
 * Handles downloading binary files from all Salesforce file systems
 */
export class SalesforceFileDownloader {
  constructor(salesforceClient, options = {}) {
    this.client = salesforceClient;
    this.parallelLimit = options.parallelLimit || 5;
    this.retryAttempts = options.retryAttempts || 3;
    this.downloadStats = {
      contentVersions: 0,
      attachments: 0,
      documents: 0,
      totalBytes: 0,
      errors: 0
    };
  }

  /**
   * Download ContentVersion file (Modern Files system)
   */
  async downloadContentVersion(contentVersionId, outputPath) {
    const endpoint = `/services/data/v58.0/sobjects/ContentVersion/${contentVersionId}/VersionData`;
    
    try {
      const result = await this.downloadBinaryFile(endpoint, outputPath);
      this.downloadStats.contentVersions++;
      this.downloadStats.totalBytes += result.size;
      return result;
    } catch (error) {
      this.downloadStats.errors++;
      throw new Error(`ContentVersion download failed for ${contentVersionId}: ${error.message}`);
    }
  }

  /**
   * Download Attachment file (Legacy system)
   */
  async downloadAttachment(attachmentId, outputPath) {
    const endpoint = `/services/data/v58.0/sobjects/Attachment/${attachmentId}/Body`;
    
    try {
      const result = await this.downloadBinaryFile(endpoint, outputPath);
      this.downloadStats.attachments++;
      this.downloadStats.totalBytes += result.size;
      return result;
    } catch (error) {
      this.downloadStats.errors++;
      throw new Error(`Attachment download failed for ${attachmentId}: ${error.message}`);
    }
  }

  /**
   * Download Document file (Legacy folder-based system)
   */
  async downloadDocument(documentId, outputPath) {
    const endpoint = `/services/data/v58.0/sobjects/Document/${documentId}/Body`;
    
    try {
      const result = await this.downloadBinaryFile(endpoint, outputPath);
      this.downloadStats.documents++;
      this.downloadStats.totalBytes += result.size;
      return result;
    } catch (error) {
      this.downloadStats.errors++;
      throw new Error(`Document download failed for ${documentId}: ${error.message}`);
    }
  }

  /**
   * Core binary file download logic with retry
   */
  async downloadBinaryFile(endpoint, outputPath) {
    await this.client.ensureValidConnection();
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Use fetch with proper authentication
        const response = await fetch(`${this.client.instanceUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${await this.client.tokenManager.getValidAccessToken()}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get binary data
        const arrayBuffer = await response.arrayBuffer();
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        // Write file to disk
        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
        
        return {
          success: true,
          size: arrayBuffer.byteLength,
          path: outputPath,
          attempt: attempt
        };
        
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Download multiple files in parallel with concurrency limit
   */
  async downloadFilesInParallel(fileList) {
    const results = [];
    
    // Process files in batches to respect parallel limit
    for (let i = 0; i < fileList.length; i += this.parallelLimit) {
      const batch = fileList.slice(i, i + this.parallelLimit);
      
      const batchPromises = batch.map(async (file) => {
        try {
          let result;
          
          switch (file.type) {
            case 'ContentVersion':
              result = await this.downloadContentVersion(file.id, file.outputPath);
              break;
            case 'Attachment':
              result = await this.downloadAttachment(file.id, file.outputPath);
              break;
            case 'Document':
              result = await this.downloadDocument(file.id, file.outputPath);
              break;
            default:
              throw new Error(`Unknown file type: ${file.type}`);
          }
          
          return { ...result, fileInfo: file };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            fileInfo: file
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Progress indication
      logger.log(`📁 Downloaded batch ${Math.floor(i / this.parallelLimit) + 1}/${Math.ceil(fileList.length / this.parallelLimit)} (${results.length}/${fileList.length} files)`);
    }
    
    return results;
  }

  /**
   * Get download statistics
   */
  getStats() {
    return {
      ...this.downloadStats,
      totalMB: Math.round(this.downloadStats.totalBytes / (1024 * 1024) * 100) / 100
    };
  }
}

/**
 * Salesforce Backup Manager Class
 * Orchestrates the complete backup process
 */
export class SalesforceBackupManager {
  constructor(salesforceClient, options = {}) {
    this.client = salesforceClient;
    
    // Resolve outputDirectory relative to project root, not current working directory
    const projectRoot = path.resolve(__dirname, '../..');
    const defaultOutputDir = path.join(projectRoot, 'backups');
    
    this.options = {
      outputDirectory: options.outputDirectory ? 
        (path.isAbsolute(options.outputDirectory) ? 
          options.outputDirectory : 
          path.resolve(projectRoot, options.outputDirectory)
        ) : defaultOutputDir,
      includeFiles: true,
      includeAttachments: true,
      includeDocuments: true,
      compression: false,
      parallelDownloads: 5,
      ...options
    };
    
    // Update outputDirectory in options to use resolved path
    this.options.outputDirectory = this.options.outputDirectory;
    
    this.downloader = new SalesforceFileDownloader(this.client, {
      parallelLimit: this.options.parallelDownloads
    });

    // Initialize job manager for asynchronous backups
    this.jobManager = new BackupJobManager(this.options.outputDirectory);
  }

  /**
   * Start an asynchronous backup job
   */
  async startAsyncBackup(backupType = 'incremental', sinceDate = null, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    return await this.jobManager.startBackupJob(this.client, {
      backupType,
      sinceDate,
      ...mergedOptions
    });
  }

  /**
   * Get status of all backup jobs (running and completed)
   */
  async getBackupJobStatuses() {
    return await this.jobManager.getJobStatuses();
  }

  /**
   * Check if a specific backup job is still running
   */
  async isBackupJobRunning(jobId) {
    return await this.jobManager.isJobRunning(jobId);
  }

  /**
   * Clean up old completed/failed job lock files
   */
  async cleanupOldBackupJobs(maxAgeHours = 24) {
    return await this.jobManager.cleanupOldJobs(maxAgeHours);
  }

  /**
   * Create a comprehensive backup
   */
  async createBackup(backupType = 'incremental', sinceDate = null) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.options.outputDirectory, `salesforce-backup-${timestamp}`);
    
    logger.log(`🚀 Starting ${backupType} backup...`);
    logger.log(`📁 Backup directory: ${backupDir}`);
    
    try {
      // Ensure base output directory exists
      await fs.mkdir(this.options.outputDirectory, { recursive: true });
      
      // Create backup directory structure
      await this.createBackupStructure(backupDir);
      
      // 1. Backup metadata (schemas, etc.)
      logger.log('\n📊 Backing up metadata...');
      await this.backupMetadata(backupDir);
      
      // 2. Backup object data
      logger.log('\n📋 Backing up object data...');
      await this.backupObjectData(backupDir, sinceDate);
      
      // 3. Backup files if enabled
      if (this.options.includeFiles || this.options.includeAttachments || this.options.includeDocuments) {
        logger.log('\n📎 Backing up file attachments...');
        await this.backupFiles(backupDir, sinceDate);
      }
      
      // 4. Create backup manifest
      logger.log('\n📝 Creating backup manifest...');
      await this.createBackupManifest(backupDir, startTime);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.log(`\n✅ Backup completed successfully in ${duration} seconds!`);
      logger.log(`📁 Backup location: ${backupDir}`);
      
      return {
        success: true,
        backupDirectory: backupDir,
        duration: duration,
        stats: this.downloader.getStats()
      };
      
    } catch (error) {
      logger.error(`❌ Backup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create backup directory structure
   */
  async createBackupStructure(backupDir) {
    const dirs = [
      path.join(backupDir, 'metadata'),
      path.join(backupDir, 'data'),
      path.join(backupDir, 'files', 'content-versions'),
      path.join(backupDir, 'files', 'attachments'),
      path.join(backupDir, 'files', 'documents'),
      path.join(backupDir, 'logs')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Backup Salesforce metadata (schemas, etc.)
   */
  async backupMetadata(backupDir) {
    // Get all available objects
    const objects = await this.client.describeGlobal();
    
    const metadata = {
      backupTimestamp: new Date().toISOString(),
      salesforceInstance: this.client.instanceUrl,
      apiVersion: this.client.version || '58.0',
      totalObjects: objects.length,
      objects: objects
    };
    
    await fs.writeFile(
      path.join(backupDir, 'metadata', 'objects-schema.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    logger.log(`   ✅ Saved metadata for ${objects.length} objects`);
  }

  /**
   * Backup object data
   */
  async backupObjectData(backupDir, sinceDate) {
    const objects = await this.client.describeGlobal();
    const dataObjects = objects.filter(obj => obj.queryable && !obj.name.endsWith('__History'));
    
    logger.log(`   📊 Backing up ${dataObjects.length} queryable objects...`);
    
    let backedUpObjects = 0;
    let totalRecords = 0;
    
    for (const obj of dataObjects) {
      try {
        // Get all queryable fields for this object
        const describe = await this.client.describe(obj.name);
        const queryableFields = describe.fields
          .filter(field => field.type !== 'base64' && field.name !== 'Body') // Exclude binary fields
          .map(field => field.name)
          .slice(0, 20); // Limit to first 20 fields to avoid query complexity
        
        const fieldList = queryableFields.length > 0 ? queryableFields.join(', ') : 'Id, Name';
        const whereClause = sinceDate ? `WHERE LastModifiedDate > ${sinceDate}` : '';
        const soql = `SELECT ${fieldList} FROM ${obj.name} ${whereClause} LIMIT 1000`;
        
        const result = await this.client.query(soql);
        
        if (result.records && result.records.length > 0) {
          await fs.writeFile(
            path.join(backupDir, 'data', `${obj.name}.json`),
            JSON.stringify(result.records, null, 2)
          );
          
          backedUpObjects++;
          totalRecords += result.records.length;
          logger.log(`   ✅ ${obj.name}: ${result.records.length} records (${queryableFields.length} fields)`);
        } else {
          logger.log(`   ℹ️ ${obj.name}: No records found`);
        }
        
      } catch (error) {
        logger.warn(`   ⚠️ ${obj.name}: ${error.message}`);
      }
    }
    
    logger.log(`   📈 Summary: ${backedUpObjects} objects, ${totalRecords} total records`);
  }

  /**
   * Backup all file attachments
   */
  async backupFiles(backupDir, sinceDate) {
    const fileList = [];
    
    // 1. Modern Files (ContentVersion)
    if (this.options.includeFiles) {
      logger.log('   📁 Discovering ContentVersion files...');
      try {
        const whereClause = sinceDate ? `WHERE LastModifiedDate > ${sinceDate} AND` : 'WHERE';
        const query = `SELECT Id, Title, FileType, ContentSize FROM ContentVersion ${whereClause} IsLatest = true LIMIT 2000`;
        
        const result = await this.client.query(query);
        
        for (const cv of result.records) {
          fileList.push({
            type: 'ContentVersion',
            id: cv.Id,
            name: cv.Title,
            fileType: cv.FileType,
            size: cv.ContentSize,
            outputPath: path.join(backupDir, 'files', 'content-versions', `${cv.Id}.${cv.FileType || 'bin'}`)
          });
        }
        
        logger.log(`   ✅ Found ${result.records.length} ContentVersion files`);
      } catch (error) {
        logger.warn(`   ⚠️ ContentVersion query failed: ${error.message}`);
      }
    }
    
    // 2. Legacy Attachments
    if (this.options.includeAttachments) {
      logger.log('   📎 Discovering Attachment files...');
      try {
        const whereClause = sinceDate ? `WHERE LastModifiedDate > ${sinceDate}` : '';
        const query = `SELECT Id, Name, ContentType, BodyLength FROM Attachment ${whereClause} LIMIT 1000`;
        
        const result = await this.client.query(query);
        
        for (const att of result.records) {
          const extension = this.getFileExtension(att.ContentType);
          fileList.push({
            type: 'Attachment',
            id: att.Id,
            name: att.Name,
            contentType: att.ContentType,
            size: att.BodyLength,
            outputPath: path.join(backupDir, 'files', 'attachments', `${att.Id}${extension}`)
          });
        }
        
        logger.log(`   ✅ Found ${result.records.length} Attachment files`);
      } catch (error) {
        logger.warn(`   ⚠️ Attachment query failed: ${error.message}`);
      }
    }
    
    // 3. Documents
    if (this.options.includeDocuments) {
      logger.log('   📄 Discovering Document files...');
      try {
        const whereClause = sinceDate ? `WHERE LastModifiedDate > ${sinceDate}` : '';
        const query = `SELECT Id, Name, Type, BodyLength FROM Document ${whereClause} LIMIT 1000`;
        
        const result = await this.client.query(query);
        
        for (const doc of result.records) {
          const extension = this.getFileExtension(doc.Type);
          fileList.push({
            type: 'Document',
            id: doc.Id,
            name: doc.Name,
            contentType: doc.Type,
            size: doc.BodyLength,
            outputPath: path.join(backupDir, 'files', 'documents', `${doc.Id}${extension}`)
          });
        }
        
        logger.log(`   ✅ Found ${result.records.length} Document files`);
      } catch (error) {
        logger.warn(`   ⚠️ Document query failed: ${error.message}`);
      }
    }
    
    // Download all files
    if (fileList.length > 0) {
      logger.log(`\n   📥 Downloading ${fileList.length} files...`);
      const downloadResults = await this.downloader.downloadFilesInParallel(fileList);
      
      const successful = downloadResults.filter(r => r.success).length;
      const failed = downloadResults.filter(r => !r.success).length;
      
      logger.log(`   ✅ Successfully downloaded: ${successful} files`);
      if (failed > 0) {
        logger.warn(`   ❌ Failed downloads: ${failed} files`);
      }
      
      // Save file manifest
      await fs.writeFile(
        path.join(backupDir, 'metadata', 'file-manifest.json'),
        JSON.stringify({
          totalFiles: fileList.length,
          downloadResults: downloadResults,
          stats: this.downloader.getStats()
        }, null, 2)
      );
    } else {
      logger.log('   ℹ️ No files found to backup');
    }
  }

  /**
   * Create backup manifest with summary
   */
  async createBackupManifest(backupDir, startTime) {
    const endTime = Date.now();
    const stats = this.downloader.getStats();
    
    const manifest = {
      backupInfo: {
        timestamp: new Date().toISOString(),
        type: 'comprehensive',
        duration: Math.round((endTime - startTime) / 1000),
        salesforceInstance: this.client.instanceUrl
      },
      options: this.options,
      downloadStats: stats,
      directories: {
        metadata: 'metadata/',
        data: 'data/',
        files: 'files/',
        logs: 'logs/'
      }
    };
    
    await fs.writeFile(
      path.join(backupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  /**
   * Helper: Get file extension from content type
   */
  getFileExtension(contentType) {
    const typeMap = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'text/plain': '.txt',
      'text/csv': '.csv'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Start an asynchronous backup that runs in the background
   * Returns immediately with job information
   */
  async startAsyncBackup(backupType = 'incremental', sinceDate = null, options = {}) {
    const jobManager = new BackupJobManager(options);
    
    const jobOptions = {
      ...this.options,
      backupType,
      sinceDate,
      ...options
    };
    
    return await jobManager.startBackupJob(this.client, jobOptions);
  }

  /**
   * Get status of all backup jobs
   */
  async getBackupJobStatuses() {
    const jobManager = new BackupJobManager();
    return await jobManager.getJobStatuses(this.options.outputDirectory);
  }

  /**
   * Get status of a specific backup job
   */
  async getBackupJobStatus(jobId) {
    const jobManager = new BackupJobManager();
    return await jobManager.getJobStatus(jobId, this.options.outputDirectory);
  }
}

/**
 * Asynchronous Backup Job Manager
 * Handles non-blocking backup operations with progress tracking
 */
export class BackupJobManager {
  constructor(options = {}) {
    this.cleanupDelay = options.testMode ? 100 : 5000; // Faster cleanup in test mode
  }

  /**
   * Start an asynchronous backup job
   * Returns immediately with job information
   */
  async startBackupJob(salesforceClient, options = {}) {
    const jobId = this.generateJobId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(options.outputDirectory || 'backups', `backup-${timestamp}`);
    const lockFilePath = path.join(options.outputDirectory || 'backups', `${jobId}.lock`);

    // Ensure output directory exists
    await fs.mkdir(options.outputDirectory || 'backups', { recursive: true });

    // Create initial lock file
    const lockFile = {
      jobId,
      startTime: new Date().toISOString(),
      status: 'starting',
      message: 'Initializing backup job...',
      progress: 0,
      backupDirectory: backupDir,
      options: {
        backupType: options.backupType || 'incremental',
        includeFiles: options.includeFiles !== false,
        includeAttachments: options.includeAttachments !== false,
        includeDocuments: options.includeDocuments !== false
      },
      pid: process.pid,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(lockFilePath, JSON.stringify(lockFile, null, 2));

    // Start background backup using setImmediate for non-blocking execution
    setImmediate(() => {
      this.runBackgroundBackup(salesforceClient, jobId, backupDir, lockFilePath, options)
        .catch(async (error) => {
          // Update lock file with error status
          const errorLockFile = {
            ...lockFile,
            status: 'failed',
            message: `Backup failed: ${error.message}`,
            progress: 0,
            error: error.message,
            lastUpdated: new Date().toISOString(),
            endTime: new Date().toISOString()
          };
          
          try {
            await fs.writeFile(lockFilePath, JSON.stringify(errorLockFile, null, 2));
          } catch (writeError) {
            logger.log(`Failed to update lock file: ${writeError.message}`);
          }
          
          // Schedule cleanup
          setTimeout(async () => {
            try {
              await fs.unlink(lockFilePath);
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          }, this.cleanupDelay);
        });
    });

    return {
      jobId,
      status: 'started',
      message: 'Backup job started successfully. Running in background.',
      backupDirectory: backupDir,
      lockFile: lockFilePath
    };
  }

  /**
   * Execute backup with real-time progress tracking
   */
  async executeBackupWithProgress(backupManager, lockFilePath, options) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(backupManager.options.outputDirectory, `salesforce-backup-${timestamp}`);
    
    try {
      // Ensure base output directory exists
      await fs.mkdir(backupManager.options.outputDirectory, { recursive: true });
      
      // Create backup directory structure
      await backupManager.createBackupStructure(backupDir);
      
      // Phase 1: Backup metadata (10-30%)
      await this.updateLockFile(lockFilePath, {
        status: 'running',
        message: 'Backing up metadata...',
        progress: 10
      });
      
      await backupManager.backupMetadata(backupDir);
      
      await this.updateLockFile(lockFilePath, {
        message: 'Metadata backup completed',
        progress: 30
      });
      
      // Phase 2: Backup object data (30-60%)
      await this.updateLockFile(lockFilePath, {
        message: 'Backing up object data...',
        progress: 35
      });
      
      await backupManager.backupObjectData(backupDir, options.sinceDate);
      
      await this.updateLockFile(lockFilePath, {
        message: 'Object data backup completed',
        progress: 60
      });
      
      // Phase 3: Backup files if enabled (60-85%)
      if (backupManager.options.includeFiles || backupManager.options.includeAttachments || backupManager.options.includeDocuments) {
        await this.updateLockFile(lockFilePath, {
          message: 'Downloading files...',
          progress: 65
        });
        
        await backupManager.backupFiles(backupDir, options.sinceDate);
        
        await this.updateLockFile(lockFilePath, {
          message: 'File downloads completed',
          progress: 85
        });
      } else {
        await this.updateLockFile(lockFilePath, {
          message: 'Skipping file downloads (disabled)',
          progress: 85
        });
      }
      
      // Phase 4: Create backup manifest (85-100%)
      await this.updateLockFile(lockFilePath, {
        message: 'Creating backup manifest...',
        progress: 90
      });
      
      const stats = await backupManager.createBackupManifest(backupDir, startTime);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      return {
        success: true,
        backupDirectory: backupDir,
        duration: duration,
        stats: stats
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Run the actual backup process in the background
   */
  async runBackgroundBackup(salesforceClient, jobId, backupDir, lockFilePath, options) {
    try {
      const backupManager = new SalesforceBackupManager(salesforceClient, {
        outputDirectory: path.dirname(backupDir),
        includeFiles: options.includeFiles !== false,
        includeAttachments: options.includeAttachments !== false,
        includeDocuments: options.includeDocuments !== false,
        compression: options.compression || false,
        parallelDownloads: options.parallelDownloads || 5,
        objectsFilter: options.objectsFilter || []
      });

      // Execute the backup with real progress tracking
      const result = await this.executeBackupWithProgress(backupManager, lockFilePath, options);

      // Complete the job
      await this.updateLockFile(lockFilePath, {
        status: 'completed',
        message: 'Backup completed successfully!',
        progress: 100,
        endTime: new Date().toISOString(),
        result: {
          backupDirectory: result.backupDirectory,
          duration: result.duration,
          stats: result.stats
        }
      });

      // Schedule cleanup of lock file
      setTimeout(async () => {
        try {
          await fs.unlink(lockFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }, this.cleanupDelay);

      return result;

    } catch (error) {
      // Update lock file with error
      await this.updateLockFile(lockFilePath, {
        status: 'failed',
        message: `Backup failed: ${error.message}`,
        progress: 0,
        error: error.message,
        endTime: new Date().toISOString()
      });

      // Schedule cleanup
      setTimeout(async () => {
        try {
          await fs.unlink(lockFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }, this.cleanupDelay);

      throw error;
    }
  }

  /**
   * Update lock file with new status information
   */
  async updateLockFile(lockFilePath, updates) {
    try {
      const currentData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
      const updatedData = {
        ...currentData,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(lockFilePath, JSON.stringify(updatedData, null, 2));
    } catch (error) {
      logger.log(`Failed to update lock file ${lockFilePath}: ${error.message}`);
    }
  }

  /**
   * Get status of all backup jobs
   */
  async getJobStatuses(backupDir = 'backups') {
    try {
      const files = await fs.readdir(backupDir);
      const lockFiles = files.filter(file => file.endsWith('.lock'));
      
      const jobs = [];
      for (const lockFile of lockFiles) {
        try {
          const lockFilePath = path.join(backupDir, lockFile);
          const lockData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
          jobs.push(lockData);
        } catch (error) {
          // Skip invalid lock files
        }
      }
      
      return jobs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get status of a specific job
   */
  async getJobStatus(jobId, backupDir = 'backups') {
    try {
      const lockFilePath = path.join(backupDir, `${jobId}.lock`);
      const lockData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
      return lockData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a specific job is currently running
   */
  async isJobRunning(jobId, backupDir = 'backups') {
    try {
      const lockFilePath = path.join(backupDir, `${jobId}.lock`);
      const lockData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
      return lockData.status === 'running';
    } catch (error) {
      // If lock file doesn't exist or can't be read, job is not running
      return false;
    }
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `salesforce-backup-${timestamp}`;
  }

  /**
   * Clean up old completed job lock files
   */
  async cleanupOldJobs(backupDir = 'backups', maxAgeHours = 24) {
    try {
      const files = await fs.readdir(backupDir);
      const lockFiles = files.filter(file => file.endsWith('.lock'));
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      for (const lockFile of lockFiles) {
        try {
          const lockFilePath = path.join(backupDir, lockFile);
          const lockData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
          
          // Clean up completed or failed jobs older than cutoff
          if ((lockData.status === 'completed' || lockData.status === 'failed') &&
              new Date(lockData.endTime).getTime() < cutoffTime) {
            await fs.unlink(lockFilePath);
          }
        } catch (error) {
          // Skip invalid lock files
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
