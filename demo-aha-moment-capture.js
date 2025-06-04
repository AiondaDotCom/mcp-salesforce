#!/usr/bin/env node

/**
 * Demo: Enhanced Aha Moment Capture System
 * 
 * This demonstrates how the AI can now automatically capture breakthrough insights,
 * user frustrations, success patterns, and key realizations during conversations.
 */

import { handleSalesforceLearnContext } from './src/tools/learn-context.js';

console.log('🌟 SALESFORCE CONTEXT LEARNING - AHA MOMENT CAPTURE DEMO 🌟\n');

async function demonstrateAhaMomentCapture() {
  console.log('=== SCENARIO: During a conversation, the AI discovers key insights ===\n');

  // Simulate capturing an "Aha moment" when user realizes something important
  console.log('💡 AI captures: User just realized why their lead conversion is low...');
  await handleSalesforceLearnContext({
    action: 'store_learning',
    section: 'aha_moments',
    key: 'lead_conversion_breakthrough_realization',
    value: 'User discovered that leads are not being properly qualified before handoff from marketing to sales team. The "Ready for Sales" checkbox is being checked automatically by a workflow, not manually by marketing team reviewing lead quality. This explains the 15% conversion rate vs industry standard of 25%.'
  });

  // Capture a pain point discovered during troubleshooting
  console.log('😤 AI captures: User expressed frustration with current process...');
  await handleSalesforceLearnContext({
    action: 'store_learning',
    section: 'pain_points',
    key: 'opportunity_stage_management_frustration',
    value: 'User is frustrated that opportunities sit in "Proposal" stage for weeks without clear next steps. Sales reps forget to update stages regularly, causing inaccurate pipeline reporting. Manager has to manually chase updates every week.'
  });

  // Capture a successful pattern the user shared
  console.log('✅ AI captures: User shared what works well for them...');
  await handleSalesforceLearnContext({
    action: 'store_learning',
    section: 'success_patterns',
    key: 'effective_account_management_approach',
    value: 'User has great success with quarterly business reviews (QBRs) - creates custom report showing client usage trends, schedules 30-min video calls, and always comes with 2-3 specific improvement suggestions. This approach has led to 40% increase in upsell opportunities.'
  });

  // Capture a technical discovery made during system exploration
  console.log('🔬 AI captures: User discovered a technical insight...');
  await handleSalesforceLearnContext({
    action: 'store_learning',
    section: 'technical_discoveries',
    key: 'custom_field_performance_impact',
    value: 'User noticed that reports with more than 15 custom fields load significantly slower (8+ seconds vs 2 seconds). They\'ve started creating separate "detail" and "summary" report versions to improve user experience.'
  });

  // Capture workflow insight revealed during process discussion
  console.log('🔄 AI captures: User revealed workflow insight...');
  await handleSalesforceLearnContext({
    action: 'store_learning',
    section: 'workflow_insights',
    key: 'case_escalation_timing_discovery',
    value: 'User found that cases escalated within first 4 hours have 85% customer satisfaction vs 60% for cases escalated after 24 hours. They want to create an automatic escalation rule but need to figure out how to exclude "low priority" cases.'
  });

  // Capture user preference discovered through conversation
  console.log('⚡ AI captures: User preference revealed...');
  await handleSalesforceLearnContext({
    action: 'store_learning',
    section: 'preferences',
    key: 'communication_style_for_training',
    value: 'User strongly prefers step-by-step screenshots over video tutorials. They like to print instructions and follow along at their own pace. They get overwhelmed by too much information at once - prefer "just what I need right now" approach.'
  });

  console.log('\n=== VIEWING ALL CAPTURED INSIGHTS ===\n');
  
  // Show all stored context to see the insights
  const result = await handleSalesforceLearnContext({
    action: 'show_context',
    context_type: 'all'
  });
  
  console.log(result.content);

  console.log('\n=== SPECIFIC INSIGHT CATEGORIES ===\n');

  // Show just the aha moments
  console.log('🌟 Viewing just AHA MOMENTS:');
  const ahaResult = await handleSalesforceLearnContext({
    action: 'show_context',
    context_type: 'aha_moments'
  });
  console.log(ahaResult.content);

  console.log('\n😤 Viewing just PAIN POINTS:');
  const painResult = await handleSalesforceLearnContext({
    action: 'show_context',
    context_type: 'pain_points'
  });
  console.log(painResult.content);

  console.log('\n✅ Viewing just SUCCESS PATTERNS:');
  const successResult = await handleSalesforceLearnContext({
    action: 'show_context',
    context_type: 'success_patterns'
  });
  console.log(successResult.content);
}

// Run the demonstration
demonstrateAhaMomentCapture().catch(console.error);
