/**
 * Salesforce Installation Info Tool
 * 
 * This tool provides information about the learned Salesforce installation,
 * including objects, fields, and customizations.
 */

import { getInstallationDocumentation, hasInstallationDocumentation } from './learn.js';
import { getUserContext } from './learn-context.js';
import { logger } from '../utils/debug.js';

export const salesforceInstallationInfoTool = {
  name: "salesforce_installation_info",
  description: "Returns comprehensive information about the learned Salesforce installation, including all object details, field specifications, relationships, permissions, and customizations from the learned installation data.",
  inputSchema: {
    type: "object",
    properties: {
      object_name: {
        type: "string",
        description: "Specific object for detailed information (optional). Example: 'Account', 'Contact', 'CustomObject__c'"
      },
      field_search: {
        type: "string", 
        description: "Search for fields with this name or label (optional)"
      },
      show_custom_only: {
        type: "boolean",
        description: "Show only custom objects and custom fields",
        default: false
      },
      include_relationships: {
        type: "boolean",
        description: "Include relationship information between objects",
        default: true
      },
      detailed_fields: {
        type: "boolean",
        description: "Show detailed field information including data types, constraints, and metadata",
        default: true
      },
      include_permissions: {
        type: "boolean",
        description: "Include detailed permission information for objects and fields",
        default: true
      },
      max_fields_per_object: {
        type: "number",
        description: "Maximum number of fields to show per object (default: all fields)",
        default: 0
      }
    }
  }
};

export async function handleSalesforceInstallationInfo(args) {
  const { 
    object_name, 
    field_search, 
    show_custom_only = false, 
    include_relationships = true,
    detailed_fields = true,
    include_permissions = true,
    max_fields_per_object = 0
  } = args;
  
  try {
    // Check if installation has been learned
    const hasDocumentation = await hasInstallationDocumentation();
    if (!hasDocumentation) {
      return {
        content: [{
          type: "text",
          text: `⚠️ **Salesforce installation not yet learned**\n\n` +
                `The Salesforce installation has not been analyzed and documented yet.\n\n` +
                `🚀 **Solution:** First run the \`salesforce_learn\` tool:\n` +
                `\`\`\`\n` +
                `{\n` +
                `  "tool": "salesforce_learn"\n` +
                `}\n` +
                `\`\`\`\n\n` +
                `Then I can provide detailed information about your Salesforce installation.`
        }]
      };
    }
    
    const documentation = await getInstallationDocumentation();
    
    // Handle specific object request
    if (object_name) {
      return handleSpecificObjectInfo(object_name, documentation, {
        include_relationships,
        detailed_fields,
        include_permissions,
        max_fields_per_object
      });
    }
    
    // Handle field search
    if (field_search) {
      return handleFieldSearch(field_search, documentation, {
        show_custom_only,
        detailed_fields,
        max_fields_per_object
      });
    }
    
    // General installation overview
    return await handleGeneralOverview(documentation, {
      show_custom_only,
      include_relationships,
      detailed_fields,
      include_permissions
    });
    
  } catch (error) {
    logger.error('❌ Error retrieving installation info:', error);
    return {
      content: [{
        type: "text",
        text: `❌ **Error retrieving installation information:**\n\n${error.message}`
      }]
    };
  }
}

function handleSpecificObjectInfo(objectName, documentation, options) {
  const { include_relationships, detailed_fields, include_permissions, max_fields_per_object } = options;
  
  const obj = documentation.objects[objectName];
  if (!obj) {
    // Try to find similar object names
    const availableObjects = Object.keys(documentation.objects);
    const similarObjects = availableObjects.filter(name => 
      name.toLowerCase().includes(objectName.toLowerCase()) ||
      documentation.objects[name].basic_info?.label?.toLowerCase().includes(objectName.toLowerCase())
    );
    
    let suggestion = '';
    if (similarObjects.length > 0) {
      suggestion = `\n\n🔍 **Similar objects found:**\n${similarObjects.slice(0, 5).map(name => `- ${name} (${documentation.objects[name].basic_info?.label})`).join('\n')}`;
    }
    
    return {
      content: [{
        type: "text",
        text: `❌ **Object '${objectName}' not found**\n\n` +
              `The object does not exist in the learned Salesforce installation.${suggestion}\n\n` +
              `💡 Use the tool without parameters to see all available objects.`
      }]
    };
  }
  
  if (obj.error) {
    return {
      content: [{
        type: "text",
        text: `⚠️ **Object '${objectName}' - Analysis Error**\n\n${obj.error}`
      }]
    };
  }
  
  let result = `📋 **${obj.basic_info.label} (${obj.basic_info.name})**\n\n`;
  
  // Basic info with all available details
  result += `## 📝 Basic Information\n`;
  result += `- **API Name:** \`${obj.basic_info.name}\`\n`;
  result += `- **Label:** ${obj.basic_info.label}\n`;
  result += `- **Plural Label:** ${obj.basic_info.label_plural}\n`;
  result += `- **Custom Object:** ${obj.basic_info.custom ? '✅ Yes' : '❌ No'}\n`;
  
  // Extended metadata if available
  if (obj.metadata) {
    result += `\n## 🔐 Permissions & Capabilities\n`;
    result += `- **Createable:** ${obj.metadata.createable ? '✅' : '❌'}\n`;
    result += `- **Updateable:** ${obj.metadata.updateable ? '✅' : '❌'}\n`;
    result += `- **Deletable:** ${obj.metadata.deletable ? '✅' : '❌'}\n`;
    result += `- **Queryable:** ${obj.metadata.queryable ? '✅' : '❌'}\n`;
    if (obj.metadata.searchable !== undefined) {
      result += `- **Searchable:** ${obj.metadata.searchable ? '✅' : '❌'}\n`;
    }
    if (obj.metadata.retrieveable !== undefined) {
      result += `- **Retrieveable:** ${obj.metadata.retrieveable ? '✅' : '❌'}\n`;
    }
  }
  
  // Fields overview with detailed statistics
  result += `\n## 📊 Fields Overview\n`;
  result += `- **Total Fields:** ${obj.field_count}\n`;
  result += `- **Custom Fields:** ${obj.custom_field_count}\n`;
  result += `- **Standard Fields:** ${obj.field_count - obj.custom_field_count}\n`;
  
  // Detailed field information
  if (detailed_fields && obj.fields) {
    result += `\n## 📋 Detailed Field Information\n`;
    
    const fieldEntries = Object.entries(obj.fields);
    const fieldsToShow = max_fields_per_object > 0 ? fieldEntries.slice(0, max_fields_per_object) : fieldEntries;
    
    // Group fields by type for better organization
    const fieldsByType = {};
    for (const [fieldName, field] of fieldsToShow) {
      const type = field.type || 'unknown';
      if (!fieldsByType[type]) {
        fieldsByType[type] = [];
      }
      fieldsByType[type].push([fieldName, field]);
    }
    
    for (const [fieldType, fields] of Object.entries(fieldsByType)) {
      result += `\n### ${fieldType.toUpperCase()} Fields (${fields.length})\n`;
      
      for (const [fieldName, field] of fields) {
        result += `\n**${field.label || fieldName}** (\`${fieldName}\`)\n`;
        result += `- **Type:** ${field.type}\n`;
        result += `- **Required:** ${field.required ? '✅ Yes' : '❌ No'}\n`;
        result += `- **Custom:** ${field.custom ? '✅ Yes' : '❌ No'}\n`;
        result += `- **Updateable:** ${field.updateable ? '✅' : '❌'}\n`;
        result += `- **Createable:** ${field.createable ? '✅' : '❌'}\n`;
        
        // Type-specific information
        if (field.max_length) {
          result += `- **Max Length:** ${field.max_length}\n`;
        }
        if (field.precision !== undefined) {
          result += `- **Precision:** ${field.precision}\n`;
        }
        if (field.scale !== undefined) {
          result += `- **Scale:** ${field.scale}\n`;
        }
        if (field.picklist_values && field.picklist_values.length > 0) {
          result += `- **Picklist Values:** ${field.picklist_values.slice(0, 5).map(v => `"${v}"`).join(', ')}`;
          if (field.picklist_values.length > 5) {
            result += ` (and ${field.picklist_values.length - 5} more)`;
          }
          result += `\n`;
        }
        if (field.references && field.references.length > 0) {
          result += `- **References:** ${field.references.join(', ')}\n`;
        }
        if (field.default_value !== undefined && field.default_value !== null) {
          result += `- **Default Value:** ${field.default_value}\n`;
        }
        if (field.help_text) {
          result += `- **Help Text:** ${field.help_text}\n`;
        }
      }
    }
    
    if (max_fields_per_object > 0 && fieldEntries.length > max_fields_per_object) {
      result += `\n*... and ${fieldEntries.length - max_fields_per_object} more fields*\n`;
    }
  }
  
  // Relationships with complete details
  if (include_relationships && obj.relationships) {
    result += `\n## 🔗 Relationships\n`;
    
    if (obj.relationships.parent_relationships && obj.relationships.parent_relationships.length > 0) {
      result += `\n### Parent Relationships (${obj.relationships.parent_relationships.length})\n`;
      for (const rel of obj.relationships.parent_relationships) {
        result += `- **${rel.field}** → References: ${rel.references.join(', ')}\n`;
      }
    }
    
    if (obj.relationships.child_relationships && obj.relationships.child_relationships.length > 0) {
      result += `\n### Child Relationships (${obj.relationships.child_relationships.length})\n`;
      for (const rel of obj.relationships.child_relationships) {
        result += `- **${rel.child_object}** (Relationship: ${rel.relationship_name})\n`;
        if (rel.field) {
          result += `  - Field: ${rel.field}\n`;
        }
      }
    }
    
    if ((!obj.relationships.parent_relationships || obj.relationships.parent_relationships.length === 0) &&
        (!obj.relationships.child_relationships || obj.relationships.child_relationships.length === 0)) {
      result += `\n*No relationships found for this object.*\n`;
    }
  }
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

function handleFieldSearch(searchTerm, documentation, options) {
  const { show_custom_only, detailed_fields, max_fields_per_object } = options;
  const searchResults = [];
  
  for (const [objectName, obj] of Object.entries(documentation.objects)) {
    if (obj.error) continue;
    
    for (const [fieldName, field] of Object.entries(obj.fields || {})) {
      if (show_custom_only && !field.custom) continue;
      
      const matchesName = fieldName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLabel = field.label?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (matchesName || matchesLabel) {
        searchResults.push({
          object: objectName,
          objectLabel: obj.basic_info.label,
          field: fieldName,
          fieldData: field
        });
      }
    }
  }
  
  if (searchResults.length === 0) {
    return {
      content: [{
        type: "text",
        text: `🔍 **No fields found for: "${searchTerm}"**\n\n` +
              `${show_custom_only ? 'When searching for custom fields, ' : ''}no matching fields were found.\n\n` +
              `💡 **Tips:**\n` +
              `- Try part of the field name\n` +
              `- Search by label instead of API name\n` +
              `- Use \`show_custom_only: false\` to also search standard fields`
      }]
    };
  }
  
  let result = `🔍 **Search results for "${searchTerm}"** (${searchResults.length} fields found)\n\n`;
  
  const groupedResults = {};
  for (const item of searchResults) {
    if (!groupedResults[item.object]) {
      groupedResults[item.object] = [];
    }
    groupedResults[item.object].push(item);
  }
  
  for (const [objectName, fields] of Object.entries(groupedResults)) {
    const objectLabel = fields[0].objectLabel;
    result += `## ${objectLabel} (${objectName})\n`;
    
    const fieldsToShow = max_fields_per_object > 0 ? fields.slice(0, max_fields_per_object) : fields;
    
    for (const item of fieldsToShow) {
      const field = item.fieldData;
      result += `\n### ${field.label || item.field} (\`${item.field}\`)\n`;
      
      if (detailed_fields) {
        result += `- **Type:** ${field.type}\n`;
        result += `- **Required:** ${field.required ? '✅ Yes' : '❌ No'}\n`;
        result += `- **Custom:** ${field.custom ? '✅ Yes' : '❌ No'}\n`;
        result += `- **Updateable:** ${field.updateable ? '✅' : '❌'}\n`;
        result += `- **Createable:** ${field.createable ? '✅' : '❌'}\n`;
        
        if (field.max_length) {
          result += `- **Max Length:** ${field.max_length}\n`;
        }
        if (field.precision !== undefined) {
          result += `- **Precision:** ${field.precision}\n`;
        }
        if (field.scale !== undefined) {
          result += `- **Scale:** ${field.scale}\n`;
        }
        if (field.picklist_values && field.picklist_values.length > 0) {
          result += `- **Picklist Values:** ${field.picklist_values.slice(0, 3).map(v => `"${v}"`).join(', ')}`;
          if (field.picklist_values.length > 3) {
            result += ` (and ${field.picklist_values.length - 3} more)`;
          }
          result += `\n`;
        }
        if (field.references && field.references.length > 0) {
          result += `- **References:** ${field.references.join(', ')}\n`;
        }
        if (field.help_text) {
          result += `- **Help Text:** ${field.help_text}\n`;
        }
      } else {
        const custom = field.custom ? ' 🔧' : '';
        const required = field.required ? ' ⚠️' : '';
        result += `- **Type:** ${field.type}${required}${custom}\n`;
      }
    }
    
    if (max_fields_per_object > 0 && fields.length > max_fields_per_object) {
      result += `\n*... and ${fields.length - max_fields_per_object} more fields in this object*\n`;
    }
    result += '\n';
  }
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

async function handleGeneralOverview(documentation, options) {
  const { show_custom_only, include_relationships, detailed_fields, include_permissions } = options;
  
  let result = `📊 **Salesforce Installation - Complete Overview**\n\n`;
  
  // Add user context if available and check for missing information
  let contextWarning = '';
  try {
    const context = await getUserContext();
    
    // Check if we have basic user information
    const hasPersonalInfo = context.personal?.name && context.personal?.email;
    const hasBusinessInfo = context.business?.company_name && context.business?.industry;
    const hasDataModelInfo = Object.keys(context.data_model || {}).length > 0;
    
    if (hasPersonalInfo || hasBusinessInfo) {
      result = `📊 **Salesforce Installation - Complete Overview**\n`;
      if (context.personal?.name) {
        result += `*Kontext für: ${context.personal.name}`;
        if (context.business?.company_name) {
          result += ` (${context.business.company_name})`;
        }
        result += `*\n\n`;
      }
    }
    
    // Generate warnings for missing context
    const missingContext = [];
    if (!hasPersonalInfo) {
      missingContext.push("👤 **Persönliche Informationen**");
    }
    if (!hasBusinessInfo) {
      missingContext.push("🏢 **Geschäftliche Informationen**");
    }
    if (!hasDataModelInfo && documentation.summary?.custom_objects > 0) {
      missingContext.push("🗃️ **Datenmodell-Kontext**");
    }
    
    if (missingContext.length > 0) {
      contextWarning = `\n## ⚠️ Fehlender Kontext für bessere Unterstützung\n\n`;
      contextWarning += `Um Ihnen personalisierte und kontextbezogene Hilfe zu bieten, fehlen noch wichtige Informationen:\n\n`;
      for (const missing of missingContext) {
        contextWarning += `- ${missing}\n`;
      }
      contextWarning += `\n💡 **Empfehlung:** Starten Sie das Kontext-Interview:\n`;
      contextWarning += `\`\`\`json\n`;
      contextWarning += `{\n`;
      contextWarning += `  "tool": "salesforce_learn_context",\n`;
      contextWarning += `  "action": "start_interview"\n`;
      contextWarning += `}\n`;
      contextWarning += `\`\`\`\n\n`;
      
      if (hasPersonalInfo && hasBusinessInfo && !hasDataModelInfo) {
        contextWarning += `Oder für erweiterte Datenmodell-Fragen:\n`;
        contextWarning += `\`\`\`json\n`;
        contextWarning += `{\n`;
        contextWarning += `  "tool": "salesforce_learn_context",\n`;
        contextWarning += `  "action": "suggest_questions",\n`;
        contextWarning += `  "context_type": "data_model"\n`;
        contextWarning += `}\n`;
        contextWarning += `\`\`\`\n\n`;
      }
      contextWarning += `---\n\n`;
    }
    
  } catch (error) {
    // Context not available, suggest learning it
    contextWarning = `\n## 💡 Personalisierung verfügbar\n\n`;
    contextWarning += `Für bessere, personalisierte Unterstützung können Sie ein Kontext-Interview durchführen:\n\n`;
    contextWarning += `\`\`\`json\n`;
    contextWarning += `{\n`;
    contextWarning += `  "tool": "salesforce_learn_context",\n`;
    contextWarning += `  "action": "start_interview"\n`;
    contextWarning += `}\n`;
    contextWarning += `\`\`\`\n\n`;
    contextWarning += `Dies hilft mir, Sie und Ihr Unternehmen kennenzulernen.\n\n`;
    contextWarning += `---\n\n`;
  }
  
  // Add context warning if needed
  result += contextWarning;
  
  // Enhanced metadata info
  result += `## 📋 Installation Metadata\n`;
  result += `- **Last Learned:** ${new Date(documentation.metadata.learned_at).toLocaleString()}\n`;
  if (documentation.metadata.salesforce_instance) {
    result += `- **Salesforce Instance:** ${documentation.metadata.salesforce_instance}\n`;
  }
  result += `- **API Version:** ${documentation.metadata.api_version}\n`;
  if (documentation.metadata.learning_options) {
    result += `- **Learning Options:**\n`;
    result += `  - Include Unused: ${documentation.metadata.learning_options.include_unused}\n`;
    result += `  - Detailed Relationships: ${documentation.metadata.learning_options.detailed_relationships}\n`;
  }
  
  // Enhanced summary with more statistics
  result += `\n## 📊 Installation Statistics\n`;
  result += `- **Total Objects:** ${documentation.summary.total_objects}\n`;
  result += `- **Standard Objects:** ${documentation.summary.standard_objects}\n`;
  result += `- **Custom Objects:** ${documentation.summary.custom_objects}\n`;
  result += `- **Total Fields:** ${documentation.summary.total_fields}\n`;
  result += `- **Custom Fields:** ${documentation.summary.custom_fields}\n`;
  
  // Calculate additional statistics
  const objectsWithErrors = Object.values(documentation.objects).filter(obj => obj.error).length;
  if (objectsWithErrors > 0) {
    result += `- **Objects with Errors:** ${objectsWithErrors}\n`;
  }
  
  // Field type statistics
  const fieldTypes = {};
  let totalRelationships = 0;
  
  for (const [objectName, obj] of Object.entries(documentation.objects)) {
    if (obj.error) continue;
    
    if (obj.relationships) {
      totalRelationships += (obj.relationships.parent_relationships?.length || 0) + 
                           (obj.relationships.child_relationships?.length || 0);
    }
    
    for (const [fieldName, field] of Object.entries(obj.fields || {})) {
      const type = field.type || 'unknown';
      fieldTypes[type] = (fieldTypes[type] || 0) + 1;
    }
  }
  
  if (include_relationships) {
    result += `- **Total Relationships:** ${totalRelationships}\n`;
  }
  
  // Field type breakdown
  if (detailed_fields && Object.keys(fieldTypes).length > 0) {
    result += `\n### Field Type Distribution\n`;
    const sortedTypes = Object.entries(fieldTypes).sort(([,a], [,b]) => b - a);
    for (const [type, count] of sortedTypes.slice(0, 10)) {
      result += `- **${type}:** ${count} fields\n`;
    }
    if (sortedTypes.length > 10) {
      result += `- *... and ${sortedTypes.length - 10} more field types*\n`;
    }
  }
  
  // Complete object list with detailed information
  const objects = Object.entries(documentation.objects)
    .filter(([name, obj]) => !obj.error && (!show_custom_only || obj.basic_info.custom))
    .sort(([a], [b]) => a.localeCompare(b));
  
  if (objects.length > 0) {
    result += `\n## 📦 ${show_custom_only ? 'Custom Objects' : 'All Objects'} (${objects.length})\n`;
    
    for (const [objectName, obj] of objects) {
      const custom = obj.basic_info.custom ? ' 🔧' : '';
      const hasRelationships = obj.relationships && 
        ((obj.relationships.parent_relationships?.length || 0) + (obj.relationships.child_relationships?.length || 0)) > 0;
      const relationshipIndicator = include_relationships && hasRelationships ? ' 🔗' : '';
      
      result += `\n### ${obj.basic_info.label} (\`${objectName}\`)${custom}${relationshipIndicator}\n`;
      result += `- **Fields:** ${obj.field_count} total, ${obj.custom_field_count} custom\n`;
      
      if (include_permissions && obj.metadata) {
        const permissions = [];
        if (obj.metadata.createable) permissions.push('Create');
        if (obj.metadata.updateable) permissions.push('Update');
        if (obj.metadata.deletable) permissions.push('Delete');
        if (obj.metadata.queryable) permissions.push('Query');
        result += `- **Permissions:** ${permissions.join(', ')}\n`;
      }
      
      if (include_relationships && obj.relationships) {
        const parentCount = obj.relationships.parent_relationships?.length || 0;
        const childCount = obj.relationships.child_relationships?.length || 0;
        if (parentCount > 0 || childCount > 0) {
          result += `- **Relationships:** ${parentCount} parent, ${childCount} child\n`;
        }
      }
      
      // Show some important fields
      if (detailed_fields && obj.fields) {
        const importantFields = Object.entries(obj.fields)
          .filter(([name, field]) => field.required || field.custom || ['Name', 'Email'].includes(name))
          .slice(0, 3);
        
        if (importantFields.length > 0) {
          result += `- **Key Fields:** ${importantFields.map(([name, field]) => {
            const indicators = [];
            if (field.required) indicators.push('⚠️');
            if (field.custom) indicators.push('🔧');
            return `${field.label || name}${indicators.join('')}`;
          }).join(', ')}\n`;
        }
      }
    }
  }
  
  // Objects with errors
  const errorObjects = Object.entries(documentation.objects)
    .filter(([name, obj]) => obj.error);
  
  if (errorObjects.length > 0) {
    result += `\n## ⚠️ Objects with Analysis Errors (${errorObjects.length})\n`;
    for (const [objectName, obj] of errorObjects.slice(0, 10)) {
      result += `- **${objectName}:** ${obj.error}\n`;
    }
    if (errorObjects.length > 10) {
      result += `- *... and ${errorObjects.length - 10} more objects with errors*\n`;
    }
  }
  
  result += `\n## 💡 Usage Tips\n`;
  result += `- **Specific Object:** Use \`object_name: "ObjectName"\` for complete object details\n`;
  result += `- **Field Search:** Use \`field_search: "searchterm"\` to find specific fields\n`;
  result += `- **Custom Only:** Use \`show_custom_only: true\` to focus on customizations\n`;
  result += `- **Detailed Fields:** Use \`detailed_fields: true\` for complete field information\n`;
  result += `- **Relationships:** Use \`include_relationships: true\` for relationship mapping\n`;
  result += `- **Limit Results:** Use \`max_fields_per_object: N\` to limit field display\n`;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}
