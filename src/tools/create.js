import { hasInstallationDocumentation, getInstallationDocumentation } from './learn.js';

export const createTool = {
  name: "salesforce_create",
  description: "Create a new record in any Salesforce object. Automatically handles required fields validation.",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name (e.g., 'Contact', 'Account', 'CustomObject__c'). Use exact API names."
      },
      data: {
        type: "object",
        description: "Field values for the new record. Use API field names as keys (e.g., {'FirstName': 'John', 'LastName': 'Doe', 'Email': 'john@example.com'})"
      }
    },
    required: ["sobject", "data"]
  }
};

export async function executeCreate(client, args) {
  try {
    const { sobject, data } = args;
    
    // Check if installation has been learned and provide helpful context
    const hasDocumentation = await hasInstallationDocumentation();
    let contextMessage = '';
    
    if (!hasDocumentation) {
      contextMessage = `⚠️ **Tipp:** Die Salesforce-Installation wurde noch nicht analysiert. Verwende \`salesforce_learn\` um alle verfügbaren Objekte und Felder kennenzulernen.\n\n`;
    } else {
      // Provide context about the object if available
      const documentation = await getInstallationDocumentation();
      const objectInfo = documentation.objects[sobject];
      if (objectInfo && !objectInfo.error) {
        const requiredFields = Object.entries(objectInfo.fields)
          .filter(([name, field]) => field.required)
          .map(([name, field]) => `${field.label} (${name})`);
        
        if (requiredFields.length > 0) {
          contextMessage = `💡 **Required fields for ${objectInfo.basic_info.label}:** ${requiredFields.join(', ')}\n\n`;
        }
        
        // Check for read-only fields in the provided data
        const readOnlyFieldsInData = Object.keys(data).filter(fieldName => {
          const field = objectInfo.fields[fieldName];
          return field && field.writability && field.writability.read_only;
        });
        
        if (readOnlyFieldsInData.length > 0) {
          const readOnlyWarnings = readOnlyFieldsInData.map(fieldName => {
            const field = objectInfo.fields[fieldName];
            return `- ${field.label || fieldName} (${fieldName})`;
          }).join('\n');
          
          contextMessage += `⚠️ **Warning: Read-only fields detected in data:**\n${readOnlyWarnings}\n\n` +
                           `These fields cannot be set during record creation and will be ignored by Salesforce.\n\n`;
        }
      }
    }
    
    if (!sobject || typeof sobject !== 'string') {
      throw new Error('sobject parameter is required and must be a string');
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('data parameter is required and must be an object');
    }

    // Validate data is not empty
    if (Object.keys(data).length === 0) {
      throw new Error('data object cannot be empty');
    }

    const result = await client.create(sobject, data);
    
    return {
      content: [
        {
          type: "text",
          text: `${contextMessage}✅ Successfully created ${sobject} record!\n\n` +
                `Record ID: ${result.id}\n` +
                `Object Type: ${result.sobject}\n\n` +
                `Created with data:\n${JSON.stringify(data, null, 2)}\n\n` +
                `You can view this record in Salesforce or query it using:\n` +
                `SELECT Id, * FROM ${sobject} WHERE Id = '${result.id}'`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to create ${args.sobject || 'record'}: ${error.message}\n\n` +
                `Common issues:\n` +
                `- Required fields missing (use salesforce_describe to see required fields)\n` +
                `- Invalid field names (use API names, not labels)\n` +
                `- Invalid data types or formats\n` +
                `- Insufficient permissions\n` +
                `- Validation rule failures\n\n` +
                `Tip: Use salesforce_describe to get field information for ${args.sobject || 'the object'}`
        }
      ],
      isError: true
    };
  }
}
