# Salesforce Context Learning Tool

## Übersicht

Das `salesforce_learn_context` Tool löst das Problem, dass KI-Assistenten nach jeder Session den persönlichen und geschäftlichen Kontext des Benutzers vergessen. Es führt ein interaktives Interview durch und speichert wichtige Informationen persistent.

## Features

### 🎤 **Interaktives Interview**
- Systematische Erfassung persönlicher Informationen (Name, E-Mail, Position)
- Geschäftliche Informationen (Unternehmen, Branche, Geschäftstätigkeit)
- Fortschrittsverfolgung mit verbleibenden Fragen

### 🧠 **Intelligente Fragen**
- Automatische Analyse des Salesforce-Datenmodells
- Generierung spezifischer Fragen zu Custom Objects und Relationships
- Priorisierung nach Relevanz (High/Medium/Low)

### 💾 **Persistente Speicherung**
- Speicherung in `cache/salesforce-context.json`
- Überdauert Sessions und Neustarts
- Integration mit anderen Tools

### 🔗 **Integration**
- Das `installation-info` Tool zeigt jetzt Benutzerkontext an
- Andere Tools können den Kontext über `getUserContext()` abrufen

## Verwendung

### Interview starten
```json
{
  "action": "start_interview"
}
```

### Frage beantworten
```json
{
  "action": "answer_question",
  "question_id": "personal_name",
  "answer": "Max Mustermann"
}
```

### Kontext anzeigen
```json
{
  "action": "show_context",
  "context_type": "all"  // oder "personal", "business", "data_model"
}
```

### Intelligente Fragen abrufen
```json
{
  "action": "suggest_questions",
  "context_type": "data_model"
}
```

### Kontext zurücksetzen
```json
{
  "action": "reset_context"
}
```

## Beispiel-Workflow

1. **Erstes Interview**
   ```json
   { "action": "start_interview" }
   ```
   → System stellt 6 Grundfragen (Name, E-Mail, Position, Firma, Branche, Geschäftstätigkeit)

2. **Erweiterte Fragen**
   ```json
   { "action": "suggest_questions" }
   ```
   → Intelligente Fragen basierend auf Custom Objects und Datenmodell

3. **Kontext nutzen**
   ```json
   { "action": "show_context" }
   ```
   → Vollständige Übersicht aller gespeicherten Informationen

## Intelligent generierte Fragen

Das Tool analysiert automatisch:
- **Custom Objects**: Geschäftlicher Zweck und Verwendung
- **Relationships**: Zusammenhänge zwischen Objects
- **Geschäftsprozesse**: Hauptprozesse in Salesforce
- **Anpassungsstrategie**: Grund für viele Custom Fields
- **Nutzungsverhalten**: Tägliche Arbeit mit Salesforce

## Datenstruktur

```json
{
  "personal": {
    "name": "Max Mustermann",
    "email": "max@example.com",
    "role": "Sales Manager"
  },
  "business": {
    "company_name": "Mustermann GmbH",
    "industry": "Software",
    "business_focus": "Enterprise-Software-Lösungen..."
  },
  "data_model": {
    "custom_objects_purpose": "Survey-System für Kundenfeedback...",
    "primary_processes": "Vertrieb, Kundensupport, Marketing..."
  },
  "interview": {
    "status": "completed",
    "started_at": "2025-06-04T...",
    "completed_at": "2025-06-04T..."
  }
}
```

## Integration mit anderen Tools

### Installation Info Tool
Das `salesforce_installation_info` Tool zeigt jetzt automatisch den Benutzerkontext:

```
📊 Salesforce Installation - Complete Overview
*Kontext für: Max Mustermann (Mustermann GmbH)*
```

### Eigene Tools erweitern
```javascript
import { getUserContext } from './learn-context.js';

const context = await getUserContext();
if (context.personal?.name) {
  // Personalisierte Antworten
}
```

## Vorteile

✅ **Persistenz**: Informationen bleiben über Sessions hinweg erhalten  
✅ **Personalisierung**: KI kennt Benutzer und Kontext  
✅ **Intelligenz**: Automatische Generierung relevanter Fragen  
✅ **Integration**: Nahtlose Verwendung in anderen Tools  
✅ **Flexibilität**: Schrittweise Erfassung möglich  
✅ **Benutzerfreundlich**: Einfache JSON-basierte Interaktion  

## Nächste Schritte

- Das Tool kann um weitere Kategorien erweitert werden
- Automatische Aktualisierung bei Änderungen im Datenmodell
- Export/Import von Kontextdaten
- Team-basierte Kontexte für Unternehmen
