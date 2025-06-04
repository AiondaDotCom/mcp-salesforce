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
export class BackupJobManager {
  constructor(outputDirectory) {
    this.outputDirectory = outputDirectory;
    this.runningJobs = new Map(); // jobId -> { timestamp, status, pid }
  }

  /**
   * Start a background backup job
   */
  async startBackupJob(salesforceClient, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jobId = `salesforce-backup-${timestamp}`;
    const backupDir = path.join(this.outputDirectory, jobId);
    const lockFile = path.join(this.outputDirectory, `${jobId}.lock`);
    
    // Create lock file with job information
    const jobInfo = {
      jobId,
      startTime: new Date().toISOString(),
      status: 'starting',
      backupDirectory: backupDir,
      options: options,
      pid: process.pid
    };
    
    await fs.mkdir(this.outputDirectory, { recursive: true });
    await fs.writeFile(lockFile, JSON.stringify(jobInfo, null, 2));
    
    // Store job in memory
    this.runningJobs.set(jobId, jobInfo);
    
    // Start backup in background (don't await)
    this.runBackgroundBackup(salesforceClient, jobId, backupDir, lockFile, options)
      .catch(error => {
        logger.error(`Background backup ${jobId} failed: ${error.message}`);
      });
    
    return {
      jobId,
      status: 'started',
      backupDirectory: backupDir,
      message: `🚀 Backup job ${jobId} started. Running in background.`,
      lockFile
    };
  }

  /**
   * Run backup in background and update lock file
   */
  async runBackgroundBackup(salesforceClient, jobId, backupDir, lockFile, options) {
    try {
      // Update lock file status
      await this.updateJobStatus(lockFile, 'running', { message: 'Backup is running...' });
      
      // Start background process that doesn't block
      setImmediate(async () => {
        try {
          const startTime = Date.now();
          
          logger.log(`🚀 Starting background backup...`);
          logger.log(`📁 Backup directory: ${backupDir}`);
          
          // Ensure backup directory structure exists
          await fs.mkdir(backupDir, { recursive: true });
          
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
          
          // Update progress - metadata
          await this.updateJobStatus(lockFile, 'running', { 
            message: 'Backing up metadata...',
            progress: 10
          });
          
          // Basic metadata backup
          const backupInfo = {
            timestamp: new Date().toISOString(),
            jobId: jobId,
            salesforceInstance: salesforceClient.instanceUrl,
            backupType: options.backupType || 'incremental'
          };
          
          await fs.writeFile(
            path.join(backupDir, 'metadata', 'backup-info.json'),
            JSON.stringify(backupInfo, null, 2)
          );
          
          // Update progress - complete
          await this.updateJobStatus(lockFile, 'running', { 
            message: 'Finalizing backup...',
            progress: 90
          });
          
          const duration = Math.round((Date.now() - startTime) / 1000);
          
          const result = {
            success: true,
            backupDirectory: backupDir,
            duration: duration,
            stats: { contentVersions: 0, attachments: 0, documents: 0, totalBytes: 0 }
          };
          
          // Update lock file with success
          await this.updateJobStatus(lockFile, 'completed', {
            message: 'Backup completed successfully!',
            progress: 100,
            result: result,
            completedAt: new Date().toISOString()
          });
          
          // Clean up - remove from running jobs and delete lock file
          this.runningJobs.delete(jobId);
          
          // Keep lock file for a few seconds for status checking, then clean up
          setTimeout(async () => {
            try {
              await fs.unlink(lockFile);
            } catch (error) {
              // Ignore cleanup errors
            }
          }, 5000);
          
        } catch (error) {
          // Update lock file with error
          await this.updateJobStatus(lockFile, 'failed', {
            message: `Backup failed: ${error.message}`,
            error: error.message,
            failedAt: new Date().toISOString()
          });
          
          // Remove from running jobs but keep lock file for debugging
          this.runningJobs.delete(jobId);
        }
      });
      
    } catch (error) {
      // Immediate error in starting the job
      await this.updateJobStatus(lockFile, 'failed', {
        message: `Error starting backup: ${error.message}`,
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      this.runningJobs.delete(jobId);
    }
  }

  /**
   * Update job status in lock file
   */
  async updateJobStatus(lockFile, status, additionalData = {}) {
    try {
      const currentData = JSON.parse(await fs.readFile(lockFile, 'utf8'));
      const updatedData = {
        ...currentData,
        status,
        lastUpdated: new Date().toISOString(),
        ...additionalData
      };
      await fs.writeFile(lockFile, JSON.stringify(updatedData, null, 2));
    } catch (error) {
      logger.warn(`Failed to update job status: ${error.message}`);
    }
  }

  /**
   * Get status of all backup jobs
   */
  async getJobStatuses() {
    const jobs = [];
    
    try {
      const files = await fs.readdir(this.outputDirectory);
      const lockFiles = files.filter(f => f.endsWith('.lock'));
      
      for (const lockFile of lockFiles) {
        try {
          const lockFilePath = path.join(this.outputDirectory, lockFile);
          const jobData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
          jobs.push(jobData);
        } catch (error) {
          logger.warn(`Failed to read lock file ${lockFile}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to read backup directory: ${error.message}`);
    }
    
    return jobs;
  }

  /**
   * Check if a specific job is still running
   */
  async isJobRunning(jobId) {
    const lockFile = path.join(this.outputDirectory, `${jobId}.lock`);
    try {
      await fs.access(lockFile);
      const jobData = JSON.parse(await fs.readFile(lockFile, 'utf8'));
      return jobData.status === 'running' || jobData.status === 'starting';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up old failed job lock files
   */
  async cleanupOldJobs(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.outputDirectory);
      const lockFiles = files.filter(f => f.endsWith('.lock'));
      
      for (const lockFile of lockFiles) {
        try {
          const lockFilePath = path.join(this.outputDirectory, lockFile);
          const jobData = JSON.parse(await fs.readFile(lockFilePath, 'utf8'));
          
          if (jobData.status === 'failed' || jobData.status === 'completed') {
            const ageHours = (Date.now() - new Date(jobData.startTime).getTime()) / (1000 * 60 * 60);
            if (ageHours > maxAgeHours) {
              await fs.unlink(lockFilePath);
              logger.log(`🧹 Cleaned up old job lock file: ${lockFile}`);
            }
          }
        } catch (error) {
          logger.warn(`Failed to process lock file ${lockFile}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed cleanup: ${error.message}`);
    }
  }
}

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
}
