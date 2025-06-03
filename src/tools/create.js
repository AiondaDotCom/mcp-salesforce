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
          text: `✅ Successfully created ${sobject} record!\n\n` +
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
