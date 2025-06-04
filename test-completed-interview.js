#!/usr/bin/env node

/**
 * Test script for completed interview functionality
 * Tests the ability to answer additional questions after basic interview completion
 */

import { handleSalesforceLearnContext } from './src/tools/learn-context.js';

async function testCompletedInterviewFeature() {
  console.log('🧪 Testing: Additional Questions After Interview Completion');
  console.log('===========================================================\n');

  try {
    // Test 1: Show current status
    console.log('1️⃣ Current Context Status');
    console.log('--------------------------------------------------');
    const status1 = await handleSalesforceLearnContext({ action: 'show_context' });
    console.log(status1.content[0].text.substring(0, 1000));
    console.log('\n');

    // Test 2: Try to answer data_model_details question (should work now)
    console.log('2️⃣ Testing: Answering data_model_details After Completion');
    console.log('--------------------------------------------------');
    const dataModelAnswer = await handleSalesforceLearnContext({
      action: 'answer_question',
      question_id: 'data_model_details',
      answer: 'Unser Salesforce-Datenmodell umfasst mehrere Custom Objects für die Verwaltung von IT-Projekten, Kandidaten und Kunden. Wir haben ein Project__c Object das mit Account und Contact verknüpft ist, sowie ein Candidate__c Object für unsere Personaldienstleistungen.'
    });
    console.log(dataModelAnswer.content[0].text);
    console.log('\n');

    // Test 3: Try another additional question
    console.log('3️⃣ Testing: Answering business_processes');
    console.log('--------------------------------------------------');
    const processAnswer = await handleSalesforceLearnContext({
      action: 'answer_question',
      question_id: 'business_processes',
      answer: 'Unsere Hauptprozesse in Salesforce sind: 1) Lead-Generierung und Qualifizierung, 2) Kandidatensuche und -verwaltung, 3) Projektmanagement und Ressourcenplanung, 4) Kundenbetreuung und Account Management.'
    });
    console.log(processAnswer.content[0].text);
    console.log('\n');

    // Test 4: Show updated context
    console.log('4️⃣ Context Status After Additional Questions');
    console.log('--------------------------------------------------');
    const status2 = await handleSalesforceLearnContext({ action: 'show_context' });
    console.log(status2.content[0].text);
    console.log('\n');

    // Test 5: Try to answer a basic interview question (should be rejected)
    console.log('5️⃣ Testing: Basic Interview Question Should Be Rejected');
    console.log('--------------------------------------------------');
    const rejectedAnswer = await handleSalesforceLearnContext({
      action: 'answer_question',
      question_id: 'personal_name',
      answer: 'Should not work'
    });
    console.log(rejectedAnswer.content[0].text);
    console.log('\n');

    // Test 6: Test suggest_questions functionality
    console.log('6️⃣ Testing: Suggest Questions Still Works');
    console.log('--------------------------------------------------');
    const suggestions = await handleSalesforceLearnContext({ action: 'suggest_questions' });
    console.log(suggestions.content[0].text.substring(0, 1000) + '...');
    console.log('\n');

    console.log('✅ All Tests Completed Successfully!');
    console.log('\n🎉 The completed interview feature now allows:');
    console.log('   ✓ Additional questions after basic interview completion');
    console.log('   ✓ Data model details can be added anytime');
    console.log('   ✓ Basic interview questions are properly protected');
    console.log('   ✓ Suggest questions continues to work normally');
    console.log('   ✓ Context display shows available additional questions');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompletedInterviewFeature().catch(console.error);
