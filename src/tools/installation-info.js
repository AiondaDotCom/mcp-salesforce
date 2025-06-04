/**
 * Salesforce Installation Info Tool
 * 
 * This tool provides information about the learned Salesforce installation,
 * including objects, fields, and customizations.
 */

import { getInstallationDocumentation, hasInstallationDocumentation } from './learn.js';
import { logger } from '../utils/debug.js';

export const salesforceInstallationInfoTool = {
  name: "salesforce_installation_info",
  description: "Returns information about the learned Salesforce installation, showing available objects, custom fields, and customizations.",
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
        default: false
      }
    }
  }
};

export async function handleSalesforceInstallationInfo(args) {
  const { object_name, field_search, show_custom_only = false, include_relationships = false } = args;
  
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
      return handleSpecificObjectInfo(object_name, documentation, include_relationships);
    }
    
    // Handle field search
    if (field_search) {
      return handleFieldSearch(field_search, documentation, show_custom_only);
    }
    
    // General installation overview
    return handleGeneralOverview(documentation, show_custom_only, include_relationships);
    
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

function handleSpecificObjectInfo(objectName, documentation, includeRelationships) {
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
  
  // Basic info
  result += `**Basic Information:**\n`;
  result += `- **API Name:** ${obj.basic_info.name}\n`;
  result += `- **Label:** ${obj.basic_info.label}\n`;
  result += `- **Plural Label:** ${obj.basic_info.label_plural}\n`;
  result += `- **Custom Object:** ${obj.basic_info.custom ? '✅ Yes' : '❌ No'}\n\n`;
  
  // Permissions
  result += `**Permissions:**\n`;
  result += `- **Create:** ${obj.metadata.createable ? '✅' : '❌'}\n`;
  result += `- **Update:** ${obj.metadata.updateable ? '✅' : '❌'}\n`;
  result += `- **Delete:** ${obj.metadata.deletable ? '✅' : '❌'}\n`;
  result += `- **Query:** ${obj.metadata.queryable ? '✅' : '❌'}\n\n`;
  
  // Fields summary
  result += `**Fields Overview:**\n`;
  result += `- **${obj.field_count}** total fields\n`;
  result += `- **${obj.custom_field_count}** custom fields\n\n`;
  
  // Important fields
  const importantFields = Object.entries(obj.fields).filter(([name, field]) => 
    field.custom || field.required || ['Name', 'Email', 'Phone', 'Website'].includes(name)
  );
  
  if (importantFields.length > 0) {
    result += `**Important Fields:**\n`;
    for (const [name, field] of importantFields.slice(0, 15)) {
      const required = field.required ? ' ⚠️' : '';
      const custom = field.custom ? ' 🔧' : '';
      result += `- **${field.label}** (\`${name}\`) - ${field.type}${required}${custom}\n`;
    }
    if (importantFields.length > 15) {
      result += `- ... and ${importantFields.length - 15} more fields\n`;
    }
    result += '\n';
  }
  
  // Relationships
  if (includeRelationships && (obj.relationships.parent_relationships.length > 0 || obj.relationships.child_relationships.length > 0)) {
    result += `**Relationships:**\n`;
    
    if (obj.relationships.parent_relationships.length > 0) {
      result += `*Parent objects:*\n`;
      for (const rel of obj.relationships.parent_relationships) {
        result += `- ${rel.field} → ${rel.references.join(', ')}\n`;
      }
    }
    
    if (obj.relationships.child_relationships.length > 0) {
      result += `*Child objects:*\n`;
      for (const rel of obj.relationships.child_relationships.slice(0, 10)) {
        result += `- ${rel.child_object} (${rel.relationship_name})\n`;
      }
      if (obj.relationships.child_relationships.length > 10) {
        result += `- ... and ${obj.relationships.child_relationships.length - 10} more\n`;
      }
    }
  }
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}

function handleFieldSearch(searchTerm, documentation, showCustomOnly) {
  const searchResults = [];
  
  for (const [objectName, obj] of Object.entries(documentation.objects)) {
    if (obj.error) continue;
    
    for (const [fieldName, field] of Object.entries(obj.fields || {})) {
      if (showCustomOnly && !field.custom) continue;
      
      const matchesName = fieldName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLabel = field.label?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (matchesName || matchesLabel) {
        searchResults.push({
          object: objectName,
          objectLabel: obj.basic_info.label,
          field: fieldName,
          fieldLabel: field.label,
          type: field.type,
          custom: field.custom,
          required: field.required
        });
      }
    }
  }
  
  if (searchResults.length === 0) {
    return {
      content: [{
        type: "text",
        text: `🔍 **No fields found for: "${searchTerm}"**\n\n` +
              `${showCustomOnly ? 'When searching for custom fields, ' : ''}no matching fields were found.\n\n` +
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
    result += `**${objectLabel} (${objectName}):**\n`;
    
    for (const field of fields.slice(0, 5)) {
      const custom = field.custom ? ' 🔧' : '';
      const required = field.required ? ' ⚠️' : '';
      result += `- **${field.fieldLabel}** (\`${field.field}\`) - ${field.type}${required}${custom}\n`;
    }
    
    if (fields.length > 5) {
      result += `- ... and ${fields.length - 5} more fields\n`;
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

function handleGeneralOverview(documentation, showCustomOnly, includeRelationships) {
  let result = `📊 **Salesforce Installation Overview**\n\n`;
  
  // Metadata info
  result += `**Last Update:** ${new Date(documentation.metadata.learned_at).toLocaleString()}\n`;
  result += `**Salesforce Instance:** ${documentation.metadata.salesforce_instance}\n`;
  result += `**API Version:** ${documentation.metadata.api_version}\n\n`;
  
  // Summary
  result += `**Summary:**\n`;
  result += `- **${documentation.summary.total_objects}** total objects\n`;
  result += `- **${documentation.summary.standard_objects}** standard objects\n`;
  result += `- **${documentation.summary.custom_objects}** custom objects\n`;
  result += `- **${documentation.summary.total_fields}** total fields\n`;
  result += `- **${documentation.summary.custom_fields}** custom fields\n\n`;
  
  // Object list
  const objects = Object.entries(documentation.objects)
    .filter(([name, obj]) => !obj.error && (!showCustomOnly || obj.basic_info.custom))
    .sort(([a], [b]) => a.localeCompare(b));
  
  if (objects.length > 0) {
    result += `**${showCustomOnly ? 'Custom Objects' : 'Available Objects'}:**\n`;
    
    for (const [objectName, obj] of objects.slice(0, 20)) {
      const custom = obj.basic_info.custom ? ' 🔧' : '';
      result += `- **${obj.basic_info.label}** (\`${objectName}\`) - ${obj.field_count} Fields${custom}\n`;
    }
    
    if (objects.length > 20) {
      result += `- ... and ${objects.length - 20} more objects\n`;
    }
    result += '\n';
  }
  
  // Custom objects highlight
  if (!showCustomOnly && documentation.summary.custom_objects > 0) {
    const customObjects = Object.entries(documentation.objects)
      .filter(([name, obj]) => !obj.error && obj.basic_info.custom)
      .slice(0, 10);
    
    result += `**🔧 Custom Objects (Selection):**\n`;
    for (const [objectName, obj] of customObjects) {
      result += `- **${obj.basic_info.label}** (\`${objectName}\`) - ${obj.custom_field_count} Custom Fields\n`;
    }
    if (documentation.summary.custom_objects > 10) {
      result += `- ... and ${documentation.summary.custom_objects - 10} more Custom Objects\n`;
    }
    result += '\n';
  }
  
  result += `💡 **Additional Options:**\n`;
  result += `- Use \`object_name\` for details about a specific object\n`;
  result += `- Use \`field_search\` to search for specific fields\n`;
  result += `- Use \`show_custom_only: true\` to show only customizations\n`;
  result += `- Use \`include_relationships: true\` for relationship information`;
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}
