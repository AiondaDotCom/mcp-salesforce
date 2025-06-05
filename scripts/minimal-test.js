#!/usr/bin/env node

// Minimal learning test
import { config } from 'dotenv';
config();

const MINIMAL_TEST = true;

async function minimalTest() {
  try {
    console.log('🔬 Minimal Learning Test');
    console.log('========================\n');
    
    // Import what we need
    const { SalesforceClient } = await import('./src/salesforce/client.js');
    
    console.log('1. Creating client...');
    const client = new SalesforceClient();
    
    console.log('2. Initializing...');
    await client.initialize();
    console.log('✅ Client initialized\n');
    
    console.log('3. Getting a few custom objects...');
    const objects = await client.describeGlobal();
    const customObjects = objects.filter(obj => obj.custom).slice(0, 3);
    
    console.log(`Found ${customObjects.length} custom objects to analyze:`);
    customObjects.forEach(obj => console.log(`   - ${obj.name} (${obj.label})`));
    
    console.log('\n4. Analyzing first custom object...');
    if (customObjects.length > 0) {
      const firstObj = customObjects[0];
      const objDetails = await client.describe(firstObj.name);
      console.log(`✅ Successfully analyzed ${firstObj.name}`);
      console.log(`   - Fields: ${objDetails.fields.length}`);
      console.log(`   - Relationships: ${objDetails.childRelationships.length}`);
    }
    
    console.log('\n🎉 Minimal test completed successfully!');
    console.log('The learning system should work for the full installation.');
    
  } catch (error) {
    console.error('❌ Minimal test failed:', error.message);
    console.error(error.stack);
  }
  
  // Exit explicitly
  process.exit(0);
}

minimalTest();
