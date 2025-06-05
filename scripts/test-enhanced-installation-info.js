#!/usr/bin/env node

/**
 * Test Enhanced Salesforce Installation Info Tool
 * 
 * This script demonstrates the improved installation-info tool with
 * comprehensive data display from salesforce-installation.json
 */

import { handleSalesforceInstallationInfo } from './src/tools/installation-info.js';

async function testEnhancedInstallationInfo() {
  console.log('🧪 Testing Enhanced Salesforce Installation Info Tool\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: General overview with all details
    console.log('\n1️⃣ Testing: General Overview with Full Details');
    console.log('-'.repeat(50));
    const overviewResult = await handleSalesforceInstallationInfo({
      detailed_fields: true,
      include_relationships: true,
      include_permissions: true
    });
    
    console.log(overviewResult.content[0].text.substring(0, 1000) + '...\n');
    
    // Test 2: Specific object with complete information
    console.log('\n2️⃣ Testing: Specific Object (Account) with Complete Details');
    console.log('-'.repeat(50));
    const accountResult = await handleSalesforceInstallationInfo({
      object_name: 'Account',
      detailed_fields: true,
      include_relationships: true,
      include_permissions: true
    });
    
    console.log(accountResult.content[0].text.substring(0, 1500) + '...\n');
    
    // Test 3: Field search with detailed information
    console.log('\n3️⃣ Testing: Field Search with Detailed Information');
    console.log('-'.repeat(50));
    const fieldSearchResult = await handleSalesforceInstallationInfo({
      field_search: 'Name',
      detailed_fields: true,
      max_fields_per_object: 3
    });
    
    console.log(fieldSearchResult.content[0].text.substring(0, 1000) + '...\n');
    
    // Test 4: Custom objects only with relationships
    console.log('\n4️⃣ Testing: Custom Objects Only with Relationships');
    console.log('-'.repeat(50));
    const customResult = await handleSalesforceInstallationInfo({
      show_custom_only: true,
      include_relationships: true,
      detailed_fields: true
    });
    
    console.log(customResult.content[0].text.substring(0, 800) + '...\n');
    
    // Test 5: Demonstrate field limiting
    console.log('\n5️⃣ Testing: Field Limiting (max 5 fields per object)');
    console.log('-'.repeat(50));
    const limitedResult = await handleSalesforceInstallationInfo({
      object_name: 'Account',
      detailed_fields: true,
      max_fields_per_object: 5
    });
    
    console.log(limitedResult.content[0].text.substring(0, 1000) + '...\n');
    
    console.log('✅ All Enhanced Installation Info Tests Completed Successfully!');
    console.log('\n🎉 The tool now provides comprehensive, detailed information');
    console.log('   from all data available in salesforce-installation.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEnhancedInstallationInfo();
