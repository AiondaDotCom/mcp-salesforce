import { FileStorageManager } from '../auth/file-storage.js';

/**
 * Repair credentials that were accidentally set to null
 * This is a one-time fix for the bug where credentials were overwritten with null
 */
export async function repairCredentials() {
  const fileStorage = new FileStorageManager();
  
  try {
    const data = await fileStorage.getAllData();
    
    console.log('Current data:', data);
    
    if (data.access_token && data.refresh_token && (!data.clientId || !data.clientSecret)) {
      console.log('🔍 Found tokens without credentials - this is the bug!');
      
      // We need to ask the user for the credentials
      console.log('❗ We need to restore the missing credentials.');
      console.log('Please provide the following information:');
      console.log('1. SALESFORCE_CLIENT_ID (Consumer Key from your Connected App)');
      console.log('2. SALESFORCE_CLIENT_SECRET (Consumer Secret from your Connected App)');
      console.log('');
      console.log('You can find these in your Salesforce Setup > App Manager > Your Connected App > View');
      
      // For now, we'll create a temporary fix that preserves the tokens
      // but allows the system to work
      const repairedData = {
        ...data,
        clientId: data.clientId || 'NEEDS_REPAIR',
        clientSecret: data.clientSecret || 'NEEDS_REPAIR',
        instanceUrl: data.instanceUrl || data.instance_url,
        credentialsStoredAt: data.credentialsStoredAt || new Date().toISOString(),
        repaired: true,
        repairNote: 'Credentials were null due to bug - needs manual repair'
      };
      
      await fileStorage.storeCredentials({
        clientId: 'NEEDS_REPAIR',
        clientSecret: 'NEEDS_REPAIR', 
        instanceUrl: data.instanceUrl || data.instance_url
      });
      
      console.log('✅ Temporary repair applied. You can now use the system, but please update credentials.');
      
      return {
        success: true,
        message: 'Temporary repair applied',
        nextSteps: [
          'Get your Client ID and Client Secret from Salesforce Setup',
          'Run the setup tool to properly configure credentials',
          'Your existing tokens will be preserved'
        ]
      };
    }
    
    console.log('✅ No repair needed - credentials look correct');
    return {
      success: true,
      message: 'No repair needed'
    };
    
  } catch (error) {
    console.error('❌ Repair failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  repairCredentials().then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}