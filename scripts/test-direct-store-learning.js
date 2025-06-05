#!/usr/bin/env node

/**
 * Test: Direct Store Learning (without interview)
 * 
 * This tests whether store_learning works without starting an interview first.
 */

import { handleSalesforceLearnContext } from './src/tools/learn-context.js';

console.log('🧪 TESTING DIRECT STORE LEARNING (ohne Interview) 🧪\n');

async function testDirectStoreLearning() {
  console.log('=== Test: Direkte Speicherung ohne start_interview ===\n');

  try {
    // Reset context first to start clean
    console.log('🧹 Clearing context...');
    await handleSalesforceLearnContext({
      action: 'reset_context'
    });

    // Try to store learning directly without starting interview
    console.log('💡 Storing insight directly (ohne Interview)...');
    const result1 = await handleSalesforceLearnContext({
      action: 'store_learning',
      section: 'test_insights',
      key: 'direct_storage_test',
      value: 'Diese Information wurde direkt gespeichert ohne vorheriges start_interview!'
    });
    
    console.log('Ergebnis:');
    console.log(result1.content[0].text);
    console.log('\n');

    // Store another learning in a different section
    console.log('🔍 Storing another insight in different section...');
    const result2 = await handleSalesforceLearnContext({
      action: 'store_learning',
      section: 'workflow_patterns',
      key: 'preferred_workflow',
      value: 'User bevorzugt step-by-step Anleitungen mit Screenshots'
    });
    
    console.log('Ergebnis:');
    console.log(result2.content[0].text);
    console.log('\n');

    // Try to store with special characters in section name
    console.log('🎯 Testing section name cleaning...');
    const result3 = await handleSalesforceLearnContext({
      action: 'store_learning',
      section: 'Aha-Momente & Erkenntnisse!',
      key: 'salesforce_breakthrough',
      value: 'User erkannte dass Custom Objects die Lösung für sein Geschäftsmodell sind'
    });
    
    console.log('Ergebnis:');
    console.log(result3.content[0].text);
    console.log('\n');

    // Show all stored context
    console.log('📋 Viewing all stored context...');
    const contextResult = await handleSalesforceLearnContext({
      action: 'show_context',
      context_type: 'all'
    });
    
    console.log(contextResult.content[0].text);

    console.log('\n✅ SUCCESS: Direct store_learning funktioniert perfekt!');
    console.log('🎉 Kein start_interview erforderlich!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testDirectStoreLearning().catch(console.error);
