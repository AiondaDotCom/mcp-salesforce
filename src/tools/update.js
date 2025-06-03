export const updateTool = {
  name: "salesforce_update",
  description: "Update an existing record in any Salesforce object. Requires the record ID and field values to update.",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name (e.g., 'Contact', 'Account', 'CustomObject__c')"
      },
      id: {
        type: "string",
        description: "Salesforce record ID (15 or 18 character ID)"
      },
      data: {
        type: "object",
        description: "Field values to update. Only include fields you want to change (e.g., {'Email': 'newemail@example.com', 'Phone': '555-1234'})"
      }
    },
    required: ["sobject", "id", "data"]
  }
};

export async function executeUpdate(client, args) {
  try {
    const { sobject, id, data } = args;
    
    if (!sobject || typeof sobject !== 'string') {
      throw new Error('sobject parameter is required and must be a string');
    }

    if (!id || typeof id !== 'string') {
      throw new Error('id parameter is required and must be a string');
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('data parameter is required and must be an object');
    }

    // Validate data is not empty
    if (Object.keys(data).length === 0) {
      throw new Error('data object cannot be empty - specify at least one field to update');
    }

    // Validate ID format (basic check)
    if (id.length !== 15 && id.length !== 18) {
      throw new Error('Invalid Salesforce ID format. ID must be 15 or 18 characters long.');
    }

    // Remove Id from data if accidentally included
    const updateData = { ...data };
    delete updateData.Id;
    delete updateData.id;

    const result = await client.update(sobject, id, updateData);
    
    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully updated ${sobject} record!\n\n` +
                `Record ID: ${result.id}\n` +
                `Object Type: ${result.sobject}\n\n` +
                `Updated fields:\n${JSON.stringify(updateData, null, 2)}\n\n` +
                `You can view the updated record using:\n` +
                `SELECT Id, * FROM ${sobject} WHERE Id = '${result.id}'`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to update ${args.sobject || 'record'}: ${error.message}\n\n` +
                `Common issues:\n` +
                `- Record not found (check the ID)\n` +
                `- Invalid field names (use API names, not labels)\n` +
                `- Read-only fields (some fields cannot be updated)\n` +
                `- Invalid data types or formats\n` +
                `- Insufficient permissions\n` +
                `- Validation rule failures\n\n` +
                `Record ID provided: ${args.id}\n` +
                `Tip: Use salesforce_describe to check which fields are updateable`
        }
      ],
      isError: true
    };
  }
}
