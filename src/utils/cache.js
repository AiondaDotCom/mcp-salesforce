import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Cross-platform cache directory management
 * Works on Windows, macOS, and Linux
 */

// Cache directory in home directory - cross-platform
const CACHE_DIR = path.join(os.homedir(), '.mcp-salesforce-cache');

/**
 * Get the cache directory path
 * @returns {string} Cache directory path
 */
export function getCacheDir() {
  return CACHE_DIR;
}

/**
 * Get path to a file in the cache directory
 * @param {string} filename - Name of the file
 * @returns {string} Full path to the file
 */
export function getCacheFilePath(filename) {
  return path.join(CACHE_DIR, filename);
}

/**
 * Ensure cache directory exists
 * Creates the directory if it doesn't exist
 */
export async function ensureCacheDirectory() {
  try {
    await fs.access(CACHE_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * Check if cache directory exists
 * @returns {boolean} True if directory exists
 */
export async function cacheDirectoryExists() {
  try {
    await fs.access(CACHE_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all cache files
 * Removes all files in the cache directory but keeps the directory
 */
export async function clearCache() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    await Promise.all(files.map(file => fs.unlink(path.join(CACHE_DIR, file))));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get cache directory information
 * @returns {Object} Information about the cache directory
 */
export async function getCacheInfo() {
  try {
    const exists = await cacheDirectoryExists();
    if (!exists) {
      return {
        exists: false,
        path: CACHE_DIR,
        platform: os.platform(),
        homeDir: os.homedir()
      };
    }

    const files = await fs.readdir(CACHE_DIR);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(CACHE_DIR, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
    );

    return {
      exists: true,
      path: CACHE_DIR,
      platform: os.platform(),
      homeDir: os.homedir(),
      fileCount: files.length,
      files: fileStats
    };
  } catch (error) {
    return {
      exists: false,
      path: CACHE_DIR,
      platform: os.platform(),
      homeDir: os.homedir(),
      error: error.message
    };
  }
}