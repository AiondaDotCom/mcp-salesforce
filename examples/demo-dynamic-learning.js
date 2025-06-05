#!/usr/bin/env node

/**
 * Demo: Dynamic Context Learning System
 * 
 * This demo shows how the AI can now dynamically store any learnings
 * about the user without being limited to predefined context structures.
 */

import { handleSalesforceLearnContext } from './src/tools/learn-context.js';

console.log('🧠 DYNAMIC CONTEXT LEARNING DEMO');
console.log('================================\n');

async function runDemo() {
  try {
    console.log('📋 Current context before dynamic learning:');
    const initialContext = await handleSalesforceLearnContext({ action: "show_context" });
    console.log(initialContext.content[0].text);
    console.log('\n' + '='.repeat(80) + '\n');

    // Example 1: Store personal preferences
    console.log('Example 1: Storing personal communication preferences');
    const result1 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "personal",
      key: "communication_preference",
      value: "Prefers detailed technical explanations with code examples. Likes German language for UI elements but English for technical terms."
    });
    console.log(result1.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 2: Store business insights
    console.log('Example 2: Storing business-specific insights');
    const result2 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "business",
      key: "peak_business_hours",
      value: "Busiest recruitment periods are Q1 (January-March) and Q4 (October-December). Summer months (June-August) are typically slower."
    });
    console.log(result2.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 3: Store technical preferences in a new dynamic section
    console.log('Example 3: Creating a new "Technical Preferences" section');
    const result3 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "Technical Preferences",  // This will become 'technical_preferences'
      key: "preferred_field_naming",
      value: "Uses German field labels but English API names. Prefers descriptive names like 'Stundensatz_Remote__c' rather than abbreviations."
    });
    console.log(result3.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 4: Store workflow patterns in another new section
    console.log('Example 4: Creating a "Workflow Patterns" section');
    const result4 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "Workflow Patterns",
      key: "automation_preferences",
      value: "Prefers automated processes for routine tasks but manual approval for financial transactions above €1000. Uses DocuSign for all contracts."
    });
    console.log(result4.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 5: Store debugging approach in personal section
    console.log('Example 5: Storing troubleshooting context in personal section');
    const result5 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "personal",
      key: "troubleshooting_approach",
      value: "Prefers step-by-step debugging. Likes to understand the 'why' behind solutions. Often works late evenings (after 18:00 CET)."
    });
    console.log(result5.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 6: Create a security preferences section
    console.log('Example 6: Creating a "Security Settings" section');
    const result6 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "Security Settings",
      key: "access_control_preferences",
      value: "Strict role-based permissions. External users get read-only access. All admin actions require approval workflow."
    });
    console.log(result6.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 7: Try to overwrite without permission (should warn)
    console.log('Example 7: Attempting to overwrite existing key (should warn)');
    const result7 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "personal",
      key: "communication_preference",
      value: "NEW VALUE - this should be blocked without overwrite=true"
    });
    console.log(result7.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 8: Overwrite with permission
    console.log('Example 8: Overwriting with explicit permission');
    const result8 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "personal",
      key: "communication_preference",
      value: "Updated: Prefers detailed technical explanations with code examples. Likes German language for UI elements but English for technical terms. Also appreciates visual diagrams for complex data relationships.",
      overwrite: true
    });
    console.log(result8.content[0].text);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Example 9: Test section name cleaning with special characters
    console.log('Example 9: Testing section name cleaning with special characters');
    const result9 = await handleSalesforceLearnContext({
      action: "store_learning",
      section: "Integration & API Preferences!",  // Should become 'integration_api_preferences'
      key: "rate_limiting_approach",
      value: "Conservative API usage: max 50 calls per minute. Implements exponential backoff for failed requests."
    });
    console.log(result9.content[0].text);
    console.log('\n' + '='.repeat(80) + '\n');

    // Show final context with all dynamic learnings
    console.log('📋 Final context after dynamic learning:');
    const finalContext = await handleSalesforceLearnContext({ action: "show_context" });
    console.log(finalContext.content[0].text);

    console.log('\n🎉 DEMO COMPLETE!');
    console.log('\nThe AI can now store any learnings in completely dynamic sections.');
    console.log('- Sections are created automatically with descriptive names');
    console.log('- Section names are cleaned and standardized');
    console.log('- No predefined structure limitations');
    console.log('- All information is preserved across sessions in salesforce-context.json');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo();
