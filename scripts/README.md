# Development Scripts

This directory contains development, debugging, and testing scripts.

## Debug Scripts
- [`debug-learning.js`](./debug-learning.js) - Debug learning system
- [`debug-oauth-csrf.js`](./debug-oauth-csrf.js) - Debug OAuth CSRF issues

## Fix Scripts
- [`fix-oauth-csrf.js`](./fix-oauth-csrf.js) - OAuth CSRF fix script

## Test Scripts
- [`test-*.js`](./test-async-backup.js) - Various test scripts for different components
- [`minimal-test.js`](./minimal-test.js) - Minimal functionality test
- [`explore-sf.js`](./explore-sf.js) - Salesforce exploration script

## Usage

These scripts are primarily for development and debugging purposes. Most require:

1. Environment variables set in `.env`
2. Valid Salesforce authentication
3. Node.js dependencies installed

Example:
```bash
node scripts/minimal-test.js
```

**Note:** These scripts are development tools and not part of the main package functionality. Use the examples in [`../examples/`](../examples/) for production usage patterns.
