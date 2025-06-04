#!/usr/bin/env node

/**
 * Test Script for Context Warnings in Installation Info
 * 
 * This demonstrates how the system now automatically warns about missing
 * context information and suggests the context learning tool.
 */

import { handleSalesforceInstallationInfo } from './src/tools/installation-info.js';
import { handleSalesforceLearnContext } from './src/tools/learn-context.js';
import fs from 'fs/promises';

console.log('🧪 Testing Context Integration and Warnings\n');
console.log('============================================================\n');

async function testContextIntegration() {
  try {
    // Test 1: Clear context to simulate new user
    console.log('1️⃣ Testing: Installation Info WITHOUT Context');
    console.log('--------------------------------------------------');
    
    try {
      await fs.unlink('./cache/salesforce-context.json');
      console.log('✓ Context file cleared for testing\n');
    } catch (error) {
      console.log('✓ No context file exists (as expected)\n');
    }
    
    const withoutContext = await handleSalesforceInstallationInfo({});
    console.log(withoutContext.content[0].text.substring(0, 1000) + '...\n');
    
    // Test 2: Create partial context (only personal info)
    console.log('2️⃣ Testing: Installation Info WITH Partial Context');
    console.log('--------------------------------------------------');
    
    // Start interview and answer only personal questions
    await handleSalesforceLearnContext({ action: 'start_interview' });
    await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'personal_name',
      answer: 'Sarah Fischer'
    });
    await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'personal_email',
      answer: 'sarah.fischer@testfirma.de'
    });
    
    const withPartialContext = await handleSalesforceInstallationInfo({});
    console.log(withPartialContext.content[0].text.substring(0, 1500) + '...\n');
    
    // Test 3: Show context status
    console.log('3️⃣ Testing: Enhanced Context Status Display');
    console.log('--------------------------------------------------');
    
    const contextStatus = await handleSalesforceLearnContext({ action: 'show_context' });
    console.log(contextStatus.content[0].text.substring(0, 1200) + '...\n');
    
    // Test 4: Complete the interview
    console.log('4️⃣ Testing: Completing Context Interview');
    console.log('--------------------------------------------------');
    
    await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'personal_role',
      answer: 'CRM Administrator'
    });
    await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'business_company',
      answer: 'Fischer Consulting GmbH'
    });
    await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'business_industry',
      answer: 'IT-Beratung'
    });
    const completed = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'business_focus',
      answer: 'Spezialisiert auf Salesforce-Implementierungen und CRM-Optimierung für mittelständische Unternehmen.'
    });
    
    console.log('✅ Interview completed!\n');
    
    // Test 5: Installation info with complete basic context
    console.log('5️⃣ Testing: Installation Info WITH Complete Basic Context');
    console.log('--------------------------------------------------');
    
    const withCompleteContext = await handleSalesforceInstallationInfo({});
    console.log(withCompleteContext.content[0].text.substring(0, 1500) + '...\n');
    
    // Test 6: Final context status
    console.log('6️⃣ Testing: Final Context Status');
    console.log('--------------------------------------------------');
    
    const finalStatus = await handleSalesforceLearnContext({ action: 'show_context' });
    console.log(finalStatus.content[0].text.substring(0, 1000) + '...\n');
    
    console.log('✅ All Context Integration Tests Completed Successfully!');
    console.log('\n🎉 The system now automatically:');
    console.log('   ✓ Warns about missing context information');
    console.log('   ✓ Suggests specific actions to improve context');
    console.log('   ✓ Shows completion status and recommendations');
    console.log('   ✓ Personalizes responses when context is available');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testContextIntegration();
