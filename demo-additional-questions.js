#!/usr/bin/env node

/**
 * Demo: How to use additional questions after interview completion
 * This demonstrates the resolved functionality for the user
 */

import { handleSalesforceLearnContext } from './src/tools/learn-context.js';

async function demoAdditionalQuestions() {
  console.log('🎯 DEMO: Additional Questions After Interview Completion');
  console.log('=======================================================\n');

  console.log('This demo shows how you can now answer additional questions');
  console.log('even after your basic interview is marked as "completed".\n');

  try {
    // Show current status
    console.log('📊 Current Status:');
    console.log('------------------');
    const status = await handleSalesforceLearnContext({ action: 'show_context' });
    const statusText = status.content[0].text;
    
    // Extract key information
    const statusMatch = statusText.match(/Interview Status[\s\S]*?Status.*?(✅ Completed|🔄 In Progress)/);
    const dataModelMatch = statusText.match(/Data Model Context.*?(✅ Available|❌ Not captured)/);
    
    console.log(`Interview Status: ${statusMatch ? statusMatch[1] : 'Unknown'}`);
    console.log(`Data Model: ${dataModelMatch ? dataModelMatch[1] : 'Unknown'}`);
    console.log('');

    // Demo available additional questions
    console.log('💡 Available Additional Questions:');
    console.log('----------------------------------');
    console.log('✅ data_model_details - Describe your Salesforce data model');
    console.log('✅ custom_objects_purpose - Purpose of your custom objects');
    console.log('✅ business_processes - Main business processes in Salesforce');
    console.log('✅ integration_systems - External system integrations');
    console.log('✅ reporting_needs - Important reports and dashboards');
    console.log('');

    // Demo usage
    console.log('📝 Example Usage:');
    console.log('-----------------');
    console.log('You can now answer any of these questions like this:');
    console.log('');
    console.log('```json');
    console.log('{');
    console.log('  "action": "answer_question",');
    console.log('  "question_id": "data_model_details",');
    console.log('  "answer": "Our Salesforce data model includes..."');
    console.log('}');
    console.log('```');
    console.log('');

    // Show suggest_questions still works
    console.log('🧠 Intelligent Questions Still Available:');
    console.log('-----------------------------------------');
    console.log('The suggest_questions feature continues to work and will');
    console.log('generate smart questions based on your Salesforce installation.');
    console.log('');
    console.log('Usage: { "action": "suggest_questions" }');
    console.log('');

    // Key benefits
    console.log('🎉 Key Benefits:');
    console.log('----------------');
    console.log('✅ No need to restart interview to add more information');
    console.log('✅ Can answer questions at any time after basic interview');
    console.log('✅ Basic interview questions remain protected');
    console.log('✅ Clear guidance on what questions are available');
    console.log('✅ All information is stored and persists across sessions');
    console.log('');

    console.log('🚀 Your Interview Status: READY FOR ADDITIONAL QUESTIONS!');
    console.log('');
    console.log('Feel free to answer any of the additional questions above');
    console.log('to help me understand your Salesforce setup better.');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
demoAdditionalQuestions().catch(console.error);
