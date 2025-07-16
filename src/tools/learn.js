/**
 * Salesforce Learn Tool
 * 
 * This tool analyzes the complete Salesforce installation and creates
 * a comprehensive local documentation cache of all objects, fields,
 * relationships, and customizations.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { debug as logger } from '../utils/debug.js';
import { getCacheFilePath, ensureCacheDirectory } from '../utils/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for storing the learned installation data
const INSTALLATION_FILE = getCacheFilePath('salesforce-installation.json');

export const salesforceLearnTool = {
  name: "salesforce_learn",
  description: "Analyzes the complete Salesforce installation and creates local documentation of all objects, fields, and customizations. This should be run once after initial setup to enable intelligent assistance.",
  inputSchema: {
    type: "object",
    properties: {
      force_refresh: {
        type: "boolean",
        description: "Forces a complete re-analysis even if documentation already exists",
        default: false
      },
      include_unused: {
        type: "boolean", 
        description: "Includes unused/inactive fields and objects in the documentation",
        default: false
      },
      detailed_relationships: {
        type: "boolean",
        description: "Analyzes detailed relationships between objects",
        default: true
      }
    }
  }
};

export async function handleSalesforceLearn(args, salesforceClient) {
  const { force_refresh = false, include_unused = false, detailed_relationships = true } = args;
  
  try {
    // Check if we need to create cache directory
    await ensureCacheDirectory();
    
    // Check if documentation already exists
    const existingDoc = await getExistingDocumentation();
    if (existingDoc && !force_refresh) {
      return {
        content: [{
          type: "text", 
          text: `✅ Salesforce installation already documented (${existingDoc.metadata.learned_at})\n\n` +
                `📊 **Overview:**\n` +
                `- **${existingDoc.summary.total_objects}** total objects\n` +
                `- **${existingDoc.summary.custom_objects}** custom objects\n` + 
                `- **${existingDoc.summary.total_fields}** total fields\n` +
                `- **${existingDoc.summary.custom_fields}** custom fields\n\n` +
                `💡 Use \`force_refresh: true\` to force re-analysis, or use the \`salesforce_installation_info\` tool to view details.`
        }]
      };
    }

    // Start learning process
    logger.log('🔍 Starting Salesforce installation learning process...');
    
    // Step 1: Get all available objects
    const globalDescribe = await salesforceClient.describeGlobal();
    
    logger.log(`📋 Found: ${globalDescribe.length} objects`);
    
    // Step 2: Filter and categorize objects
    const standardObjects = [];
    const customObjects = [];
    
    for (const obj of globalDescribe) {
      if (obj.custom) {
        customObjects.push(obj);
      } else if (obj.name.match(/^(Account|Contact|Lead|Opportunity|Case|Task|Event|Campaign|Product2|Pricebook2|User|Profile)$/)) {
        // Include important standard objects
        standardObjects.push(obj);
      }
    }
    
    logger.log(`📊 Standard objects: ${standardObjects.length}, Custom objects: ${customObjects.length}`);
    
    // Step 3: Detailed analysis of selected objects
    const documentation = {
      metadata: {
        learned_at: new Date().toISOString(),
        salesforce_instance: salesforceClient.instanceUrl,
        api_version: salesforceClient.version || 'v58.0',
        learning_options: { include_unused, detailed_relationships }
      },
      summary: {
        total_objects: standardObjects.length + customObjects.length,
        standard_objects: standardObjects.length,
        custom_objects: customObjects.length,
        total_fields: 0,
        custom_fields: 0
      },
      objects: {}
    };
    
    // Analyze objects in batches to avoid rate limits
    const objectsToAnalyze = [...standardObjects, ...customObjects];
    const batchSize = 10;
    
    for (let i = 0; i < objectsToAnalyze.length; i += batchSize) {
      const batch = objectsToAnalyze.slice(i, i + batchSize);
      logger.log(`🔬 Analyzing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(objectsToAnalyze.length/batchSize)} (${batch.length} objects)`);
      
      await Promise.all(batch.map(async (obj) => {
        try {
          const objectDoc = await analyzeObject(obj, salesforceClient, { include_unused, detailed_relationships });
          documentation.objects[obj.name] = objectDoc;
          documentation.summary.total_fields += objectDoc.field_count;
          documentation.summary.custom_fields += objectDoc.custom_field_count;
        } catch (error) {
          logger.warn(`⚠️ Error analyzing ${obj.name}:`, error.message);
          documentation.objects[obj.name] = {
            error: `Analysis failed: ${error.message}`,
            basic_info: {
              name: obj.name,
              label: obj.label,
              custom: obj.custom
            }
          };
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < objectsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 4: Save documentation
    await fs.writeFile(INSTALLATION_FILE, JSON.stringify(documentation, null, 2), 'utf8');
    
    logger.log('✅ Learning process completed');
    
    return {
      content: [{
        type: "text",
        text: `🎉 **Salesforce installation successfully learned!**\n\n` +
              `📊 **Analyzed data:**\n` +
              `- **${documentation.summary.total_objects}** total objects\n` +
              `- **${documentation.summary.standard_objects}** standard objects\n` +
              `- **${documentation.summary.custom_objects}** custom objects\n` +
              `- **${documentation.summary.total_fields}** total fields\n` +
              `- **${documentation.summary.custom_fields}** custom fields\n\n` +
              `💾 **Documentation saved** to: \`${INSTALLATION_FILE}\`\n\n` +
              `✨ **Next steps:**\n` +
              `- Use \`salesforce_installation_info\` to get an overview\n` +
              `- Ask about specific objects or fields\n` +
              `- The AI can now work intelligently with your Salesforce installation!`
      }]
    };
    
  } catch (error) {
    logger.error('❌ Error during learning process:', error);
    return {
      content: [{
        type: "text",
        text: `❌ **Error learning Salesforce installation:**\n\n` +
              `${error.message}\n\n` +
              `🔧 **Possible solutions:**\n` +
              `- Check your Salesforce connection\n` +
              `- Ensure you have sufficient permissions\n` +
              `- Try re-authenticating with \`salesforce_auth\``
      }]
    };
  }
}

async function analyzeObject(obj, salesforceClient, options) {
  const { include_unused, detailed_relationships } = options;
  
  // Get detailed object description
  const describe = await salesforceClient.describe(obj.name);
  
  const objectDoc = {
    basic_info: {
      name: obj.name,
      label: obj.label,
      label_plural: obj.labelPlural,
      custom: obj.custom,
      api_name: obj.name
    },
    metadata: {
      createable: describe.createable,
      updateable: describe.updateable,
      deletable: describe.deletable,
      queryable: describe.queryable,
      searchable: describe.searchable,
      retrieveable: describe.retrieveable
    },
    field_count: describe.fields.length,
    custom_field_count: describe.fields.filter(f => f.custom).length,
    fields: {},
    relationships: {
      parent_relationships: [],
      child_relationships: []
    }
  };
  
  // Analyze fields
  for (const field of describe.fields) {
    // Skip system fields if not including unused
    if (!include_unused && isSystemField(field)) {
      continue;
    }
    
    const fieldDoc = {
      name: field.name,
      label: field.label,
      type: field.type,
      custom: field.custom,
      required: !field.nillable && !field.defaultedOnCreate,
      updateable: field.updateable,
      createable: field.createable,
      // Enhanced writability information
      writability: {
        fully_writable: field.updateable && field.createable,
        create_only: field.createable && !field.updateable,
        read_only: !field.updateable && !field.createable,
        system_managed: isSystemManagedField(field),
        calculated: field.calculated || false,
        auto_number: field.type === 'autonumber',
        formula: field.type === 'formula' || field.calculated,
        rollup_summary: field.type === 'summary'
      }
    };
    
    // Add type-specific information
    if (field.type === 'picklist' || field.type === 'multipicklist') {
      fieldDoc.picklist_values = field.picklistValues?.map(v => ({
        value: v.value,
        label: v.label,
        active: v.active
      })) || [];
    }
    
    if (field.type === 'reference') {
      fieldDoc.reference_to = field.referenceTo;
      if (detailed_relationships && field.referenceTo?.length > 0) {
        objectDoc.relationships.parent_relationships.push({
          field: field.name,
          references: field.referenceTo
        });
      }
    }
    
    if (field.length) {
      fieldDoc.max_length = field.length;
    }
    
    if (field.precision) {
      fieldDoc.precision = field.precision;
      fieldDoc.scale = field.scale;
    }
    
    objectDoc.fields[field.name] = fieldDoc;
  }
  
  // Analyze child relationships
  if (detailed_relationships && describe.childRelationships) {
    for (const childRel of describe.childRelationships) {
      if (childRel.relationshipName) {
        objectDoc.relationships.child_relationships.push({
          child_object: childRel.childSObject,
          relationship_name: childRel.relationshipName,
          field: childRel.field
        });
      }
    }
  }
  
  return objectDoc;
}

function isSystemField(field) {
  const systemFields = [
    'Id', 'CreatedDate', 'CreatedById', 'LastModifiedDate', 'LastModifiedById',
    'SystemModstamp', 'IsDeleted', 'MasterRecordId', 'LastActivityDate',
    'LastViewedDate', 'LastReferencedDate'
  ];
  return systemFields.includes(field.name);
}

function isSystemManagedField(field) {
  // System fields that are automatically managed by Salesforce
  const systemManagedFields = [
    'Id', 'CreatedDate', 'CreatedById', 'LastModifiedDate', 'LastModifiedById',
    'SystemModstamp', 'IsDeleted', 'MasterRecordId', 'LastActivityDate',
    'LastViewedDate', 'LastReferencedDate', 'RecordTypeId'
  ];
  
  // Check if it's a system managed field by name
  if (systemManagedFields.includes(field.name)) {
    return true;
  }
  
  // Check if it's an auto-number field
  if (field.type === 'autonumber') {
    return true;
  }
  
  // Check if it's a formula field
  if (field.type === 'formula' || field.calculated) {
    return true;
  }
  
  // Check if it's a rollup summary field
  if (field.type === 'summary') {
    return true;
  }
  
  // Check if field is marked as not updateable and not createable (fully read-only)
  if (!field.updateable && !field.createable) {
    return true;
  }
  
  return false;
}


async function getExistingDocumentation() {
  try {
    const content = await fs.readFile(INSTALLATION_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getInstallationDocumentation() {
  return await getExistingDocumentation();
}

export async function hasInstallationDocumentation() {
  const doc = await getExistingDocumentation();
  return doc !== null;
}
