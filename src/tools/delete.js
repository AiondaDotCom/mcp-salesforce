export const deleteTool = {
  name: "salesforce_delete",
  description: "Delete a record from any Salesforce object. This action is permanent and cannot be undone.",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name (e.g., 'Contact', 'Account', 'CustomObject__c')"
      },
      id: {
        type: "string",
        description: "Salesforce record ID to delete (15 or 18 character ID)"
      }
    },
    required: ["sobject", "id"]
  }
};

export async function executeDelete(client, args) {
  try {
    const { sobject, id } = args;
    
    if (!sobject || typeof sobject !== 'string') {
      throw new Error('sobject parameter is required and must be a string');
    }

    if (!id || typeof id !== 'string') {
      throw new Error('id parameter is required and must be a string');
    }

    // Validate ID format (basic check)
    if (id.length !== 15 && id.length !== 18) {
      throw new Error('Invalid Salesforce ID format. ID must be 15 or 18 characters long.');
    }

    const result = await client.delete(sobject, id);
    
    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully deleted ${sobject} record!\n\n` +
                `Deleted Record ID: ${result.id}\n` +
                `Object Type: ${result.sobject}\n\n` +
                `⚠️  This action is permanent and cannot be undone.\n` +
                `The record has been moved to the Recycle Bin and will be permanently deleted after 15 days.`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to delete ${args.sobject || 'record'}: ${error.message}\n\n` +
                `Common issues:\n` +
                `- Record not found (check the ID)\n` +
                `- Record cannot be deleted (may have dependencies)\n` +
                `- Insufficient permissions\n` +
                `- Record is referenced by other records\n` +
                `- Object deletion is not allowed\n\n` +
                `Record ID provided: ${args.id}\n` +
                `Object Type: ${args.sobject}\n\n` +
                `Tip: Some records cannot be deleted if they are referenced by other records. ` +
                `You may need to delete dependent records first.`
        }
      ],
      isError: true
    };
  }
}
