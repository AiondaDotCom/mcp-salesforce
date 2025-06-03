# Usage Examples

Comprehensive examples of using the MCP Salesforce Server with Claude Desktop.

## Quick Reference

| Tool | Purpose | Example |
|------|---------|---------|
| `salesforce_query` | Execute SOQL queries | Get recent contacts |
| `salesforce_create` | Create new records | Add new contact |
| `salesforce_update` | Update existing records | Change email address |
| `salesforce_delete` | Delete records | Remove test data |
| `salesforce_describe` | Get schema info | See Contact fields |

## Query Examples

### Basic Queries

**Get Recent Contacts**
```
Show me the 10 most recent contacts created this month
```
*Behind the scenes:*
```sql
SELECT Id, FirstName, LastName, Email, CreatedDate 
FROM Contact 
WHERE CreatedDate = THIS_MONTH 
ORDER BY CreatedDate DESC 
LIMIT 10
```

**Find Accounts by Industry**
```
Find all technology companies in our Salesforce
```
*SOQL:*
```sql
SELECT Id, Name, Industry, Website, Phone 
FROM Account 
WHERE Industry = 'Technology'
```

**Search for Contacts by Email Domain**
```
Find all contacts with gmail.com email addresses
```
*SOQL:*
```sql
SELECT Id, Name, Email, Account.Name 
FROM Contact 
WHERE Email LIKE '%gmail.com'
```

### Advanced Queries

**Opportunities Closing This Quarter**
```
What opportunities are closing this quarter with amounts over $10,000?
```
*SOQL:*
```sql
SELECT Id, Name, Amount, CloseDate, StageName, Account.Name 
FROM Opportunity 
WHERE CloseDate = THIS_QUARTER 
AND Amount > 10000 
ORDER BY Amount DESC
```

**Contacts Without Activities**
```
Find contacts who haven't been contacted in the last 30 days
```
*SOQL:*
```sql
SELECT Id, Name, Email, LastActivityDate 
FROM Contact 
WHERE LastActivityDate < LAST_N_DAYS:30 
OR LastActivityDate = null
```

**Cross-Object Relationships**
```
Show me accounts with their related contacts and recent opportunities
```
*SOQL:*
```sql
SELECT Id, Name, Industry, 
       (SELECT Id, Name, Email FROM Contacts LIMIT 5),
       (SELECT Id, Name, Amount FROM Opportunities 
        WHERE CreatedDate = THIS_YEAR LIMIT 3)
FROM Account 
WHERE Industry != null 
LIMIT 10
```

## Create Examples

### Standard Objects

**Create New Contact**
```
Create a new contact for John Smith at Acme Corp with email john@acme.com
```
*Data:*
```json
{
  "sobject": "Contact",
  "data": {
    "FirstName": "John",
    "LastName": "Smith", 
    "Email": "john@acme.com",
    "Company": "Acme Corp"
  }
}
```

**Create Account with Details**
```
Create a new account for TechStart Inc, technology industry, website techstart.com
```
*Data:*
```json
{
  "sobject": "Account",
  "data": {
    "Name": "TechStart Inc",
    "Industry": "Technology",
    "Website": "https://techstart.com",
    "Type": "Customer"
  }
}
```

**Create Opportunity**
```
Create a new opportunity called "Q2 Software Deal" for $50,000 closing next month
```
*Data:*
```json
{
  "sobject": "Opportunity",
  "data": {
    "Name": "Q2 Software Deal",
    "Amount": 50000,
    "CloseDate": "2025-07-15",
    "StageName": "Prospecting"
  }
}
```

### Custom Objects

**Create Custom Project Record**
```
Create a new project record with name "Website Redesign" and status "In Progress"
```
*First, describe the object:*
```json
{
  "sobject": "Project__c"
}
```
*Then create:*
```json
{
  "sobject": "Project__c",
  "data": {
    "Name": "Website Redesign",
    "Status__c": "In Progress",
    "Start_Date__c": "2025-06-01"
  }
}
```

## Update Examples

### Single Field Updates

**Update Contact Email**
```
Update contact 003XX000008b6cY to have email john.smith@newemail.com
```
*Data:*
```json
{
  "sobject": "Contact",
  "id": "003XX000008b6cYAQ",
  "data": {
    "Email": "john.smith@newemail.com"
  }
}
```

**Update Opportunity Stage**
```
Move opportunity 006XX000008a5bZ to "Closed Won" stage
```
*Data:*
```json
{
  "sobject": "Opportunity", 
  "id": "006XX000008a5bZAQ",
  "data": {
    "StageName": "Closed Won"
  }
}
```

### Multi-Field Updates

**Update Account Information**
```
Update account 001XX000003DHPh with new phone and website
```
*Data:*
```json
{
  "sobject": "Account",
  "id": "001XX000003DHPhAAN", 
  "data": {
    "Phone": "555-123-4567",
    "Website": "https://newwebsite.com",
    "Industry": "Technology"
  }
}
```

## Schema Discovery Examples

### Object Exploration

**List All Available Objects**
```
What Salesforce objects are available in my org?
```
*Empty parameters to get full list*

**Explore Contact Schema**
```
What fields are available on the Contact object?
```
*Parameters:*
```json
{
  "sobject": "Contact"
}
```

**Custom Object Investigation**
```
Tell me about the Project__c custom object
```
*Parameters:*
```json
{
  "sobject": "Project__c"
}
```

### Field Analysis

**Required Fields Discovery**
```
What fields are required when creating a new Contact?
```
*Use describe tool to see required fields marked in the response*

**Picklist Values**
```
What are the valid values for the Lead Status field?
```
*Describe Lead object and look for Status field picklist values*

**Relationship Fields**
```
What lookup fields does the Opportunity object have?
```
*Describe Opportunity to see reference fields*

## Complex Workflow Examples

### Data Migration Workflow

**1. Analyze Source Data**
```
Show me the structure of our Contact object to understand what fields I need to map
```

**2. Validate Required Fields**
```
What are the required fields for creating new Contacts?
```

**3. Create Test Records**
```
Create a test contact to validate our data mapping
```

**4. Bulk Query Existing Data**
```
SELECT Id, Email FROM Contact WHERE Email != null
```

### Data Quality Workflow

**1. Find Duplicate Accounts**
```sql
SELECT Name, COUNT(Id) 
FROM Account 
GROUP BY Name 
HAVING COUNT(Id) > 1
```

**2. Identify Missing Information**
```sql
SELECT Id, Name, Email, Phone 
FROM Contact 
WHERE Email = null OR Phone = null
```

**3. Update Records with Missing Data**
```
Update the contacts found to have complete information
```

### Reporting Workflow

**1. Get Opportunity Pipeline**
```sql
SELECT StageName, COUNT(Id), SUM(Amount)
FROM Opportunity 
WHERE IsClosed = false
GROUP BY StageName
```

**2. Analyze Contact Engagement**
```sql
SELECT Account.Name, COUNT(Id) ContactCount
FROM Contact 
WHERE LastActivityDate >= LAST_N_DAYS:30
GROUP BY Account.Name
ORDER BY ContactCount DESC
```

**3. Track Recent Activities**
```sql
SELECT Subject, ActivityDate, Who.Name
FROM Task 
WHERE ActivityDate = TODAY
```

## Best Practices

### Query Optimization

**Use Selective Filters**
```sql
-- Good: Uses indexed fields
SELECT Id, Name FROM Account WHERE CreatedDate = TODAY

-- Avoid: Non-selective queries
SELECT Id, Name FROM Account WHERE Name LIKE '%Inc%'
```

**Limit Result Sets**
```sql
-- Always use LIMIT for large datasets
SELECT Id, Name FROM Contact LIMIT 100
```

**Efficient Field Selection**
```sql
-- Good: Only select needed fields
SELECT Id, Name, Email FROM Contact

-- Avoid: Select all fields
SELECT Id, Name, Email, Phone, ... FROM Contact
```

### Data Management

**Validate Before Creating**
1. Use `salesforce_describe` to understand field requirements
2. Check for existing records to avoid duplicates
3. Validate data formats (emails, phones, dates)

**Handle Errors Gracefully**
1. Check error messages for field validation failures
2. Use describe tool to understand field constraints
3. Validate picklist values before creation

**Maintain Data Quality**
1. Regular cleanup of test data
2. Consistent naming conventions
3. Proper use of required vs optional fields

### Security Considerations

**Field-Level Security**
- Respect Salesforce field-level security settings
- Check if fields are createable/updateable before operations
- Handle permission errors appropriately

**Data Access**
- Only query data you need access to
- Respect sharing rules and record visibility
- Use appropriate SOQL filters

## Troubleshooting Common Issues

### Query Issues

**"Field not found" Error**
- Use API field names, not labels
- Check spelling and case sensitivity
- Use describe tool to get correct field names

**"Object not found" Error**
- Verify object API name spelling
- Check if object exists in your org
- Use empty describe to list available objects

### Create/Update Issues

**"Required field missing" Error**
- Use describe tool to identify required fields
- Provide all required fields in data object
- Check for validation rules requiring additional fields

**"Insufficient access" Error**
- Verify user has create/edit permissions
- Check field-level security settings
- Ensure sharing rules allow access

### Performance Issues

**Slow Query Response**
- Add selective WHERE clauses
- Use LIMIT to restrict result size
- Avoid queries on non-indexed fields

**API Limit Errors**
- Monitor daily API usage in Salesforce
- Optimize queries to use fewer API calls
- Consider bulk operations for large datasets

This comprehensive guide should help you get the most out of your MCP Salesforce Server integration! 🚀
