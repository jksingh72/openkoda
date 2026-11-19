# Configuration-Driven Feature Development in Openkoda

## Overview

Openkoda uses a **metadata-driven architecture** that allows you to build complete features through configuration files, database scripts, and JavaScript - without writing Java code. This is the essence of its low-code approach.

## How It Works: The Complete Flow

### 1. **Form Definition → Dynamic Entity Creation**

When you define a form in YAML/JavaScript, Openkoda automatically:
1. Creates a database table
2. Generates JPA entity class at runtime using ByteBuddy
3. Creates Spring Data repository
4. Registers CRUD controllers (HTML and API)

**Example: Insurance Policy Form** (`policy.yaml` + `policy.js`)

```yaml
# components/form/policy.yaml
name: "policy"
tableName: "dynamic_policy"
readPrivilege: "isUser"
writePrivilege: "isUser"
registerApiCrudController: true
registerHtmlCrudController: true
tableColumns: "client.companyName,policyName,policyType..."
```

```javascript
// code/form/policy.js
a => a.text("policyName")
      .dropdown("policyType", "policyTypes")
      .date("startDate")
      .date("endDate")
      .number("premium")
      .manyToOne("clientId","client")
      .files("filesId", ...)
```

This automatically creates:
- Database table: `dynamic_policy` with appropriate columns
- JPA Entity: `Policy` class with fields matching the form
- Repository: `PolicyRepository` with CRUD operations
- Controllers: `/html/policy/all`, `/api/policy`, etc.
- UI: Automatic form pages, list views, detail views

### 2. **UI Components → Dynamic Pages**

UI components are defined in YAML with JavaScript logic:

```yaml
# components/ui-component/global/policy.yaml
name: "policy"
type: "HTML"
requiredPrivilege: "isUser"
content: "templates/ui-component/global/policy.html"
```

With JavaScript handling the business logic:
```javascript
// code/ui-component/global/policy-GET.js
flow.thenSet("policies", a => a.repositories.secure.policy.findAll())
    .thenSet("clients", a => a.repositories.secure.client.findAll())
    .thenSet("agents", a => a.repositories.secure.agent.findAll());
```

### 3. **Server-Side JavaScript → Business Logic**

JavaScript files can define business logic that runs on the server:

```yaml
# components/server-side/forms.yaml
name: "forms"
code: "code/server-side/forms.js"
```

```javascript
// code/server-side/forms.js
let formService = {
  calculatePremium: function(baseAmount, riskFactor) {
    return baseAmount * riskFactor;
  },
  validatePolicy: function(policy) {
    return policy.startDate < policy.endDate;
  }
};
```

## Key Configuration Mechanisms

### 1. **YAML Configuration Files**
Location: `src/main/resources/components/`

| File Type | Purpose | Example |
|-----------|---------|---------|
| `form/*.yaml` | Form definitions with metadata | `policy.yaml`, `client.yaml` |
| `ui-component/*.yaml` | UI pages and components | `dashboard.yaml`, `report.yaml` |
| `server-side/*.yaml` | Server-side JavaScript modules | `forms.yaml`, `calculations.yaml` |
| `frontend-resource/*.yaml` | Static templates and resources | `home.yaml`, `email-templates.yaml` |
| `event/*.yaml` | Event listeners and handlers | `applicationStartedEvent.yaml` |

### 2. **JavaScript Business Logic**
Location: `src/main/resources/code/`

```javascript
// Access to Java services from JavaScript
flow.thenSet("data", a => a.services.dynamicEntity.getAll())
    .thenSet("user", a => a.services.user.getCurrentUser())
    .thenSet("files", a => a.services.file.findAllByEntityId(entityId));

// Full access to repositories
a.repositories.secure.policy.findAll();
a.repositories.unsecure.user.findById(userId);

// Access to utility services
a.services.email.sendNotification();
a.services.integration.slack.postMessage();
```

### 3. **Database Scripts**
Location: `src/main/resources/db/` and `src/main/resources/migration/`

```sql
-- init.sql: Initial database setup
INSERT INTO organization (id, name) values (121, 'ACME');

-- upgrade.sql: Versioned migrations
ALTER TABLE dynamic_policy ADD COLUMN renewal_date DATE;
CREATE INDEX idx_policy_status ON dynamic_policy(status);
```

### 4. **Property Files**
Location: `src/main/resources/`

- `application-openkoda.properties` - Core configuration
- `messages.properties` - Internationalization
- Component-specific property files

## Complete Feature Example: Insurance Policy Management

### Step 1: Define the Data Model
**File:** `components/form/policy.yaml` + `code/form/policy.js`

```yaml
# policy.yaml
name: "policy"
tableName: "dynamic_policy"
registerApiCrudController: true
registerHtmlCrudController: true
```

```javascript
// policy.js - Defines all fields with types and validations
a => a.text("policyName")
      .dropdown("policyType", ["TERM", "WHOLE_LIFE", "UNIVERSAL"])
      .date("startDate")
      .date("endDate")
      .number("premium")
      .manyToOne("clientId", "client")
      .checkbox("readyForRenewal")
      .files("attachments")
```

### Step 2: Create UI Components
**File:** `components/ui-component/global/policy-dashboard.yaml`

```yaml
name: "policy-dashboard"
requiredPrivilege: "isUser"
content: "templates/ui-component/global/policy-dashboard.html"
```

**File:** `code/ui-component/global/policy-dashboard-GET.js`

```javascript
flow.thenSet("activePolicies", a => 
    a.repositories.secure.policy.findByStatus("Active"))
  .thenSet("upcomingRenewals", a =>
    a.repositories.secure.policy.findReadyForRenewal())
  .thenSet("premiumSummary", a =>
    a.services.premium.calculateMonthlySummary());
```

### Step 3: Add Business Logic
**File:** `components/server-side/premium-calculations.yaml`

```javascript
// premium-calculations.js
let premiumService = {
  calculateMonthlyPremium: function(policy) {
    let base = policy.premium;
    let factor = this.getRiskFactor(policy.policyType);
    return base * factor / 12;
  },
  
  getRiskFactor: function(policyType) {
    const factors = {
      "TERM": 1.0,
      "WHOLE_LIFE": 1.5,
      "UNIVERSAL": 1.8
    };
    return factors[policyType] || 1.0;
  }
};
```

### Step 4: Configure Notifications
**File:** `components/event/policy-renewal-reminder.yaml`

```yaml
name: "policy-renewal-reminder"
eventExpression: "daily at 9:00"
code: "code/event/policy-renewal-reminder.js"
```

```javascript
// policy-renewal-reminder.js
flow.then(a => {
  let policies = a.repositories.secure.policy.findRenewingInDays(30);
  policies.forEach(policy => {
    a.services.email.sendRenewalReminder(policy);
    a.services.slack.notifyAgent(policy.agentId, policy);
  });
});
```

### Step 5: Database Migration
**File:** `migration/add_policy_features.sql`

```sql
-- Add new columns for enhanced features
ALTER TABLE dynamic_policy 
  ADD COLUMN renewal_notification_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN risk_score DECIMAL(5,2),
  ADD COLUMN commission_rate DECIMAL(5,2);

-- Create indexes for performance
CREATE INDEX idx_policy_renewal ON dynamic_policy(end_date) 
  WHERE ready_for_renewal = TRUE;
```

## The Magic: What Happens Automatically

When you import these YAML/JS files:

### 1. **Database Layer**
- Tables are created/updated with proper columns
- Indexes are added for performance
- Foreign key constraints are established

### 2. **Data Access Layer**
- JPA entity classes are generated at runtime
- Spring Data repositories are created
- Secure repositories with automatic privilege checking

### 3. **Business Layer**
- Service methods become available in JavaScript context
- Transaction management is handled automatically
- Audit logging is enabled for all entities

### 4. **API Layer**
- REST endpoints are automatically created (`/api/policy`)
- Swagger/OpenAPI documentation is generated
- Request validation and error handling

### 5. **UI Layer**
- CRUD pages are generated (`/html/policy/all`, `/html/policy/new`)
- List views with sorting and filtering
- Detail views with related data
- Form validation and submission

### 6. **Security Layer**
- Automatic privilege checking on all operations
- Row-level security for multi-tenancy
- Audit trail for all changes

## Configuration vs. Code: When to Use Each

### **Configuration Only** (80% of features)
- Simple CRUD operations
- Basic business logic
- Standard UI pages
- Email notifications
- Scheduled tasks
- File uploads
- Basic reports

### **Java Code Needed** (20% of features)
- Complex algorithms requiring Java performance
- Integration with specialized Java libraries
- Custom security requirements
- Complex transaction management
- Performance-critical operations
- Legacy system integrations

## Import/Export System: Component Packaging

Components can be packaged into ZIP files:

```
insurance-application.zip
├── components/
│   ├── form/
│   │   ├── policy.yaml
│   │   ├── client.yaml
│   │   └── claim.yaml
│   ├── ui-component/
│   │   ├── dashboard.yaml
│   │   └── reports.yaml
│   └── server-side/
│       └── calculations.yaml
├── code/
│   ├── form/
│   │   ├── policy.js
│   │   └── client.js
│   └── ui-component/
│       └── dashboard-GET.js
├── templates/
│   └── ui-component/
│       └── dashboard.html
└── migration/
    └── insurance-tables.sql
```

This entire package can be:
1. **Imported** into any Openkoda instance
2. **Exported** from development to production
3. **Shared** between teams or customers
4. **Versioned** in Git alongside application code

## Real-World Example: Adding a New Feature

### Scenario: Add "Claims Management" to Insurance App

**Day 1:** Define data model
```yaml
# components/form/claim.yaml
name: "claim"
tableName: "dynamic_claim"
registerHtmlCrudController: true
```

```javascript
// code/form/claim.js
a => a.manyToOne("policyId", "policy")
      .date("incidentDate")
      .number("claimAmount")
      .dropdown("status", ["Submitted", "In Review", "Approved", "Rejected"])
      .textarea("description")
      .files("evidenceDocuments")
```

**Day 2:** Create UI
```yaml
# components/ui-component/global/claim-dashboard.yaml
name: "claim-dashboard"
content: "templates/ui-component/global/claim-dashboard.html"
```

```javascript
// code/ui-component/global/claim-dashboard-GET.js
flow.thenSet("pendingClaims", a =>
    a.repositories.secure.claim.findByStatus("In Review"))
  .thenSet("claimStats", a =>
    a.services.claim.getMonthlyStatistics());
```

**Day 3:** Add business logic
```javascript
// code/server-side/claim-processing.js
let claimService = {
  processClaim: function(claimId) {
    let claim = a.repositories.secure.claim.findById(claimId);
    let policy = a.repositories.secure.policy.findById(claim.policyId);
    
    if (this.validateClaim(claim, policy)) {
      claim.status = "Approved";
      a.services.email.sendClaimApproval(claim);
      a.services.payment.initiatePayout(claim);
    }
  }
};
```

**Day 4:** Database optimizations
```sql
-- migration/add_claim_indexes.sql
CREATE INDEX idx_claim_status ON dynamic_claim(status);
CREATE INDEX idx_claim_policy ON dynamic_claim(policy_id);
ALTER TABLE dynamic_claim ADD COLUMN processed_date TIMESTAMP;
```

**Result:** Complete claims management system in 4 days, with:
- Database tables and relationships
- Full CRUD UI
- Business logic
- Email notifications
- Performance optimizations
- Security and audit trails

## Benefits of This Approach

### 1. **Rapid Development**
- Features in days instead of weeks
- No compilation/deployment for changes
- Business users can configure simple features

### 2. **Maintainability**
- Configuration is self-documenting
- Easy to understand what the system does
- Changes are traceable through version control

### 3. **Flexibility**
- Features can be enabled/disabled per tenant
- Business rules can change without deployment
- UI can be customized per organization

### 4. **Consistency**
- Security applied uniformly
- Audit trails for all changes
- Standard patterns for common operations

### 5. **Scalability**
- Components can be packaged and reused
- Features can be imported/exported between environments
- Easy to create application templates

## Limitations and Considerations

### **Performance Considerations**
- JavaScript execution is slower than Java
- Dynamic class generation has startup overhead
- Complex queries might need optimized SQL

### **Complexity Boundary**
- Very complex business logic should be in Java
- Performance-critical operations need Java
- Complex UI interactions might need custom components

### **Learning Curve**
- Need to learn the configuration DSL
- Understanding the metadata model
- Debugging configuration vs. code issues

## Conclusion

Openkoda's configuration-driven approach represents a **true low-code platform** where:
- **80% of features** can be built with configuration only
- **Database changes** are handled through scripts
- **Business logic** lives in JavaScript
- **UI components** are defined in YAML + HTML
- **Everything is versionable** and deployable as packages

This enables building enterprise applications **60% faster** (as claimed) by eliminating boilerplate code and allowing business logic to be expressed directly in configuration rather than being buried in Java code.

The key insight is that Openkoda treats **metadata as code** - your form definitions, UI components, and business rules are first-class citizens that drive the entire application behavior, from database schema to user interface.