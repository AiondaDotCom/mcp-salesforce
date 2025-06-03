export const queryTool = {
  name: "salesforce_query",
  description: "Execute SOQL queries against any Salesforce object. Supports SELECT, WHERE, ORDER BY, LIMIT, and other SOQL features.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SOQL query string (e.g., 'SELECT Id, Name FROM Account WHERE Industry = \\'Technology\\' LIMIT 10'). Use proper SOQL syntax with single quotes for string literals."
      }
    },
    required: ["query"]
  }
};

export async function executeQuery(client, args) {
  try {
    const { query } = args;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Query parameter is required and must be a string');
    }

    // Basic SOQL validation
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Query must be a SELECT statement');
    }

    const result = await client.query(query);
    
    return {
      content: [
        {
          type: "text",
          text: `SOQL Query Results:\n\n` +
                `Query: ${query}\n` +
                `Total Records: ${result.totalSize}\n` +
                `Records Returned: ${result.records.length}\n` +
                `More Records Available: ${!result.done}\n\n` +
                `Results:\n${JSON.stringify(result.records, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text", 
          text: `❌ Query failed: ${error.message}\n\n` +
                `Tip: Ensure your query uses proper SOQL syntax:\n` +
                `- Use SELECT field1, field2 FROM ObjectName\n` +
                `- Use single quotes for string literals\n` +
                `- Check field names and object names are correct`
        }
      ],
      isError: true
    };
  }
}
