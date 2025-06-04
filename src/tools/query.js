import { hasInstallationDocumentation } from './learn.js';

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
    
    // Check if installation has been learned
    const hasDocumentation = await hasInstallationDocumentation();
    if (!hasDocumentation) {
      return {
        content: [{
          type: "text",
          text: `⚠️ **Salesforce-Installation noch nicht gelernt**\n\n` +
                `Bevor du SOQL-Abfragen ausführst, sollte die KI deine Salesforce-Installation kennenlernen.\n\n` +
                `🚀 **Empfehlung:** Führe zuerst das \`salesforce_learn\` Tool aus, um alle verfügbaren Objekte und Felder zu analysieren.\n\n` +
                `Danach kann ich dir bei intelligenten Abfragen helfen und die richtigen Feld- und Objektnamen vorschlagen.\n\n` +
                `**Deine Abfrage wird trotzdem ausgeführt:**`
        }]
      };
    }
    
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
                `Query: ${args.query || 'N/A'}\n\n` +
                `Common issues:\n` +
                `- Check field names (case-sensitive)\n` +
                `- Verify object name exists\n` +
                `- Ensure you have read permissions\n` +
                `- Use single quotes for string literals\n\n` +
                `SOQL Syntax Help:\n` +
                `- SELECT Id, Name FROM Account LIMIT 10\n` +
                `- SELECT Id, Name FROM Contact WHERE Email != null\n` +
                `- SELECT Id, Name FROM Opportunity WHERE Amount > 1000`
        }
      ],
      isError: true
    };
  }
}
