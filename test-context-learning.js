#!/usr/bin/env node

/**
 * Test Script for Salesforce Context Learning Tool
 * 
 * This script demonstrates the new context learning functionality
 * that helps the AI remember user information across sessions.
 */

import { salesforceLearnContextTool, handleSalesforceLearnContext } from './src/tools/learn-context.js';

console.log('🧪 Testing Salesforce Context Learning Tool\n');
console.log('============================================================\n');

async function testContextLearning() {
  try {
    // Test 1: Show current context (should be empty initially)
    console.log('1️⃣ Testing: Current Context Status');
    console.log('--------------------------------------------------');
    const currentContext = await handleSalesforceLearnContext({ action: 'show_context' });
    console.log(currentContext.content[0].text);
    console.log('\n');

    // Test 2: Start interview
    console.log('2️⃣ Testing: Starting Context Interview');
    console.log('--------------------------------------------------');
    const interview = await handleSalesforceLearnContext({ action: 'start_interview' });
    console.log(interview.content[0].text);
    console.log('\n');

    // Test 3: Answer first question (simulate user input)
    console.log('3️⃣ Testing: Answering Personal Question');
    console.log('--------------------------------------------------');
    const answer1 = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'personal_name',
      answer: 'Max Mustermann'
    });
    console.log(answer1.content[0].text);
    console.log('\n');

    // Test 4: Answer business question
    console.log('4️⃣ Testing: Answering Business Question');
    console.log('--------------------------------------------------');
    const answer2 = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'personal_email',
      answer: 'max.mustermann@example.com'
    });
    console.log(answer2.content[0].text);
    console.log('\n');

    // Test 5: Continue with role question
    console.log('5️⃣ Testing: Answering Role Question');
    console.log('--------------------------------------------------');
    const answer3 = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'personal_role',
      answer: 'Senior Sales Manager'
    });
    console.log(answer3.content[0].text);
    console.log('\n');

    // Test 6: Answer company question
    console.log('6️⃣ Testing: Answering Company Question');
    console.log('--------------------------------------------------');
    const answer4 = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'business_company',
      answer: 'Mustermann GmbH'
    });
    console.log(answer4.content[0].text);
    console.log('\n');

    // Test 7: Answer industry question
    console.log('7️⃣ Testing: Answering Industry Question');
    console.log('--------------------------------------------------');
    const answer5 = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'business_industry',
      answer: 'Software & Technology'
    });
    console.log(answer5.content[0].text);
    console.log('\n');

    // Test 8: Answer business focus question (should complete interview)
    console.log('8️⃣ Testing: Completing Interview');
    console.log('--------------------------------------------------');
    const answer6 = await handleSalesforceLearnContext({ 
      action: 'answer_question',
      question_id: 'business_focus',
      answer: 'Wir entwickeln Enterprise-Software-Lösungen für mittelständische Unternehmen, mit Fokus auf CRM-Integration und Automatisierung von Geschäftsprozessen.'
    });
    console.log(answer6.content[0].text);
    console.log('\n');

    // Test 9: Show complete context
    console.log('9️⃣ Testing: Complete Context Overview');
    console.log('--------------------------------------------------');
    const finalContext = await handleSalesforceLearnContext({ action: 'show_context' });
    console.log(finalContext.content[0].text);
    console.log('\n');

    // Test 10: Test intelligent questions (if Salesforce data is available)
    console.log('🔟 Testing: Intelligent Questions');
    console.log('--------------------------------------------------');
    const intelligentQuestions = await handleSalesforceLearnContext({ action: 'suggest_questions' });
    console.log(intelligentQuestions.content[0].text);
    console.log('\n');

    console.log('✅ All Context Learning Tests Completed Successfully!');
    console.log('\n🎉 The context learning tool is ready to help users maintain');
    console.log('   personal and business context across AI sessions!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testContextLearning();
