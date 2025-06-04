import fs from 'fs';
import path from 'path';
import { logger } from '../utils/debug.js';

class SalesforceTimeMachine {
  constructor(backupRootDirectory = './backups') {
    this.backupRootDirectory = backupRootDirectory;
  }

  /**
   * Find all available backups sorted by timestamp (newest first)
   */
  async getAllBackups() {
    try {
      if (!fs.existsSync(this.backupRootDirectory)) {
        return [];
      }

      const items = fs.readdirSync(this.backupRootDirectory);
      const backups = [];

      for (const item of items) {
        const itemPath = path.join(this.backupRootDirectory, item);
        if (fs.statSync(itemPath).isDirectory() && item.startsWith('salesforce-backup-')) {
          const manifestPath = path.join(itemPath, 'backup-manifest.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              backups.push({
                path: itemPath,
                timestamp: manifest.backupInfo.timestamp,
                date: new Date(manifest.backupInfo.timestamp),
                manifest: manifest
              });
            } catch (err) {
              logger.warn(`Could not read manifest for backup ${item}:`, err.message);
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.date - a.date);
    } catch (error) {
      throw new Error(`Failed to get backups: ${error.message}`);
    }
  }

  /**
   * Find backup closest to a specific date
   */
  async getBackupAtDate(targetDate) {
    const backups = await this.getAllBackups();
    if (backups.length === 0) {
      return null;
    }

    const target = new Date(targetDate);
    
    // Find the backup with timestamp <= target date (most recent backup before target)
    for (const backup of backups) {
      if (backup.date <= target) {
        return backup;
      }
    }

    // If no backup before target date, return the oldest backup
    return backups[backups.length - 1];
  }

  /**
   * Query historical data from a specific backup
   */
  async queryBackupData(backupPath, objectType, filters = {}) {
    try {
      const dataPath = path.join(backupPath, 'data', `${objectType}.json`);
      
      if (!fs.existsSync(dataPath)) {
        return {
          success: false,
          error: `No data found for object type '${objectType}' in backup`,
          availableObjects: this.getAvailableObjectTypes(backupPath)
        };
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      let filteredData = data;

      // Apply filters
      if (Object.keys(filters).length > 0) {
        filteredData = data.filter(record => {
          return Object.entries(filters).every(([field, value]) => {
            if (typeof value === 'string' && value.includes('*')) {
              // Wildcard matching
              const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
              return regex.test(record[field]);
            }
            return record[field] === value;
          });
        });
      }

      return {
        success: true,
        data: filteredData,
        count: filteredData.length,
        backupTimestamp: this.getBackupTimestamp(backupPath),
        objectType: objectType
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to query backup data: ${error.message}`
      };
    }
  }

  /**
   * Time Machine query: Find data as it existed at a specific point in time
   */
  async queryAtPointInTime(targetDate, objectType, filters = {}) {
    try {
      const backup = await this.getBackupAtDate(targetDate);
      
      if (!backup) {
        return {
          success: false,
          error: 'No backups found for the specified date range'
        };
      }

      const result = await this.queryBackupData(backup.path, objectType, filters);
      
      if (result.success) {
        result.snapshotDate = backup.timestamp;
        result.message = `Data as it existed on ${backup.timestamp}`;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Time Machine query failed: ${error.message}`
      };
    }
  }

  /**
   * Compare data between two points in time
   */
  async compareDataOverTime(startDate, endDate, objectType, filters = {}) {
    try {
      const startBackup = await this.getBackupAtDate(startDate);
      const endBackup = await this.getBackupAtDate(endDate);

      if (!startBackup || !endBackup) {
        return {
          success: false,
          error: 'Could not find backups for the specified date range'
        };
      }

      const startResult = await this.queryBackupData(startBackup.path, objectType, filters);
      const endResult = await this.queryBackupData(endBackup.path, objectType, filters);

      if (!startResult.success || !endResult.success) {
        return {
          success: false,
          error: 'Failed to query data from one or both backups'
        };
      }

      // Simple comparison - can be enhanced with more sophisticated diff logic
      const comparison = {
        startSnapshot: {
          date: startBackup.timestamp,
          count: startResult.count,
          data: startResult.data
        },
        endSnapshot: {
          date: endBackup.timestamp,
          count: endResult.count,
          data: endResult.data
        },
        changes: {
          countDifference: endResult.count - startResult.count,
          // Add more sophisticated change detection here
        }
      };

      return {
        success: true,
        comparison: comparison,
        objectType: objectType
      };
    } catch (error) {
      return {
        success: false,
        error: `Data comparison failed: ${error.message}`
      };
    }
  }

  /**
   * Search across all backups for historical changes to a specific record
   */
  async getRecordHistory(recordId, objectType) {
    try {
      const backups = await this.getAllBackups();
      const history = [];

      for (const backup of backups) {
        const result = await this.queryBackupData(backup.path, objectType, { Id: recordId });
        if (result.success && result.data.length > 0) {
          history.push({
            timestamp: backup.timestamp,
            data: result.data[0] // Should be only one record with specific ID
          });
        }
      }

      return {
        success: true,
        recordId: recordId,
        objectType: objectType,
        history: history,
        changesCount: history.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Record history query failed: ${error.message}`
      };
    }
  }

  /**
   * Get available object types from a backup
   */
  getAvailableObjectTypes(backupPath) {
    try {
      const dataPath = path.join(backupPath, 'data');
      if (!fs.existsSync(dataPath)) {
        return [];
      }

      return fs.readdirSync(dataPath)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get backup timestamp from manifest
   */
  getBackupTimestamp(backupPath) {
    try {
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return manifest.backupInfo.timestamp;
    } catch (error) {
      return null;
    }
  }

  /**
   * List all available Time Machine operations
   */
  getAvailableOperations() {
    return [
      {
        operation: 'query_at_point_in_time',
        description: 'Query data as it existed at a specific date',
        parameters: ['targetDate', 'objectType', 'filters (optional)']
      },
      {
        operation: 'compare_over_time',
        description: 'Compare data between two points in time',
        parameters: ['startDate', 'endDate', 'objectType', 'filters (optional)']
      },
      {
        operation: 'get_record_history',
        description: 'Get complete history of changes for a specific record',
        parameters: ['recordId', 'objectType']
      },
      {
        operation: 'list_backups',
        description: 'List all available backup snapshots',
        parameters: []
      }
    ];
  }
}

// MCP Tool implementations
const TIME_MACHINE_TOOLS = [
  {
    name: 'salesforce_time_machine_query',
    description: 'Query historical Salesforce data from backups using Time Machine functionality. Supports point-in-time queries, comparisons, and record history tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['query_at_point_in_time', 'compare_over_time', 'get_record_history', 'list_backups'],
          description: 'The Time Machine operation to perform'
        },
        targetDate: {
          type: 'string',
          description: 'Target date for point-in-time queries (ISO 8601 format)'
        },
        startDate: {
          type: 'string',
          description: 'Start date for comparison queries (ISO 8601 format)'
        },
        endDate: {
          type: 'string',
          description: 'End date for comparison queries (ISO 8601 format)'
        },
        objectType: {
          type: 'string',
          description: 'Salesforce object type to query (e.g., Account, Contact, ContentVersion)'
        },
        recordId: {
          type: 'string',
          description: 'Specific record ID for history tracking'
        },
        filters: {
          type: 'object',
          description: 'Optional filters to apply to the query (field-value pairs, supports wildcards with *)'
        },
        backupDirectory: {
          type: 'string',
          description: 'Path to backup directory (defaults to ./backups)'
        }
      },
      required: ['operation']
    }
  }
];

export {
  SalesforceTimeMachine,
  TIME_MACHINE_TOOLS
};
