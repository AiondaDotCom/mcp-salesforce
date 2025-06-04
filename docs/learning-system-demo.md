# Salesforce Learning System - Demo

## Example of a Learned Installation

This file shows an example of how a learned Salesforce installation is documented.

### Typical Custom Objects in a Business Salesforce Installation:

```json
{
  "TimeTracking__c": {
    "label": "Time Tracking",
    "fields": {
      "Name": "Time Tracking Name",
      "Employee__c": "Employee (Lookup to User)",
      "Project__c": "Project (Lookup to Project__c)",
      "Date__c": "Date",
      "Hours__c": "Number of Hours",
      "Description__c": "Activity Description",
      "Status__c": "Status (Picklist: Draft, Submitted, Approved)"
    }
  },
  "Project__c": {
    "label": "Project", 
    "fields": {
      "Name": "Project Name",
      "Customer__c": "Customer (Lookup to Account)",
      "ProjectManager__c": "Project Manager (Lookup to User)",
      "StartDate__c": "Start Date",
      "EndDate__c": "End Date",
      "Budget__c": "Budget",
      "Status__c": "Status (Picklist: Planning, Active, Completed)"
    }
  },
  "CustomerCare__c": {
    "label": "Customer Care",
    "fields": {
      "Name": "Care Name",
      "Customer__c": "Customer (Lookup to Account)",
      "CareManager__c": "Care Manager (Lookup to User)",
      "Type__c": "Type of Care",
      "Priority__c": "Priority (Picklist: Low, Medium, High)",
      "DueDate__c": "Due Date"
    }
  }
}
```

## Intelligent Questions That Become Possible:

### Before Learning:
```
You: "Are there any open time tracking entries for this month?"
Claude: ❌ "I don't know any object called 'TimeTracking'. Use salesforce_describe to see available objects."
```

### After Learning:
```
You: "Are there any open time tracking entries for this month?"
Claude: ✅ "I'll check the TimeTracking__c object for entries with Status 'Draft' for June 2025..."

Automatic SOQL query:
SELECT Id, Name, Employee__c, Project__c, Hours__c, Status__c 
FROM TimeTracking__c 
WHERE Status__c = 'Draft' 
AND CALENDAR_MONTH(Date__c) = 6 
AND CALENDAR_YEAR(Date__c) = 2025
```

### Additional Intelligent Scenarios:

```
You: "Create a new time tracking entry for Project XYZ"
Claude: ✅ Automatically recognizes required fields:
- Employee__c (required)
- Project__c (required) 
- Date__c (required)
- Hours__c (required)

Then executes salesforce_create with correct API names.
```

```
You: "Which projects are still running and have a budget over $50,000?"
Claude: ✅ Automatically creates:
SELECT Id, Name, Customer__c, Budget__c, ProjectManager__c 
FROM Project__c 
WHERE Status__c = 'Active' 
AND Budget__c > 50000
```

## Technical Details

The learning system stores for each object:
- **API names** and labels
- **Field types** and permissions
- **Required fields**
- **Picklist values**
- **Relationships** to other objects
- **CRUD permissions**

This information is stored locally in `cache/salesforce-installation.json` and considered in every interaction.
