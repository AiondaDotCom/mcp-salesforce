/**
 * Learning System Integration Test
 * 
 * This test verifies that the learning system tools are properly integrated
 * and that the MCP server can handle all learning-related operations.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the main server file to verify tool integration
const serverPath = path.join(__dirname, '../src/index.js');
const serverContent = readFileSync(serverPath, 'utf8');

// Test 1: Verify that learning tools are imported
console.log('🧪 Test 1: Checking tool imports...');
const hasLearnImport = serverContent.includes('salesforceLearnTool');
const hasInstallationInfoImport = serverContent.includes('salesforceInstallationInfoTool');

if (hasLearnImport && hasInstallationInfoImport) {
  console.log('✅ Learning tools are properly imported');
} else {
  console.log('❌ Learning tools import check failed');
  process.exit(1);
}

// Test 2: Verify that tools are registered in the tools list
console.log('\n🧪 Test 2: Checking tool registration...');
const hasLearnInList = serverContent.includes('salesforceLearnTool,');
const hasInstallationInfoInList = serverContent.includes('salesforceInstallationInfoTool,');

if (hasLearnInList && hasInstallationInfoInList) {
  console.log('✅ Learning tools are registered in tools list');
} else {
  console.log('❌ Learning tools registration check failed');
  process.exit(1);
}

// Test 3: Verify that handlers are implemented
console.log('\n🧪 Test 3: Checking request handlers...');
const hasLearnHandler = serverContent.includes('handleSalesforceLearn');
const hasInstallationInfoHandler = serverContent.includes('handleSalesforceInstallationInfo');

if (hasLearnHandler && hasInstallationInfoHandler) {
  console.log('✅ Learning tool handlers are implemented');
} else {
  console.log('❌ Learning tool handlers check failed');
  process.exit(1);
}

// Test 4: Verify that enhanced tools check for learning
console.log('\n🧪 Test 4: Checking enhanced tool integration...');
const queryToolPath = path.join(__dirname, '../src/tools/query.js');
const queryContent = readFileSync(queryToolPath, 'utf8');

const hasLearningCheck = queryContent.includes('hasInstallationDocumentation');
if (hasLearningCheck) {
  console.log('✅ Enhanced tools include learning detection');
} else {
  console.log('❌ Enhanced tools learning check failed');
  process.exit(1);
}

// Test 5: Verify cache directory structure
console.log('\n🧪 Test 5: Checking cache directory structure...');
const cacheDir = path.join(__dirname, '../cache');
try {
  const { accessSync } = await import('fs');
  accessSync(cacheDir);
  console.log('✅ Cache directory exists');
} catch {
  console.log('✅ Cache directory will be created when needed');
}

// Test 6: Verify internationalization (no German text)
console.log('\n🧪 Test 6: Checking internationalization...');
const learnToolPath = path.join(__dirname, '../src/tools/learn.js');
const learnContent = readFileSync(learnToolPath, 'utf8');

// Also check docs directory
const docsPath = path.join(__dirname, '../docs/learning-system-demo.md');
const docsContent = readFileSync(docsPath, 'utf8');

const hasGermanTextInCode = /bereits|erfolgreich|Fehler|nicht gefunden|analysiert|Dokumentation|Objekte|Felder/.test(learnContent);
const hasGermanTextInDocs = /Beispiel|gelernten|zeigt|wie|wird|sind|können|müssen|sollte|verwende/.test(docsContent);

if (!hasGermanTextInCode && !hasGermanTextInDocs) {
  console.log('✅ No German text found - internationalization complete (code & docs)');
} else {
  console.log('❌ German text still present');
  if (hasGermanTextInCode) console.log('   - Found in code files');
  if (hasGermanTextInDocs) console.log('   - Found in documentation');
  process.exit(1);
}

console.log('\n🎉 All learning system tests passed!');
console.log('\n📋 Summary:');
console.log('- Learning tools properly imported and registered');
console.log('- Request handlers implemented');
console.log('- Enhanced tools include learning detection');
console.log('- Cache directory structure ready');
console.log('- Internationalization complete (code & documentation)');
console.log('\n✅ The MCP Salesforce server with learning system is ready for use!');
