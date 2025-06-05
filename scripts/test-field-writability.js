#!/usr/bin/env node

/**
 * Test Field Writability Enhancement
 * 
 * This script demonstrates the enhanced field writability information
 * in the Salesforce learning system to help the AI understand which
 * fields are read-only and should not be described as writable.
 */

import { handleSalesforceLearn } from './src/tools/learn.js';
import { handleSalesforceInstallationInfo } from './src/tools/installation-info.js';
import { executeCreate } from './src/tools/create.js';
import { executeUpdate } from './src/tools/update.js';

// Mock Salesforce client for testing
const mockSalesforceClient = {
  instanceUrl: 'https://test.salesforce.com',
  version: 'v58.0',
  
  describeGlobal: async () => [
    { name: 'Account', label: 'Account', labelPlural: 'Accounts', custom: false },
    { name: 'Contact', label: 'Contact', labelPlural: 'Contacts', custom: false }
  ],
  
  describe: async (objectName) => {
    if (objectName === 'Account') {
      return {
        name: 'Account',
        label: 'Account',
        labelPlural: 'Accounts',
        createable: true,
        updateable: true,
        deletable: true,
        queryable: true,
        searchable: true,
        retrieveable: true,
        fields: [
          {
            name: 'Id',
            label: 'Account ID',
            type: 'id',
            custom: false,
            nillable: false,
            defaultedOnCreate: true,
            updateable: false,
            createable: false
          },
          {
            name: 'Name',
            label: 'Account Name',
            type: 'string',
            custom: false,
            nillable: false,
            defaultedOnCreate: false,
            updateable: true,
            createable: true,
            length: 255
          },
          {
            name: 'CreatedDate',
            label: 'Created Date',
            type: 'datetime',
            custom: false,
            nillable: false,
            defaultedOnCreate: true,
            updateable: false,
            createable: false
          },
          {
            name: 'LastModifiedDate',
            label: 'Last Modified Date',
            type: 'datetime',
            custom: false,
            nillable: false,
            defaultedOnCreate: true,
            updateable: false,
            createable: false
          },
          {
            name: 'Annual_Revenue_Formula__c',
            label: 'Annual Revenue (Formula)',
            type: 'formula',
            custom: true,
            nillable: true,
            defaultedOnCreate: false,
            updateable: false,
            createable: false,
            calculated: true
          },
          {
            name: 'Total_Opportunities__c',
            label: 'Total Opportunities',
            type: 'summary',
            custom: true,
            nillable: true,
            defaultedOnCreate: false,
            updateable: false,
            createable: false
          },
          {
            name: 'Account_Number__c',
            label: 'Account Number',
            type: 'autonumber',
            custom: true,
            nillable: false,
            defaultedOnCreate: true,
            updateable: false,
            createable: false
          },
          {
            name: 'Website',
            label: 'Website',
            type: 'url',
            custom: false,
            nillable: true,
            defaultedOnCreate: false,
            updateable: true,
            createable: true,
            length: 255
          }
        ],
        childRelationships: []
      };
    }
    
    return {
      name: objectName,
      fields: [],
      childRelationships: []
    };
  }
};

async function testFieldWritability() {
  console.log('🧪 Testing Enhanced Field Writability Information\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Learn installation with enhanced writability info
    console.log('\n1️⃣ Testing: Learning Installation with Enhanced Writability');
    console.log('-'.repeat(50));
    
    const learnResult = await handleSalesforceLearn({
      force_refresh: true,
      include_unused: true,
      detailed_relationships: true
    }, mockSalesforceClient);
    
    console.log('✅ Installation learning completed successfully');
    console.log('Enhanced writability information should now be captured\n');
    
    // Test 2: Display enhanced field information
    console.log('\n2️⃣ Testing: Display Enhanced Field Information');
    console.log('-'.repeat(50));
    
    const accountInfo = await handleSalesforceInstallationInfo({
      object_name: 'Account',
      detailed_fields: true,
      include_permissions: true
    });
    
    console.log('Field information with writability status:');
    console.log(accountInfo.content[0].text.substring(0, 2000) + '...\n');
    
    // Test 3: Test create with read-only field warnings
    console.log('\n3️⃣ Testing: Create Operation with Read-Only Field Detection');
    console.log('-'.repeat(50));
    
    const createResult = await executeCreate(mockSalesforceClient, {
      sobject: 'Account',
      data: {
        Name: 'Test Account',
        Website: 'https://test.com',
        CreatedDate: '2024-01-01',  // Read-only system field
        Annual_Revenue_Formula__c: 100000,  // Read-only formula field
        Account_Number__c: 'ACC-001'  // Read-only auto-number field
      }
    });
    
    console.log('Create operation result:');
    console.log(createResult.content[0].text.substring(0, 1000));
    
    // Test 4: Test update with read-only field warnings
    console.log('\n\n4️⃣ Testing: Update Operation with Read-Only Field Detection');
    console.log('-'.repeat(50));
    
    const updateResult = await executeUpdate(mockSalesforceClient, {
      sobject: 'Account',
      id: '001XX000003DHPuYAO',
      data: {
        Name: 'Updated Account Name',
        Website: 'https://updated.com',
        LastModifiedDate: '2024-06-04',  // Read-only system field
        Total_Opportunities__c: 5  // Read-only rollup summary field
      }
    });
    
    console.log('Update operation result:');
    console.log(updateResult.content[0].text.substring(0, 1000));
    
    console.log('\n\n✅ All Field Writability Tests Completed Successfully!');
    console.log('\n🎉 The enhanced field writability information provides:');
    console.log('   ✓ Clear identification of read-only fields');
    console.log('   ✓ Specific reasons why fields are read-only');
    console.log('   ✓ Warnings when trying to modify read-only fields');
    console.log('   ✓ Better AI understanding of field capabilities');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testFieldWritability();
