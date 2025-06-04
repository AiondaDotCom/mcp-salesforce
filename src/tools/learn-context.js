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
  description: "Learn and store personal/business context about the user and their Salesforce data model relationships. This helps provide better context-aware assistance across sessions.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["start_interview", "answer_question", "show_context", "reset_context", "suggest_questions"],
        description: "Action to perform: start_interview (begin learning), answer_question (provide answers), show_context (display stored context), reset_context (clear all), suggest_questions (get intelligent questions based on data model)"
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
        enum: ["personal", "business", "data_model", "all"],
        description: "Type of context to focus on (for show_context and suggest_questions)",
        default: "all"
      }
    },
    required: ["action"]
  }
};

export async function handleSalesforceLearnContext(args) {
  const { action, question_id, answer, context_type = "all" } = args;
  
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
      default:
        return {
          content: [{
            type: "text",
            text: `❌ **Invalid action:** ${action}\n\nSupported actions: start_interview, answer_question, show_context, reset_context, suggest_questions`
          }]
        };
    }
  } catch (error) {
    logger.error('❌ Error in context learning:', error);
    return {
      content: [{
        type: "text",
        text: `❌ **Error learning context:**\n\n${error.message}`
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
  
  if (!context.interview || context.interview.status !== "in_progress") {
    return {
      content: [{
        type: "text",
        text: `⚠️ **No active interview**\n\nFirst start an interview with \`action: "start_interview"\``
      }]
    };
  }
  
  const questionIndex = context.interview.pending_questions.findIndex(q => q.id === questionId);
  if (questionIndex === -1) {
    return {
      content: [{
        type: "text",
        text: `❌ **Invalid question ID:** ${questionId}\n\nUse the ID from the current question.`
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
  
  // Check completion status
  const hasPersonalInfo = context.personal?.name && context.personal?.email && context.personal?.role;
  const hasBusinessInfo = context.business?.company_name && context.business?.industry && context.business?.business_focus;
  const hasDataModelInfo = Object.keys(context.data_model || {}).length > 0;
  
  // Status overview
  result += `## 📊 Context Status\n`;
  result += `- **Personal Information:** ${hasPersonalInfo ? '✅ Complete' : '⚠️ Incomplete'}\n`;
  result += `- **Business Information:** ${hasBusinessInfo ? '✅ Complete' : '⚠️ Incomplete'}\n`;
  result += `- **Data Model Context:** ${hasDataModelInfo ? '✅ Available' : '❌ Not captured'}\n`;
  
  const completionPercentage = Math.round(((hasPersonalInfo ? 1 : 0) + (hasBusinessInfo ? 1 : 0) + (hasDataModelInfo ? 1 : 0)) / 3 * 100);
  result += `- **Overall Completeness:** ${completionPercentage}%\n\n`;
  
  if (contextType === "all" || contextType === "personal") {
    result += `## 👤 Personal Information\n`;
    if (context.personal && Object.keys(context.personal).length > 0) {
      if (context.personal.name) result += `- **Name:** ${context.personal.name}\n`;
      if (context.personal.email) result += `- **Email:** ${context.personal.email}\n`;
      if (context.personal.role) result += `- **Position:** ${context.personal.role}\n`;
      if (context.personal.salesforce_usage) result += `- **Salesforce Usage:** ${context.personal.salesforce_usage}\n`;
    } else {
      result += `*No personal information stored*\n`;
    }
    result += `\n`;
  }
  
  if (contextType === "all" || contextType === "business") {
    result += `## 🏢 Business Information\n`;
    if (context.business && Object.keys(context.business).length > 0) {
      if (context.business.company_name) result += `- **Company:** ${context.business.company_name}\n`;
      if (context.business.industry) result += `- **Industry:** ${context.business.industry}\n`;
      if (context.business.business_focus) result += `- **Business Focus:** ${context.business.business_focus}\n`;
      if (context.business.primary_processes) result += `- **Primary Processes:** ${context.business.primary_processes}\n`;
    } else {
      result += `*No business information stored*\n`;
    }
    result += `\n`;
  }
  
  if (contextType === "all" || contextType === "data_model") {
    result += `## 🗃️ Data Model Context\n`;
    if (context.data_model && Object.keys(context.data_model).length > 0) {
      for (const [key, value] of Object.entries(context.data_model)) {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        result += `- **${formattedKey}:** ${value}\n`;
      }
    } else {
      result += `*No data model information stored*\n`;
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
  result += `- **Reset context:** \`action: "reset_context"\`\n`;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
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

// Export function to get context for other tools
export async function getUserContext() {
  return await loadContext();
}
