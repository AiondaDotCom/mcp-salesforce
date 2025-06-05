#!/usr/bin/env node

// Simple wrapper to run the main index.js file
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import and run the main module
const mainModule = path.join(__dirname, '..', 'src', 'index.js');
import(mainModule);
