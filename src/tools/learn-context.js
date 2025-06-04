/**
 * Salesforce Context Learning Tool
 * 
 * This tool learns personal and business context about the user and their
 * Salesforce data model relationships. It stores this information persistently
 * to provide better context-aware assistance across sessions.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getInstallationDocumentation, hasInstallationDocumentation } from './learn.js';
import { debug } from '../utils/debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_FILE = path.join(__dirname, '../../cache', 'salesforce-context.json');

export const salesforceLearnContextTool = {
  name: "salesforce_learn_context",
  description: "Learn and store personal/business context about the user and their Salesforce data model relationships. This helps provide better context-aware assistance across sessions. PROACTIVELY CAPTURE AHA MOMENTS: Whenever you discover something important about the user's workflow, business processes, preferences, challenges, or breakthrough insights during conversations, automatically use store_learning to preserve this knowledge. Look for moments when the user reveals key information, expresses frustration, shares successful strategies, or has realizations - these are valuable learnings that should be stored immediately.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["start_interview", "answer_question", "show_context", "reset_context", "suggest_questions", "quick_setup", "store_learning"],
        description: "Action to perform: start_interview (begin learning), answer_question (provide answers), show_context (display stored context), reset_context (clear all), suggest_questions (get intelligent questions based on data model), quick_setup (explain everything in one go), store_learning (AUTOMATICALLY capture breakthrough insights, aha moments, user preferences, workflow patterns, pain points, or any valuable context discovered during conversation)"
      },
      question_id: {
        type: "string",
        description: "ID of the question being answered (when action is 'answer_question')"
      },
      answer: {
        type: "string",
        description: "Answer to the question (when action is 'answer_question')"
      },
      context_type: {
        type: "string",
        description: "Type of context to focus on (for show_context and suggest_questions). Can be any section name like 'personal', 'business', 'data_model', 'technical_preferences', etc., or 'all' for everything",
        default: "all"
      },
      // Quick setup parameters
      full_name: {
        type: "string",
        description: "Your full name (for quick_setup)"
      },
      email: {
        type: "string",
        description: "Your email address (for quick_setup)"
      },
      role: {
        type: "string",
        description: "Your professional role/position (for quick_setup)"
      },
      company_name: {
        type: "string",
        description: "Your company name (for quick_setup)"
      },
      industry: {
        type: "string",
        description: "Your company's industry (for quick_setup)"
      },
      business_process_description: {
        type: "string",
        description: "Complete description of your business processes, how you use Salesforce, what you do, etc. (for quick_setup)"
      },
      // Dynamic learning parameters
      section: {
        type: "string",
        description: "Context section to store the learning in (for store_learning). Use descriptive names that capture the nature of the insight: 'aha_moments' for breakthrough realizations, 'pain_points' for challenges discovered, 'workflow_insights' for process discoveries, 'preferences' for user likes/dislikes, 'success_patterns' for what works well, 'technical_discoveries' for system insights, etc. Will be created dynamically if it doesn't exist."
      },
      key: {
        type: "string",
        description: "Key name for the learning (for store_learning). Use specific, descriptive names that capture the insight: 'critical_realization_about_X', 'main_frustration_with_Y', 'breakthrough_solution_for_Z', 'preferred_approach_to_A', 'discovered_workflow_pattern_B', etc. Be specific about what was learned."
      },
      value: {
        type: "string",
        description: "Value/content of the learning (for store_learning)"
      },
      overwrite: {
        type: "boolean",
        description: "Whether to overwrite existing values for the same key (for store_learning). Default: false",
        default: false
      }
    },
    required: ["action"]
  }
};

export async function handleSalesforceLearnContext(args) {
  const { action, question_id, answer, context_type = "all", full_name, email, role, company_name, industry, business_process_description, section, key, value, overwrite = false } = args;
  
  try {
    switch (action) {
      case "start_interview":
        return await startContextInterview();
      case "answer_question":
        return await answerContextQuestion(question_id, answer);
      case "show_context":
        return await showStoredContext(context_type);
      case "reset_context":
        return await resetContext();
      case "suggest_questions":
        return await suggestIntelligentQuestions(context_type);
      case "quick_setup":
        return await quickSetupContext({ full_name, email, role, company_name, industry, business_process_description });
      case "store_learning":
        return await storeDynamicLearning({ section, key, value, overwrite });
      default:
        return {
          content: [{
            type: "text",
            text: `❌ **Invalid action:** ${action}\n\nSupported actions: start_interview, answer_question, show_context, reset_context, suggest_questions, quick_setup, store_learning`
          }]
        };
    }
  } catch (error) {
    debug.error('❌ Error in context learning:', error);
    return {
      content: [{
        type: "text",
        text: `❌ **Error:** ${error.message}`
      }]
    };
  }
}

async function startContextInterview() {
  const context = await loadContext();
  
  // Generate initial questions based on what we don't know yet
  const questions = [];
  
  // Personal context questions
  if (!context.personal?.name) {
    questions.push({
      id: "personal_name",
      category: "personal",
      question: "What is your full name (first and last name)?",
      type: "text"
    });
  }
  
  if (!context.personal?.email) {
    questions.push({
      id: "personal_email",
      category: "personal", 
      question: "What is your email address?",
      type: "email"
    });
  }
  
  if (!context.personal?.role) {
    questions.push({
      id: "personal_role",
      category: "personal",
      question: "What is your professional position/role?",
      type: "text"
    });
  }
  
  // Business context questions
  if (!context.business?.company_name) {
    questions.push({
      id: "business_company",
      category: "business",
      question: "Which company do you work for?",
      type: "text"
    });
  }
  
  if (!context.business?.industry) {
    questions.push({
      id: "business_industry",
      category: "business",
      question: "What industry is your company in?",
      type: "text"
    });
  }
  
  if (!context.business?.business_focus) {
    questions.push({
      id: "business_focus",
      category: "business",
      question: "What does your company do exactly? What products/services do you offer?",
      type: "textarea"
    });
  }
  
  // Store pending questions
  context.interview = {
    status: "in_progress",
    started_at: new Date().toISOString(),
    pending_questions: questions,
    answered_questions: context.interview?.answered_questions || []
  };
  
  await saveContext(context);
  
  if (questions.length === 0) {
    return {
      content: [{
        type: "text",
        text: `✅ **Context interview already complete!**\n\n` +
              `All basic information has already been captured.\n\n` +
              `💡 **Next steps:**\n` +
              `- Use \`suggest_questions\` for advanced questions\n` +
              `- Use \`show_context\` to display current context\n` +
              `- Use \`reset_context\` to start over`
      }]
    };
  }
  
  const firstQuestion = questions[0];
  let result = `🎤 **Context interview started**\n\n`;
  result += `I'll ask you some questions to get to know you and your company better. `;
  result += `This information will be saved and help me provide better support in future sessions.\n\n`;
  result += `**Progress:** ${context.interview.answered_questions.length}/${questions.length + context.interview.answered_questions.length} questions answered\n\n`;
  result += `---\n\n`;
  result += `**${firstQuestion.category.toUpperCase()} - Question ${context.interview.answered_questions.length + 1}:**\n\n`;
  result += `${firstQuestion.question}\n\n`;
  result += `*Answer with:*\n`;
  result += `\`\`\`json\n`;
  result += `{\n`;
  result += `  "action": "answer_question",\n`;
  result += `  "question_id": "${firstQuestion.id}",\n`;
  result += `  "answer": "Your answer here"\n`;
  result += `}\n`;
  result += `\`\`\``;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

async function answerContextQuestion(questionId, answer) {
  const context = await loadContext();
  
  // Allow additional questions even after interview completion
  // Check if this is a data_model question or other additional questions
  const isDataModelQuestion = questionId.startsWith('data_model') || questionId.includes('data_model');
  const predefinedAdditionalQuestions = ['data_model_details', 'custom_objects_purpose', 'business_processes', 'integration_systems', 'reporting_needs'];
  const isAdditionalQuestion = isDataModelQuestion || predefinedAdditionalQuestions.includes(questionId) || questionId.startsWith('additional_');
  
  if (!context.interview) {
    return {
      content: [{
        type: "text",
        text: `⚠️ **No interview found**\n\nFirst start an interview with \`action: "start_interview"\``
      }]
    };
  }
  
  // For basic interview questions, require in_progress status
  if (!isAdditionalQuestion && context.interview.status !== "in_progress") {
    return {
      content: [{
        type: "text",
        text: `⚠️ **Basic interview already completed**\n\n` +
              `The basic interview is finished. You can:\n` +
              `- Use \`suggest_questions\` for advanced questions\n` +
              `- Add data model details with questions like \`data_model_details\`\n` +
              `- Use \`reset_context\` to start a new interview`
      }]
    };
  }
  
  // Handle additional questions after interview completion
  if (isAdditionalQuestion && context.interview.status === "completed") {
    return await handleAdditionalQuestion(questionId, answer, context);
  }
  
  const questionIndex = context.interview.pending_questions.findIndex(q => q.id === questionId);
  if (questionIndex === -1) {
    // Check if this is a data_model question that should be handled differently
    if (isDataModelQuestion) {
      return await handleAdditionalQuestion(questionId, answer, context);
    }
    return {
      content: [{
        type: "text",
        text: `❌ **Invalid question ID:** ${questionId}\n\nUse the ID from the current question or use \`suggest_questions\` to see available questions.`
      }]
    };
  }
  
  const question = context.interview.pending_questions[questionIndex];
  
  // Store the answer in the appropriate context section
  const [category, field] = question.id.split('_', 2);
  if (!context[category]) context[category] = {};
  
  // Map question IDs to context fields
  const fieldMappings = {
    'personal_name': 'name',
    'personal_email': 'email', 
    'personal_role': 'role',
    'business_company': 'company_name',
    'business_industry': 'industry',
    'business_focus': 'business_focus'
  };
  
  const contextField = fieldMappings[question.id] || field;
  context[category][contextField] = answer;
  
  // Move question from pending to answered
  context.interview.answered_questions.push({
    ...question,
    answer: answer,
    answered_at: new Date().toISOString()
  });
  context.interview.pending_questions.splice(questionIndex, 1);
  
  await saveContext(context);
  
  // Check if interview is complete
  if (context.interview.pending_questions.length === 0) {
    context.interview.status = "completed";
    context.interview.completed_at = new Date().toISOString();
    await saveContext(context);
    
    let result = `✅ **Answer saved!**\n\n`;
    result += `**${question.question}**\n`;
    result += `*Answer:* ${answer}\n\n`;
    result += `🎉 **Interview completed!**\n\n`;
    result += `All basic information has been captured. `;
    result += `I now know you better and can provide better support in future sessions.\n\n`;
    result += `💡 **Tip:** Use \`suggest_questions\` for advanced questions about your Salesforce data model.`;
    
    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }
  
  // Show next question
  const nextQuestion = context.interview.pending_questions[0];
  let result = `✅ **Answer saved!**\n\n`;
  result += `**${question.question}**\n`;
  result += `*Answer:* ${answer}\n\n`;
  result += `**Progress:** ${context.interview.answered_questions.length}/${context.interview.answered_questions.length + context.interview.pending_questions.length} questions answered\n\n`;
  result += `---\n\n`;
  result += `**${nextQuestion.category.toUpperCase()} - Next question:**\n\n`;
  result += `${nextQuestion.question}\n\n`;
  result += `*Answer with:*\n`;
  result += `\`\`\`json\n`;
  result += `{\n`;
  result += `  "action": "answer_question",\n`;
  result += `  "question_id": "${nextQuestion.id}",\n`;
  result += `  "answer": "Your answer here"\n`;
  result += `}\n`;
  result += `\`\`\``;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

async function showStoredContext(contextType) {
  const context = await loadContext();
  
  let result = `📋 **Your stored context**\n\n`;
  
  // Get all sections (excluding metadata fields)
  const metadataFields = ['created_at', 'updated_at', 'interview'];
  const allSections = Object.keys(context).filter(key => !metadataFields.includes(key));
  const hasPersonalInfo = context.personal?.name && context.personal?.email && context.personal?.role;
  const hasBusinessInfo = context.business?.company_name && context.business?.industry && context.business?.business_focus;
  const hasDataModelInfo = Object.keys(context.data_model || {}).length > 0;
  
  // Status overview
  result += `## 📊 Context Status\n`;
  result += `- **Total Sections:** ${allSections.length}\n`;
  result += `- **Personal Information:** ${hasPersonalInfo ? '✅ Complete' : '⚠️ Incomplete'}\n`;
  result += `- **Business Information:** ${hasBusinessInfo ? '✅ Complete' : '⚠️ Incomplete'}\n`;
  result += `- **Data Model Context:** ${hasDataModelInfo ? '✅ Available' : '❌ Not captured'}\n`;
  
  const completionPercentage = Math.round(((hasPersonalInfo ? 1 : 0) + (hasBusinessInfo ? 1 : 0) + (hasDataModelInfo ? 1 : 0)) / 3 * 100);
  result += `- **Core Completeness:** ${completionPercentage}%\n\n`;
  
  // Show specific section or all sections
  const sectionsToShow = contextType === "all" ? allSections : 
                        allSections.includes(contextType) ? [contextType] : [];
  
  if (sectionsToShow.length === 0 && contextType !== "all") {
    result += `⚠️ **Section "${contextType}" not found**\n\n`;
    result += `**Available sections:** ${allSections.join(', ')}\n\n`;
  }
  
  // Display each section
  for (const sectionName of sectionsToShow) {
    const sectionData = context[sectionName];
    if (!sectionData || Object.keys(sectionData).length === 0) continue;
    
    // Create section header with appropriate emoji
    const emoji = getSectionEmoji(sectionName);
    const title = sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    result += `## ${emoji} ${title}\n`;
    
    // Handle special formatting for known sections
    if (sectionName === 'personal') {
      const standardFields = ['name', 'email', 'role', 'salesforce_usage'];
      for (const field of standardFields) {
        if (sectionData[field]) {
          const label = field === 'role' ? 'Position' : 
                       field === 'salesforce_usage' ? 'Salesforce Usage' :
                       field.charAt(0).toUpperCase() + field.slice(1);
          result += `- **${label}:** ${sectionData[field]}\n`;
        }
      }
      
      // Display dynamic fields
      const dynamicFields = Object.keys(sectionData).filter(key => !standardFields.includes(key));
      for (const field of dynamicFields) {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        result += `- **${label}:** ${sectionData[field]}\n`;
      }
    } else if (sectionName === 'business') {
      const standardFields = ['company_name', 'industry', 'business_focus', 'primary_processes'];
      for (const field of standardFields) {
        if (sectionData[field]) {
          const label = field === 'company_name' ? 'Company' :
                       field === 'business_focus' ? 'Business Focus' :
                       field === 'primary_processes' ? 'Primary Processes' :
                       field.charAt(0).toUpperCase() + field.slice(1);
          result += `- **${label}:** ${sectionData[field]}\n`;
        }
      }
      
      // Display dynamic fields
      const dynamicFields = Object.keys(sectionData).filter(key => !standardFields.includes(key));
      for (const field of dynamicFields) {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        result += `- **${label}:** ${sectionData[field]}\n`;
      }
    } else {
      // For all other sections (including data_model and custom sections), show all fields
      for (const [key, value] of Object.entries(sectionData)) {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const displayValue = typeof value === 'string' && value.length > 200 ? 
                           value.substring(0, 200) + '...' : value;
        result += `- **${formattedKey}:** ${displayValue}\n`;
      }
    }
    result += `\n`;
  }
  
  // Interview status
  if (context.interview) {
    result += `## 🎤 Interview Status\n`;
    result += `- **Status:** ${context.interview.status === 'completed' ? '✅ Completed' : '🔄 In Progress'}\n`;
    if (context.interview.started_at) {
      result += `- **Started:** ${new Date(context.interview.started_at).toLocaleString()}\n`;
    }
    if (context.interview.completed_at) {
      result += `- **Completed:** ${new Date(context.interview.completed_at).toLocaleString()}\n`;
    }
    if (context.interview.pending_questions && context.interview.pending_questions.length > 0) {
      result += `- **Pending Questions:** ${context.interview.pending_questions.length}\n`;
    }
    if (context.interview.answered_questions) {
      result += `- **Answered Questions:** ${context.interview.answered_questions.length}\n`;
    }
    result += `\n`;
  }
  
  // Recommendations based on what's missing
  const recommendations = [];
  if (!hasPersonalInfo) {
    recommendations.push("**Complete personal information** - For personalized communication");
  }
  if (!hasBusinessInfo) {
    recommendations.push("**Add business information** - For context-specific solutions");
  }
  if (!hasDataModelInfo && hasPersonalInfo && hasBusinessInfo) {
    recommendations.push("**Capture data model context** - For specific Salesforce support");
  }
  
  if (recommendations.length > 0) {
    result += `## 💡 Recommendations\n`;
    for (const rec of recommendations) {
      result += `- ${rec}\n`;
    }
    result += `\n`;
  }
  
  result += `## 🛠️ Available Actions\n`;
  if (!hasPersonalInfo || !hasBusinessInfo) {
    result += `- **Start/continue interview:** \`action: "start_interview"\`\n`;
  }
  if (hasPersonalInfo && hasBusinessInfo) {
    result += `- **Intelligent questions:** \`action: "suggest_questions"\`\n`;
  }
  // Show additional questions even after interview completion
  if (context.interview?.status === "completed") {
    result += `- **Add data model details:** \`question_id: "data_model_details"\`\n`;
    result += `- **Custom objects purpose:** \`question_id: "custom_objects_purpose"\`\n`;
    result += `- **Business processes:** \`question_id: "business_processes"\`\n`;
    result += `- **Integration systems:** \`question_id: "integration_systems"\`\n`;
    result += `- **Reporting needs:** \`question_id: "reporting_needs"\`\n`;
  }
  result += `- **Store dynamic learning:** \`action: "store_learning"\` (AI can store any key-value information in any section)\n`;
  result += `- **Reset context:** \`action: "reset_context"\`\n`;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

// Helper function to get appropriate emoji for sections
function getSectionEmoji(sectionName) {
  const emojiMap = {
    'personal': '👤',
    'business': '🏢', 
    'data_model': '🗃️',
    'technical_preferences': '⚙️',
    'workflow_patterns': '🔄',
    'integration_systems': '🔗',
    'security_settings': '🔒',
    'reporting_needs': '📊',
    'user_preferences': '⚡',
    'automation_rules': '🤖',
    'custom_processes': '📋',
    'system_configuration': '🔧',
    'aha_moments': '💡',
    'insights': '🌟',
    'breakthrough_insights': '💡',
    'pain_points': '😤',
    'frustrations': '😤',
    'challenges': '⚠️',
    'success_patterns': '✅',
    'wins': '🏆',
    'discoveries': '🔍',
    'realizations': '💭',
    'key_learnings': '📝',
    'workflow_insights': '🔄',
    'technical_discoveries': '🔬',
    'process_improvements': '📈',
    'optimization_opportunities': '⚡'
  };
  
  return emojiMap[sectionName] || '📁';
}

async function suggestIntelligentQuestions(contextType) {
  // Check if installation has been learned
  const hasInstallation = await hasInstallationDocumentation();
  if (!hasInstallation) {
    return {
      content: [{
        type: "text",
        text: `⚠️ **Salesforce installation not learned**\n\n` +
              `To ask intelligent questions about your data model, the Salesforce installation must first be analyzed.\n\n` +
              `First run \`salesforce_learn\`.`
      }]
    };
  }
  
  const documentation = await getInstallationDocumentation();
  const context = await loadContext();
  
  const questions = [];
  let questionId = 1;
  
  // Business process questions based on custom objects
  const customObjects = Object.entries(documentation.objects)
    .filter(([name, obj]) => !obj.error && obj.basic_info?.custom)
    .slice(0, 10); // Limit to avoid overwhelming
  
  if (customObjects.length > 0 && (contextType === "all" || contextType === "data_model")) {
    questions.push({
      id: `custom_objects_purpose_${questionId++}`,
      category: "data_model",
      question: `You have ${customObjects.length} Custom Objects in Salesforce. Can you explain the business purpose of these objects?\n\nCustom Objects: ${customObjects.map(([name, obj]) => `${obj.basic_info.label} (${name})`).join(', ')}`,
      type: "textarea",
      priority: "high"
    });
  }
  
  // Relationship questions
  const objectsWithRelationships = Object.entries(documentation.objects)
    .filter(([name, obj]) => !obj.error && obj.relationships && 
      ((obj.relationships.parent_relationships?.length || 0) + (obj.relationships.child_relationships?.length || 0)) > 2)
    .slice(0, 5);
  
  if (objectsWithRelationships.length > 0 && (contextType === "all" || contextType === "data_model")) {
    questions.push({
      id: `relationship_meaning_${questionId++}`,
      category: "data_model", 
      question: `Some of your objects have many relationships with each other. Can you explain the business connections between these objects?\n\nObjects with many relationships: ${objectsWithRelationships.map(([name, obj]) => obj.basic_info.label).join(', ')}`,
      type: "textarea",
      priority: "medium"
    });
  }
  
  // User role and process questions
  if (!context.business?.primary_processes && (contextType === "all" || contextType === "business")) {
    questions.push({
      id: `primary_processes_${questionId++}`,
      category: "business",
      question: "What are the main business processes you map in Salesforce? (e.g., Sales, Customer Support, Marketing, etc.)",
      type: "textarea",
      priority: "high"
    });
  }
  
  if (!context.personal?.salesforce_usage && (contextType === "all" || contextType === "personal")) {
    questions.push({
      id: `salesforce_usage_${questionId++}`,
      category: "personal",
      question: "How do you primarily use Salesforce in your daily work? What tasks do you perform most frequently?",
      type: "textarea",
      priority: "medium"
    });
  }
  
  // Data model complexity questions
  const totalCustomFields = documentation.summary?.custom_fields || 0;
  if (totalCustomFields > 50 && !context.data_model?.customization_strategy && (contextType === "all" || contextType === "data_model")) {
    questions.push({
      id: `customization_strategy_${questionId++}`,
      category: "data_model",
      question: `You have ${totalCustomFields} Custom Fields. What was the strategy behind these customizations? What specific business requirements did they fulfill?`,
      type: "textarea",
      priority: "medium"
    });
  }
  
  // Sort questions by priority
  const priorityOrder = { "high": 3, "medium": 2, "low": 1 };
  questions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  
  if (questions.length === 0) {
    return {
      content: [{
        type: "text",
        text: `✅ **No additional questions available**\n\n` +
              `Based on your current context and data model, there are currently no additional intelligent questions.\n\n` +
              `💡 **Tip:** If you want to share additional information, you can enter it directly or reset the interview.`
      }]
    };
  }
  
  // Show top 3 questions
  const topQuestions = questions.slice(0, 3);
  
  let result = `🧠 **Intelligent questions based on your Salesforce data model**\n\n`;
  result += `Based on your Salesforce installation, I have identified ${questions.length} relevant questions:\n\n`;
  
  for (let i = 0; i < topQuestions.length; i++) {
    const q = topQuestions[i];
    result += `## ${i + 1}. ${q.category.toUpperCase()} - ${q.priority.toUpperCase()} PRIORITY\n\n`;
    result += `${q.question}\n\n`;
    result += `*Answer with:*\n`;
    result += `\`\`\`json\n`;
    result += `{\n`;
    result += `  "action": "answer_question",\n`;
    result += `  "question_id": "${q.id}",\n`;
    result += `  "answer": "Your answer here"\n`;
    result += `}\n`;
    result += `\`\`\`\n\n`;
    result += `---\n\n`;
  }
  
  if (questions.length > 3) {
    result += `*... and ${questions.length - 3} more questions available*\n\n`;
  }
  
  result += `💡 **Note:** These questions help me better understand your Salesforce usage and provide more targeted support.`;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

async function resetContext() {
  try {
    await fs.unlink(CONTEXT_FILE);
  } catch (error) {
    // File might not exist, which is fine
  }
  
  return {
    content: [{
      type: "text",
      text: `🗑️ **Context reset**\n\n` +
            `All stored information has been deleted.\n\n` +
            `You can now start a new interview with \`action: "start_interview"\``
    }]
  };
}

async function loadContext() {
  try {
    const data = await fs.readFile(CONTEXT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty context
    return {
      personal: {},
      business: {},
      data_model: {},
      created_at: new Date().toISOString()
    };
  }
}

async function saveContext(context) {
  context.updated_at = new Date().toISOString();
  
  // Ensure cache directory exists
  const cacheDir = path.dirname(CONTEXT_FILE);
  debug.log('🔍 saveContext - CONTEXT_FILE:', CONTEXT_FILE);
  debug.log('🔍 saveContext - cacheDir:', cacheDir);
  
  try {
    await fs.access(cacheDir);
    debug.log('✅ Cache directory exists');
  } catch (error) {
    debug.log('📁 Creating cache directory:', cacheDir);
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      debug.log('✅ Cache directory created successfully');
    } catch (mkdirError) {
      debug.error('❌ Failed to create cache directory:', mkdirError);
      throw mkdirError;
    }
  }
  
  await fs.writeFile(CONTEXT_FILE, JSON.stringify(context, null, 2));
}

async function quickSetupContext({ full_name, email, role, company_name, industry, business_process_description }) {
  // Validate required fields
  const missingFields = [];
  if (!full_name) missingFields.push('full_name');
  if (!email) missingFields.push('email');
  if (!role) missingFields.push('role');
  if (!company_name) missingFields.push('company_name');
  if (!industry) missingFields.push('industry');
  if (!business_process_description) missingFields.push('business_process_description');
  
  if (missingFields.length > 0) {
    return {
      content: [{
        type: "text",
        text: `❌ **Missing required fields for quick setup:**\n\n${missingFields.map(field => `- ${field}`).join('\n')}\n\n` +
              `**Example usage:**\n` +
              `\`\`\`json\n` +
              `{\n` +
              `  "action": "quick_setup",\n` +
              `  "full_name": "Max Mustermann",\n` +
              `  "email": "max@company.com",\n` +
              `  "role": "Sales Manager",\n` +
              `  "company_name": "Mustermann GmbH",\n` +
              `  "industry": "Software & Technology",\n` +
              `  "business_process_description": "Wir sind ein IT-Dienstleister der... [hier kompletten Geschäftsprozess erklären]"\n` +
              `}\n` +
              `\`\`\``
      }]
    };
  }
  
  // Create complete context
  const context = {
    personal: {
      name: full_name,
      email: email,
      role: role
    },
    business: {
      company_name: company_name,
      industry: industry,
      business_focus: business_process_description
    },
    data_model: {},
    created_at: new Date().toISOString(),
    interview: {
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      pending_questions: [],
      answered_questions: [
        {
          id: "quick_setup_all",
          category: "business",
          question: "Complete business process setup",
          type: "quick_setup",
          answer: "All information provided via quick setup",
          answered_at: new Date().toISOString()
        }
      ]
    }
  };
  
  await saveContext(context);
  
  return {
    content: [{
      type: "text",
      text: `🎉 **Quick Setup Complete!**\n\n` +
            `All your information has been saved successfully:\n\n` +
            `## 👤 Personal Information\n` +
            `- **Name:** ${full_name}\n` +
            `- **Email:** ${email}\n` +
            `- **Position:** ${role}\n\n` +
            `## 🏢 Business Information\n` +
            `- **Company:** ${company_name}\n` +
            `- **Industry:** ${industry}\n` +
            `- **Business Process:** ${business_process_description.substring(0, 150)}${business_process_description.length > 150 ? '...' : ''}\n\n` +
            `## ✅ Status\n` +
            `- **Personal Information:** ✅ Complete\n` +
            `- **Business Information:** ✅ Complete\n` +
            `- **Overall Completeness:** 67%\n\n` +
            `💡 **Next steps:**\n` +
            `- Use \`suggest_questions\` for data model questions\n` +
            `- The AI now knows you and can provide personalized support!`
    }]
  };
}

// Export function to get context for other tools
export async function getUserContext() {
  return await loadContext();
}

// Handle additional questions after basic interview is completed
async function handleAdditionalQuestion(questionId, answer, context) {
  // Ensure context structure exists
  if (!context.data_model) context.data_model = {};
  if (!context.interview) context.interview = {};
  if (!context.interview.answered_questions) context.interview.answered_questions = [];
  
  // Define common additional questions
  const additionalQuestions = {
    'data_model_details': {
      id: 'data_model_details',
      category: 'data_model',
      question: 'Can you describe your Salesforce data model? What custom objects, fields, and relationships are important to your business?',
      type: 'textarea',
      context_field: 'model_description'
    },
    'custom_objects_purpose': {
      id: 'custom_objects_purpose',
      category: 'data_model',
      question: 'What are the main purposes of your custom objects in Salesforce?',
      type: 'textarea',
      context_field: 'custom_objects_purpose'
    },
    'business_processes': {
      id: 'business_processes',
      category: 'data_model',
      question: 'What are your main business processes that you track in Salesforce?',
      type: 'textarea',
      context_field: 'business_processes'
    },
    'integration_systems': {
      id: 'integration_systems',
      category: 'data_model',
      question: 'What external systems do you integrate with Salesforce?',
      type: 'textarea',
      context_field: 'integration_systems'
    },
    'reporting_needs': {
      id: 'reporting_needs',
      category: 'data_model',
      question: 'What kind of reports and dashboards are most important to your business?',
      type: 'textarea',
      context_field: 'reporting_needs'
    }
  };
  
  // Check if this is a predefined additional question
  const questionDef = additionalQuestions[questionId];
  
  if (questionDef) {
    // Store the answer in the data_model context
    context.data_model[questionDef.context_field] = answer;
    
    // Add to answered questions
    context.interview.answered_questions.push({
      ...questionDef,
      answer: answer,
      answered_at: new Date().toISOString()
    });
    
    await saveContext(context);
    
    let result = `✅ **Additional information saved!**\n\n`;
    result += `**${questionDef.question}**\n`;
    result += `*Your answer:* ${answer}\n\n`;
    result += `💡 **This information has been added to your data model context.**\n\n`;
    result += `**Available additional questions:**\n`;
    
    // Show other available additional questions
    for (const [qId, qDef] of Object.entries(additionalQuestions)) {
      if (qId !== questionId && !context.data_model[qDef.context_field]) {
        result += `- **${qDef.category.replace('_', ' ')}:** Use \`question_id: "${qId}"\`\n`;
      }
    }
    
    result += `\n💡 **Tip:** Use \`suggest_questions\` for intelligent questions based on your Salesforce installation.`;
    
    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }
  
  // Handle dynamic questions from suggest_questions or AI-generated questions
  // Check if this looks like a question ID from suggest_questions or is a completely new key
  if (questionId.includes('_') || !additionalQuestions[questionId]) {
    // Determine the section and key
    let targetSection = 'data_model';
    let contextField = questionId;
    
    // Parse section from question ID if available
    if (questionId.includes('_')) {
      const [category, ...rest] = questionId.split('_');
      if (['personal', 'business', 'data'].includes(category)) {
        targetSection = category === 'data' ? 'data_model' : category;
        contextField = rest.join('_');
      }
    }
    
    // For completely unknown question IDs, try to infer meaning
    if (!contextField || contextField === questionId) {
      // Use the full question ID as the field name, cleaned up
      contextField = questionId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }
    
    // Remove trailing numbers that might be from suggest_questions
    contextField = contextField.replace(/\d+$/, '');
    
    if (!context[targetSection]) context[targetSection] = {};
    context[targetSection][contextField] = answer;
    
    // Add to answered questions
    context.interview.answered_questions.push({
      id: questionId,
      category: targetSection,
      question: `Dynamic question: ${questionId}`,
      type: 'dynamic',
      answer: answer,
      answered_at: new Date().toISOString(),
      context_field: contextField
    });
    
    await saveContext(context);
    
    return {
      content: [{
        type: "text",
        text: `✅ **Dynamic answer saved!**\n\n` +
              `**Question ID:** ${questionId}\n` +
              `**Stored in:** ${targetSection}.${contextField}\n` +
              `**Your answer:** ${answer}\n\n` +
              `🧠 **This learning has been added to your context and will be remembered across sessions.**\n\n` +
              `💡 Use \`show_context\` to see all stored information.`
      }]
    };
  }
  
  // If question ID is not recognized, provide helpful guidance
  return {
    content: [{
      type: "text",
      text: `❌ **Question ID not recognized:** ${questionId}\n\n` +
            `**Available additional questions:**\n` +
            Object.entries(additionalQuestions).map(([qId, qDef]) => 
              `- **${qDef.category.replace('_', ' ')}:** \`${qId}\` - ${qDef.question.substring(0, 80)}...`
            ).join('\n') + '\n\n' +
            `💡 **Or use \`suggest_questions\` for intelligent questions based on your Salesforce data.**`
    }]
  };
}

async function storeDynamicLearning({ section, key, value, overwrite = false }) {
  if (!section || !key || !value) {
    return {
      content: [{
        type: "text",
        text: `❌ **Missing required parameters for store_learning**\n\n` +
              `Required: section, key, value\n` +
              `- **section:** any descriptive name (e.g., 'personal', 'business', 'technical_preferences', 'workflow_patterns')\n` +
              `- **key:** descriptive name (e.g., 'preferred_communication_style')\n` +
              `- **value:** the information to store\n` +
              `- **overwrite:** true/false (optional, default: false)`
      }]
    };
  }

  // Clean section name: convert to lowercase, replace spaces with underscores, remove special chars
  const cleanSection = section.toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  
  const context = await loadContext();
  
  // Ensure section exists - create dynamically if needed
  if (!context[cleanSection]) {
    context[cleanSection] = {};
  }

  // Check if key already exists and handle overwrite logic
  const keyExists = context[cleanSection].hasOwnProperty(key);
  if (keyExists && !overwrite) {
    return {
      content: [{
        type: "text",
        text: `⚠️ **Key already exists:** \`${key}\` in \`${cleanSection}\`\n\n` +
              `**Current value:** ${context[cleanSection][key]}\n` +
              `**New value:** ${value}\n\n` +
              `Use \`overwrite: true\` to replace the existing value, or choose a different key name.`
      }]
    };
  }

  const previousValue = keyExists ? context[cleanSection][key] : null;
  
  // Store the learning
  context[cleanSection][key] = value;
  context.updated_at = new Date().toISOString();
  
  // Track the learning in the interview history for transparency
  if (!context.interview) {
    context.interview = {
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      pending_questions: [],
      answered_questions: []
    };
  }
  
  if (!context.interview.answered_questions) {
    context.interview.answered_questions = [];
  }
  
  context.interview.answered_questions.push({
    id: `dynamic_learning_${Date.now()}`,
    category: cleanSection,
    question: `Dynamic learning: ${key}`,
    type: 'dynamic_learning',
    answer: value,
    answered_at: new Date().toISOString(),
    learning_key: key,
    overwritten: keyExists,
    previous_value: previousValue
  });

  await saveContext(context);

  let result = `✅ **Learning stored successfully!**\n\n`;
  result += `**Section:** ${cleanSection}${cleanSection !== section ? ` (cleaned from "${section}")` : ''}\n`;
  result += `**Key:** ${key}\n`;
  result += `**Value:** ${value}\n\n`;
  
  if (keyExists) {
    result += `📝 **Note:** This ${overwrite ? 'replaced' : 'overwrote'} the previous value:\n`;
    result += `*Previous:* ${previousValue}\n\n`;
  }
  
  result += `🧠 **AI Context Enhanced:** This information will be remembered across all future sessions.\n\n`;
  result += `**Quick access:** Use \`show_context\` with \`context_type: "${cleanSection}"\` to see all ${cleanSection} information.`;

  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}
