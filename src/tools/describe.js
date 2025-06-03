export const describeTool = {
  name: "salesforce_describe",
  description: "Get detailed schema information for any Salesforce object, including all fields, data types, and permissions.",
  inputSchema: {
    type: "object",
    properties: {
      sobject: {
        type: "string",
        description: "SObject API name to describe (e.g., 'Contact', 'Account', 'CustomObject__c'). Leave empty to get list of all available objects."
      }
    },
    required: []
  }
};

export async function executeDescribe(client, args) {
  try {
    const { sobject } = args;
    
    // If no sobject specified, return list of all available objects
    if (!sobject) {
      const sobjects = await client.describeGlobal();
      
      const standardObjects = sobjects.filter(obj => !obj.custom).slice(0, 20);
      const customObjects = sobjects.filter(obj => obj.custom);
      
      return {
        content: [
          {
            type: "text",
            text: `📊 Available Salesforce Objects (${sobjects.length} total)\n\n` +
                  `Standard Objects (showing first 20):\n` +
                  standardObjects.map(obj => 
                    `• ${obj.name} (${obj.label}) - Create: ${obj.createable}, Update: ${obj.updateable}, Delete: ${obj.deletable}`
                  ).join('\n') +
                  (sobjects.filter(obj => !obj.custom).length > 20 ? '\n... and more standard objects\n' : '\n') +
                  `\nCustom Objects:\n` +
                  (customObjects.length > 0 
                    ? customObjects.map(obj => 
                        `• ${obj.name} (${obj.label}) - Create: ${obj.createable}, Update: ${obj.updateable}, Delete: ${obj.deletable}`
                      ).join('\n')
                    : 'No custom objects found'
                  ) +
                  `\n\nTo get detailed information about a specific object, use:\n` +
                  `salesforce_describe with sobject parameter (e.g., "Contact", "Account")`
          }
        ]
      };
    }

    if (typeof sobject !== 'string') {
      throw new Error('sobject parameter must be a string');
    }

    const schema = await client.describe(sobject);
    
    // Categorize fields
    const requiredFields = schema.fields.filter(f => f.required);
    const createableFields = schema.fields.filter(f => f.createable);
    const updateableFields = schema.fields.filter(f => f.updateable);
    const picklistFields = schema.fields.filter(f => f.type === 'picklist' && f.picklistValues.length > 0);
    const referenceFields = schema.fields.filter(f => f.type === 'reference' && f.referenceTo.length > 0);
    
    return {
      content: [
        {
          type: "text",
          text: `📋 ${schema.label} (${schema.name}) Schema Information\n\n` +
                `Object Details:\n` +
                `• Label: ${schema.label} (Plural: ${schema.labelPlural})\n` +
                `• API Name: ${schema.name}\n` +
                `• Key Prefix: ${schema.keyPrefix || 'N/A'}\n` +
                `• Permissions: Create: ${schema.createable}, Update: ${schema.updateable}, Delete: ${schema.deletable}, Query: ${schema.queryable}\n` +
                `• Total Fields: ${schema.fields.length}\n\n` +
                
                `Required Fields (${requiredFields.length}):\n` +
                (requiredFields.length > 0 
                  ? requiredFields.map(f => `• ${f.name} (${f.label}) - ${f.type}`).join('\n')
                  : 'None'
                ) + '\n\n' +
                
                `Key Fields for Operations:\n` +
                `Createable Fields: ${createableFields.length}\n` +
                `Updateable Fields: ${updateableFields.length}\n\n` +
                
                (picklistFields.length > 0 
                  ? `Picklist Fields:\n` + 
                    picklistFields.map(f => 
                      `• ${f.name} (${f.label}): ${f.picklistValues.map(p => p.value).join(', ')}`
                    ).join('\n') + '\n\n'
                  : ''
                ) +
                
                (referenceFields.length > 0 
                  ? `Reference Fields (Lookups):\n` + 
                    referenceFields.map(f => 
                      `• ${f.name} (${f.label}) → ${f.referenceTo.join(', ')}`
                    ).join('\n') + '\n\n'
                  : ''
                ) +
                
                `Common Fields for SOQL:\n` +
                schema.fields
                  .filter(f => ['Id', 'Name', 'CreatedDate', 'LastModifiedDate'].includes(f.name) || 
                              f.name.includes('Email') || f.name.includes('Phone'))
                  .map(f => `• ${f.name} (${f.label}) - ${f.type}`)
                  .join('\n') +
                
                `\n\nExample SOQL Query:\n` +
                `SELECT Id, ${schema.fields.filter(f => f.name !== 'Id').slice(0, 5).map(f => f.name).join(', ')} FROM ${schema.name} LIMIT 10`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to describe ${args.sobject || 'objects'}: ${error.message}\n\n` +
                `Common issues:\n` +
                `- Object name not found (check spelling and API name)\n` +
                `- Insufficient permissions to access object metadata\n` +
                `- Object may not be queryable\n\n` +
                `Tip: Object API names are case-sensitive. Use exact API names like:\n` +
                `- Standard objects: "Account", "Contact", "Opportunity"\n` +
                `- Custom objects: end with "__c" like "CustomObject__c"`
        }
      ],
      isError: true
    };
  }
}
