# Feature Organization and Folder Structure in Openkoda

## Overview: How Features are Organized

Yes, **new features are typically created in new folders** within a structured directory hierarchy. Openkoda follows a **modular, component-based organization** where features are organized by:

1. **Module/Feature Name** - Top-level feature grouping
2. **Component Type** - Forms, UI components, server-side logic, etc.
3. **Scope** - Global, organization-specific, or public

## Standard Folder Structure for a New Feature

Here's the recommended folder structure when creating a new feature:

### **Option 1: Within the Main Application (For Built-in Features)**
```
openkoda/src/main/resources/
├── components/
│   ├── form/                              # Form definitions
│   │   ├── feature-name/                  # Feature-specific forms
│   │   │   ├── entity1.yaml
│   │   │   ├── entity2.yaml
│   │   │   └── entity3.yaml
│   │   └── code/form/feature-name/        # Form JavaScript
│   │       ├── entity1.js
│   │       ├── entity2.js
│   │       └── entity3.js
│   ├── ui-component/                      # UI components
│   │   ├── global/feature-name/           # Global scope
│   │   │   ├── dashboard.yaml
│   │   │   ├── detail-view.yaml
│   │   │   └── reports.yaml
│   │   ├── organization/feature-name/     # Organization scope
│   │   │   ├── dashboard.yaml
│   │   │   └── management.yaml
│   │   └── public/feature-name/           # Public scope
│   │       └── landing.yaml
│   ├── server-side/                       # Server-side logic
│   │   └── feature-name/
│   │       ├── service.yaml
│   │       ├── calculations.yaml
│   │       └── validations.yaml
│   ├── event/                             # Event listeners
│   │   └── feature-name/
│   │       ├── daily-reminders.yaml
│   │       └── notifications.yaml
│   └── privilege/                         # Privileges
│       └── feature-name-privileges.yaml
├── code/                                  # JavaScript code
│   ├── ui-component/
│   │   ├── global/feature-name/
│   │   │   ├── dashboard-GET.js
│   │   │   ├── detail-view-GET.js
│   │   │   └── reports-GET.js
│   │   └── organization/feature-name/
│   │       ├── dashboard-GET.js
│   │       └── management-GET.js
│   ├── server-side/feature-name/
│   │   ├── service.js
│   │   ├── calculations.js
│   │   └── validations.js
│   └── event/feature-name/
│       ├── daily-reminders.js
│       └── notifications.js
├── templates/                             # HTML templates
│   └── ui-component/
│       ├── global/feature-name/
│       │   ├── dashboard.html
│       │   ├── detail-view.html
│       │   └── reports.html
│       └── organization/feature-name/
│           ├── dashboard.html
│           └── management.html
└── migration/                             # Database scripts
    ├── 001-create-feature-name-tables.sql
    └── 002-seed-feature-name-data.sql
```

### **Option 2: As a Separate Module/Project (For Reusable Features)**
```
feature-name-module/
├── src/main/resources/
│   ├── components/
│   │   ├── form/
│   │   │   ├── entity1.yaml
│   │   │   └── entity2.yaml
│   │   ├── ui-component/
│   │   │   ├── global/
│   │   │   │   └── dashboard.yaml
│   │   │   └── organization/
│   │   │       └── management.yaml
│   │   └── server-side/
│   │       └── service.yaml
│   ├── code/
│   │   ├── form/
│   │   │   ├── entity1.js
│   │   │   └── entity2.js
│   │   ├── ui-component/
│   │   │   ├── global/
│   │   │   │   └── dashboard-GET.js
│   │   │   └── organization/
│   │   │       └── management-GET.js
│   │   └── server-side/
│   │       └── service.js
│   ├── templates/
│   │   └── ui-component/
│   │       ├── global/
│   │       │   └── dashboard.html
│   │       └── organization/
│   │           └── management.html
│   └── migration/
│       └── create-tables.sql
├── pom.xml                              # Maven configuration
├── README.md                            # Module documentation
└── package/
    └── manifest.yaml                    # Package manifest
```

## Real Examples from Openkoda

Let's look at how existing features are organized:

### **Example 1: Insurance Module** (`/examples/insurance/`)
```
examples/insurance/src/main/resources/
├── components/
│   ├── form/
│   │   └── policy.yaml                  # Policy form definition
│   ├── ui-component/
│   │   ├── global/
│   │   │   ├── policy.yaml              # Global policy UI
│   │   │   ├── client.yaml              # Global client UI
│   │   │   └── upcoming-payments.yaml   # Payments UI
│   │   └── internal/
│   │       └── pre-data-ai.yaml         # Internal AI component
│   └── server-side/
│       └── initRegisterForm.yaml        # Server-side logic
├── code/
│   ├── form/
│   │   └── policy.js                    # Policy form fields
│   └── ui-component/
│       ├── global/
│       │   └── policy-GET.js            # Policy UI logic
│       └── internal/
│           └── pre-data-ai-GET.js       # AI logic
└── (templates would be here)
```

### **Example 2: TimeLog Module** (`/examples/timelog/`)
```
examples/timelog/src/main/resources/
├── components/
│   ├── form/
│   │   ├── project.yaml                 # Project form
│   │   └── account.yaml                 # Account form
│   ├── ui-component/
│   │   └── organization/
│   │       ├── dashboard.yaml           # Organization dashboard
│   │       ├── report.yaml              # Reports
│   │       └── timelog.yaml             # Time logging
│   └── server-side/
│       └── forms.yaml                   # Forms service
├── code/
│   ├── ui-component/organization/
│   │   ├── dashboard-GET.js             # Dashboard logic
│   │   ├── report-GET.js                # Report logic
│   │   ├── timelog-GET.js               # Timelog view
│   │   └── timelog-POST-remove.js       # Timelog delete
│   └── server-side/
│       └── forms.js                     # Forms logic
└── (templates would be here)
```

## Best Practices for Feature Organization

### **1. Use Descriptive Feature Names**
```bash
# Good
feature-name/           # Clear, descriptive
project-management/
customer-portal/
invoice-system/

# Avoid
feature1/              # Not descriptive
new-feature/           # Temporary name
test/                  # Too generic
```

### **2. Follow Scope Conventions**
```bash
ui-component/
├── global/            # Available to all organizations
├── organization/      # Scoped to specific organization
└── public/            # Available without authentication
```

### **3. Maintain Consistent Structure**
```bash
# Each feature should have:
feature-name/
├── forms/             # Data model definitions
├── ui/                # User interface components
├── services/          # Business logic
├── events/            # Event handlers
├── templates/         # HTML templates
└── migrations/        # Database scripts
```

### **4. Use Versioning for Larger Features**
```bash
feature-name/
├── v1.0/              # Initial version
│   ├── components/
│   ├── code/
│   └── migration/
├── v1.1/              # Enhancement
│   ├── components/
│   └── migration/
└── current/           # Symlink to latest
    -> v1.1/
```

## Creating a New Feature: Step-by-Step

### **Step 1: Create Feature Directory Structure**
```bash
# Navigate to resources directory
cd /home/jksingh/openkoda/openkoda/src/main/resources

# Create feature directory structure
mkdir -p components/form/project-management
mkdir -p components/ui-component/organization/project-management
mkdir -p components/server-side/project-management
mkdir -p components/event/project-management
mkdir -p components/privilege

mkdir -p code/form/project-management
mkdir -p code/ui-component/organization/project-management
mkdir -p code/server-side/project-management
mkdir -p code/event/project-management

mkdir -p templates/ui-component/organization/project-management
mkdir -p migration
```

### **Step 2: Create Initial Configuration Files**

**File:** `components/form/project-management/project.yaml`
```yaml
!!com.openkoda.service.export.dto.FormConversionDto
name: "project"
tableName: "dynamic_project"
module: "project-management"
readPrivilege: "canViewProjects"
writePrivilege: "canManageProjects"
registerApiCrudController: true
registerHtmlCrudController: true
code: "code/form/project-management/project.js"
```

**File:** `code/form/project-management/project.js`
```javascript
a => a.text("name").required()
    .textarea("description")
    .date("startDate")
    .date("endDate")
    .dropdown("status", "projectStatuses")
```

### **Step 3: Create UI Component**

**File:** `components/ui-component/organization/project-management/dashboard.yaml`
```yaml
!!com.openkoda.service.export.dto.FrontendResourceConversionDto
name: "project-dashboard"
requiredPrivilege: "canViewProjects"
type: "HTML"
resourceType: "RESOURCE"
content: "templates/ui-component/organization/project-management/dashboard.html"
```

**File:** `code/ui-component/organization/project-management/dashboard-GET.js`
```javascript
flow.thenSet("projects", a => 
    a.repositories.secure.project.findRecent(10))
  .thenSet("stats", a => ({
        active: a.repositories.secure.project.countByStatus("ACTIVE"),
        completed: a.repositories.secure.project.countByStatus("COMPLETED")
    }));
```

### **Step 4: Create Template**

**File:** `templates/ui-component/organization/project-management/dashboard.html`
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
    <h1>Project Dashboard</h1>
    <div th:text="${stats.active}">Active Projects</div>
    <!-- More template code -->
</body>
</html>
```

### **Step 5: Create Migration Script**

**File:** `migration/001-create-project-tables.sql`
```sql
CREATE TABLE IF NOT EXISTS dynamic_project (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT,
    name VARCHAR(255) NOT NULL,
    -- ... other columns
);
```

## Importing the Feature

### **Option A: Direct File Placement**
Place files in the running Openkoda instance's resource directory, and they will be auto-detected if `syncWithFilesystem=true` is configured.

### **Option B: Package and Import**
```bash
# Create package directory
mkdir -p package/project-management
cp -r components/form/project-management package/project-management/
cp -r components/ui-component/organization/project-management package/project-management/
# ... copy other files

# Create manifest
cat > package/project-management/manifest.yaml << 'EOF'
name: project-management
version: 1.0.0
description: Project management feature
EOF

# Zip and import through Admin UI or API
zip -r project-management.zip package/project-management/
```

### **Option C: Module Development (Advanced)**
For larger features, create a separate Maven module:

```xml
<!-- pom.xml for feature module -->
<project>
    <artifactId>openkoda-project-management</artifactId>
    <dependencies>
        <dependency>
            <groupId>com.openkoda</groupId>
            <artifactId>openkoda</artifactId>
            <version>1.7.1</version>
        </dependency>
    </dependencies>
</project>
```

## Special Considerations

### **1. Multi-Tenancy Organization**
For features that need different implementations per tenant:
```
components/
├── ui-component/
│   ├── organization/acme/           # ACME-specific
│   │   └── project-management/
│   ├── organization/contoso/        # Contoso-specific
│   │   └── project-management/
│   └── organization/default/        # Default for all others
│       └── project-management/
```

### **2. Feature Dependencies**
If your feature depends on other features:
```yaml
# In manifest.yaml
dependencies:
  - name: user-management
    version: ">=1.2.0"
  - name: file-storage
    version: "1.0.0"
```

### **3. Configuration Overrides**
Allow organizations to override feature configuration:
```
components/
├── config/
│   ├── default/                     # Default configuration
│   │   └── project-management.yaml
│   └── overrides/                   # Organization overrides
│       ├── organization-123/
│       │   └── project-management.yaml
│       └── organization-456/
│           └── project-management.yaml
```

### **4. Testing Structure**
```
feature-name/
├── test/
│   ├── unit/                        # Unit tests
│   │   └── service.test.js
│   ├── integration/                 # Integration tests
│   │   └── api.test.js
│   └── data/                        # Test data
│       └── sample-projects.json
```

## Common Folder Patterns

### **Pattern 1: By Entity**
```
project-management/
├── project/
│   ├── form.yaml
│   ├── ui.yaml
│   └── service.js
├── task/
│   ├── form.yaml
│   ├── ui.yaml
│   └── service.js
└── shared/
    ├── dashboard.yaml
    └── reports.js
```

### **Pattern 2: By Function**
```
project-management/
├── data-model/           # Forms and entities
├── user-interface/       # UI components
├── business-logic/       # Services and calculations
├── notifications/        # Emails and alerts
└── reporting/            # Reports and analytics
```

### **Pattern 3: By User Role**
```
project-management/
├── admin/                # Administrative features
├── manager/              # Management features
├── team-member/          # Team member features
└── client/               # Client-facing features
```

## Migration Strategy for Existing Applications

### **Phase 1: Feature Isolation**
```bash
# Move existing feature files to new structure
mv components/form/old-project.* components/form/project-management/
mv components/ui-component/old-dashboard.* components/ui-component/organization/project-management/
```

### **Phase 2: Configuration Consolidation**
```bash
# Combine related configurations
cat components/form/project-*.yaml > components/form/project-management/consolidated.yaml
```

### **Phase 3: Dependency Resolution**
Update references to use new feature paths:
```yaml
# Before
code: "code/form/old-project.js"

# After  
code: "code/form/project-management/project.js"
```

## Tools and Scripts

### **Create Feature Script**
```bash
#!/bin/bash
# create-feature.sh
FEATURE_NAME=$1

# Create directory structure
mkdir -p components/form/$FEATURE_NAME
mkdir -p components/ui-component/organization/$FEATURE_NAME
mkdir -p components/server-side/$FEATURE_NAME
mkdir -p code/form/$FEATURE_NAME
mkdir -p code/ui-component/organization/$FEATURE_NAME
mkdir -p code/server-side/$FEATURE_NAME
mkdir -p templates/ui-component/organization/$FEATURE_NAME

# Create basic files
cat > components/form/$FEATURE_NAME/main.yaml << EOF
!!com.openkoda.service.export.dto.FormConversionDto
name: "$FEATURE_NAME"
tableName: "dynamic_${FEATURE_NAME//-/_}"
module: "$FEATURE_NAME"
code: "code/form/$FEATURE_NAME/main.js"
EOF

echo "Feature '$FEATURE_NAME' created successfully"
```

### **Build Package Script**
```bash
#!/bin/bash
# build-feature-package.sh
FEATURE_NAME=$1
VERSION=${2:-1.0.0}

PACKAGE_DIR="packages/$FEATURE_NAME-$VERSION"
mkdir -p $PACKAGE_DIR

# Copy feature files
cp -r components/form/$FEATURE_NAME $PACKAGE_DIR/components/form/
cp -r components/ui-component/organization/$FEATURE_NAME $PACKAGE_DIR/components/ui-component/organization/
# ... copy other directories

# Create manifest
cat > $PACKAGE_DIR/manifest.yaml << EOF
name: $FEATURE_NAME
version: $VERSION
description: $FEATURE_NAME feature package
created: $(date)
EOF

# Create zip
cd packages
zip -r $FEATURE_NAME-$VERSION.zip $FEATURE_NAME-$VERSION/
cd ..

echo "Package created: packages/$FEATURE_NAME-$VERSION.zip"
```

## Conclusion

Yes, **new features absolutely get created in new folders** in Openkoda. The recommended approach is:

1. **Create a dedicated feature folder** (e.g., `project-management/`)
2. **Organize by component type** within that folder
3. **Follow scope conventions** (global, organization, public)
4. **Use consistent naming** across all files
5. **Package for reuse** using the import/export system

This modular approach allows:
- **Clean separation** of concerns between features
- **Easy sharing** of features between applications
- **Simple updates** without affecting other features
- **Selective deployment** of features to different organizations
- **Version control** at the feature level

The examples in `/examples/` directory show this pattern in practice, with each example (insurance, timelog) organized as a self-contained feature module that can be imported into any Openkoda instance.