# Configuration Processing Module in Openkoda

## Overview: The Core Engine That Processes Configuration Files

Openkoda has a sophisticated **configuration processing module** that takes YAML/JavaScript configuration files as input and automatically generates complete features. This is the "magic" behind Openkoda's low-code capabilities.

## The Core Processing Module: `com.openkoda.service.export` Package

### **Primary Components:**

1. **`ZipComponentImportService`** - Main entry point for ZIP package imports
2. **`YamlToEntityConverterFactory`** - Factory for YAML-to-entity converters
3. **`FormYamlToEntityConverter`** - Converts form YAML to Form entities
4. **`ComponentsController`** - REST API for import/export operations
5. **`FormService`** - Manages form registration and processing

## How It Works: The Complete Flow

### **Step 1: ZIP Package Upload**
```
User uploads ZIP → ComponentsController → ZipComponentImportService
```

**File:** `ComponentsController.java`
```java
@PostMapping(value = _COMPONENT + _IMPORT)
@ResponseBody
@PreAuthorize(CHECK_CAN_MANAGE_BACKEND)
public String importZippedYaml(@RequestParam MultipartFile file, 
                               @RequestParam(required = false) boolean delete) {
    return services.zipComponentImport.loadResourcesFromZip(file, delete);
}
```

### **Step 2: ZIP Extraction & YAML Parsing**

**File:** `ZipComponentImportService.java`
```java
public String loadResourcesFromZip(MultipartFile zipFile, boolean delete) {
    ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipFile.getBytes()));
    
    while ((entry = zis.getNextEntry()) != null) {
        if (entry.getName().endsWith(".yaml")) {
            // Parse YAML using SnakeYAML
            configsFromZip.put(entry.getName(), new Yaml().load(content.toString()));
        } else if (entry.getName().contains("code/") || entry.getName().contains("resources/")) {
            // Store JavaScript and resource files
            componentResourcesFromZip.put(entry.getName(), content.toString());
        }
    }
    
    // Process each component
    processComponentsFromZip(configsFromZip, componentResourcesFromZip, importNote);
}
```

### **Step 3: YAML-to-Entity Conversion**

**File:** `YamlToEntityConverterFactory.java`
```java
public <T, D> T processYamlDto(D dto, String filePath) {
    // Find appropriate converter based on DTO class
    YamlToEntityConverter<T, D> converter = 
        (YamlToEntityConverter<T, D>) parentConverters.get(dto.getClass());
    
    // Convert and save
    return converter.convertAndSave(dto, filePath);
}
```

### **Step 4: Form-Specific Processing**

**File:** `FormYamlToEntityConverter.java`
```java
@Component
@YamlToEntityParentConverter(dtoClass = FormConversionDto.class)
public class FormYamlToEntityConverter implements YamlToEntityConverter<Form, FormConversionDto> {
    
    @Override
    public Form convertAndSave(FormConversionDto dto, String filePath) {
        // Create or update Form entity
        Form form = getForm(dto, loadResourceAsString(dto.getCode()));
        
        // Create database table
        services.dynamicEntity.createDynamicTableIfNotExists(form.getTableName());
        
        // Save form to database
        return repositories.secure.form.saveOne(form);
    }
}
```

### **Step 5: Database Table Creation**

**File:** `DynamicEntityService.java`
```java
public boolean createDynamicTableIfNotExists(String tableName) {
    if (!repositories.unsecure.nativeQueries.ifTableExists(tableName)) {
        // Create table using native SQL
        repositories.unsecure.nativeQueries.createTable(tableName);
        
        // For multi-tenancy: create tables for all tenants
        if (MultitenancyService.isMultitenancy()) {
            multitenancyService.runEntityManagerForAllTenantsInTransaction(1000, (em, orgId) -> {
                em.createNativeQuery(createTableSql).executeUpdate();
            });
        }
    }
    return true;
}
```

### **Step 6: Dynamic Entity Registration**

**File:** `DynamicEntityRegistrationService.java`
```java
public static int generateDynamicEntityDescriptors(List<Form> forms, Long timeMillis) {
    for(Form form : forms) {
        String formName = form.getName();
        String tableName = form.getTableName();
        List<FrontendMappingFieldDefinition> fields = getFieldsFromForm(form);
        
        // Use ByteBuddy to generate JPA entity class
        DynamicEntityDescriptorFactory.create(formName, tableName, fields, timeMillis);
    }
}
```

## Complete Processing Pipeline

### **Input: Configuration Files**
```
project-management.zip
├── components/form/project.yaml
├── components/form/task.yaml
├── code/form/project.js
├── code/form/task.js
├── components/ui-component/organization/dashboard.yaml
└── templates/ui-component/organization/dashboard.html
```

### **Processing Steps:**

1. **Parse YAML Files** → `FormConversionDto`, `FrontendResourceConversionDto`, etc.
2. **Validate Configuration** → Check field types, privileges, dependencies
3. **Convert to Entities** → Create `Form`, `FrontendResource`, `ServerJs` entities
4. **Create Database Tables** → Generate `dynamic_project`, `dynamic_task` tables
5. **Generate JPA Entities** → ByteBuddy creates `Project`, `Task` classes
6. **Register Repositories** → Create `ProjectRepository`, `TaskRepository`
7. **Register Controllers** → Auto-generate `/api/project`, `/html/project/all`
8. **Register UI Components** → Create frontend resource entries
9. **Update Search Index** → Add to `global_search_view`
10. **Restart Context** → Reload Spring context if needed

## Key Converter Classes

### **For Different Component Types:**

| Component Type | Converter Class | DTO Class | Output Entity |
|----------------|-----------------|-----------|---------------|
| **Forms** | `FormYamlToEntityConverter` | `FormConversionDto` | `Form` |
| **UI Components** | `FrontendResourceYamlToEntityConverter` | `FrontendResourceConversionDto` | `FrontendResource` |
| **Server JS** | `ServerJsYamlToEntityConverter` | `ServerJsConversionDto` | `ServerJs` |
| **Events** | `EventListenerEntryYamlToEntityConverter` | `EventListenerConversionDto` | `EventListenerEntry` |
| **Schedulers** | `SchedulerYamlToEntityConverter` | `SchedulerConversionDto` | `Scheduler` |
| **API Endpoints** | `ControllerEndpointYamlToEntityConverter` | `ControllerEndpointConversionDto` | `ControllerEndpoint` |

### **Converter Registration:**
```java
@Component
@YamlToEntityParentConverter(dtoClass = FormConversionDto.class)
public class FormYamlToEntityConverter implements YamlToEntityConverter<Form, FormConversionDto> {
    // Converter implementation
}
```

## DTO (Data Transfer Object) Classes

### **FormConversionDto** (`FormConversionDto.java`)
```java
public class FormConversionDto extends ComponentDto {
    private String name;
    private String tableName;
    private String readPrivilege;
    private String writePrivilege;
    private boolean registerApiCrudController;
    private boolean registerHtmlCrudController;
    private String code;  // Path to JavaScript file
    // ... other properties
}
```

### **Example YAML:**
```yaml
!!com.openkoda.service.export.dto.FormConversionDto
name: "project"
tableName: "dynamic_project"
readPrivilege: "canViewProjects"
writePrivilege: "canManageProjects"
registerApiCrudController: true
registerHtmlCrudController: true
code: "code/form/project.js"
```

## The Magic: What Happens Behind the Scenes

### **1. Dynamic Class Generation**
```java
// ByteBuddy creates JPA entity classes at runtime
DynamicType.Builder<?> builder = new ByteBuddy()
    .subclass(OpenkodaEntity.class)
    .name(PACKAGE + formName)
    .annotateType(AnnotationDescription.Builder.ofType(Entity.class).build())
    .annotateType(AnnotationDescription.Builder.ofType(Table.class)
        .define("name", tableName).build());
    
// Add fields dynamically
for (FrontendMappingFieldDefinition field : fields) {
    builder = builder.defineField(field.getName(), getJavaType(field.getType()), PUBLIC);
}
```

### **2. Repository Registration**
```java
// Create Spring Data repository for dynamic entity
Class<? extends SecureRepository<? extends OpenkodaEntity>> repositoryClass = 
    generateRepositoryClass(entityClass);

// Register with SearchableRepositories
SearchableRepositories.registerSearchableRepository(
    tableName, 
    new JpaRepositoryFactory(em).getRepository(repositoryClass)
);
```

### **3. Controller Generation**
```java
// FormService automatically registers CRUD controllers
if (form.isRegisterHtmlCrudController()) {
    // Generate HTML CRUD controller
    registerHtmlCrudController(form);
}

if (form.isRegisterApiCrudController()) {
    // Generate REST API controller
    registerApiCrudController(form);
}
```

## Configuration Validation

### **Database Validation:**
```java
public boolean validateColumnTypes(String tableName, 
                                   Map<String, String> fieldNameDbTypeMap,
                                   StringBuilder validationLog,
                                   StringBuilder updateQuery) {
    // Check if existing table columns match YAML definition
    // Suggest ALTER TABLE statements if needed
}
```

### **Privilege Validation:**
```java
// Ensure referenced privileges exist
if (isNotBlank(dto.getReadPrivilege())) {
    PrivilegeBase privilege = PrivilegeHelper.getInstance()
        .valueOfString(dto.getReadPrivilege());
    if (privilege == null) {
        throw new IllegalArgumentException("Invalid privilege: " + dto.getReadPrivilege());
    }
}
```

## Multi-Tenancy Support

### **Tenant-Aware Processing:**
```java
// Create tables for all tenants in multi-tenant setup
multitenancyService.runEntityManagerForAllTenantsInTransaction(1000, (em, orgId) -> {
    Boolean exists = (Boolean) em.createNativeQuery(tableExistsSql)
        .setParameter("tableName", tableName)
        .getSingleResult();
    
    if (exists == null || !exists) {
        em.createNativeQuery(createTableSql).executeUpdate();
    }
});
```

## Error Handling & Rollback

### **Transaction Management:**
```java
@Transactional(propagation = REQUIRES_NEW)
public String loadResourcesFromZip(MultipartFile zipFile, boolean delete) {
    // Entire import runs in a transaction
    // If any step fails, everything rolls back
}
```

### **Import Notes:**
```java
StringBuilder importNote = new StringBuilder();
importNote.append("Processing form: project\n");
importNote.append("Creating table: dynamic_project\n");
importNote.append("Registering controller: /api/project\n");
// Return to user as feedback
```

## REST API Endpoints

### **Import/Export Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/components/import` | POST | Import ZIP package |
| `/api/components/export/all` | GET | Export all components |
| `/api/components/export/form/{id}` | GET | Export specific form |
| `/api/components/export/ui-component/{id}` | GET | Export UI component |

### **Example Import Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@project-management.zip" \
  https://openkoda-instance.com/api/components/import
```

## The Complete Processing Chain

### **For a Form Definition:**
```
project.yaml + project.js 
    → FormConversionDto 
    → FormYamlToEntityConverter 
    → Form entity
    → DynamicEntityService.createDynamicTableIfNotExists()
    → DynamicEntityRegistrationService.generateDynamicEntityDescriptors()
    → ByteBuddy generates Project.java
    → Spring Data creates ProjectRepository
    → FormService.registerForm()
    → CRUD controllers auto-generated
    → SearchIndexUpdaterJob.updateSearchIndexes()
```

### **For a UI Component:**
```
dashboard.yaml + dashboard-GET.js + dashboard.html
    → FrontendResourceConversionDto
    → FrontendResourceYamlToEntityConverter
    → FrontendResource entity
    → FrontendResourceService.register()
    → Available at /html/dashboard
```

## Configuration File Discovery

### **Classpath Scanning:**
```java
@Service
public class ClasspathComponentImportService extends YamlComponentImportService {
    
    public void importComponentsFromClasspath() {
        // Scan classpath for YAML files
        // Auto-import during application startup
    }
}
```

### **Filesystem Sync:**
```properties
# application.properties
components.export.syncWithFilesystem=true
```

When enabled, Openkoda watches the filesystem and automatically imports changed configuration files.

## Performance Considerations

### **Lazy Loading:**
- Forms loaded on-demand
- JavaScript parsed when first executed
- Database tables created when first accessed

### **Caching:**
- Form definitions cached in memory
- Generated classes cached
- Repository instances cached

### **Batch Processing:**
- Multiple forms processed in batch
- Database updates batched
- Search index updates deferred

## Extension Points

### **Custom Converters:**
```java
@Component
@YamlToEntityParentConverter(dtoClass = CustomComponentDto.class)
public class CustomComponentYamlToEntityConverter 
    implements YamlToEntityConverter<CustomEntity, CustomComponentDto> {
    
    @Override
    public CustomEntity convertAndSave(CustomComponentDto dto, String filePath) {
        // Custom processing logic
    }
}
```

### **Custom Validators:**
```java
public interface ComponentValidator {
    boolean validate(ComponentDto dto, Map<String, String> resources);
}
```

## Debugging & Monitoring

### **Logging:**
```java
debug("[convertAndSave] Processing form: {}", dto.getName());
debug("[createDynamicTableIfNotExists] Table: {}", tableName);
```

### **Import Notes:**
```java
StringBuilder importNote = new StringBuilder();
importNote.append("SUCCESS: Imported 5 forms, 3 UI components\n");
importNote.append("Created tables: dynamic_project, dynamic_task\n");
importNote.append("Registered endpoints: /api/project, /html/project/all\n");
return importNote.toString();
```

## Security Considerations

### **Input Validation:**
- YAML file size limits
- JavaScript sandboxing
- SQL injection prevention
- Path traversal prevention

### **Privilege Enforcement:**
- Only users with `CHECK_CAN_MANAGE_BACKEND` can import
- Form privileges validated against system
- Organization scope enforced

## Conclusion

The **`com.openkoda.service.export`** package is the heart of Openkoda's configuration processing system. It:

1. **Parses** YAML and JavaScript configuration files
2. **Validates** configurations against database schema and security rules
3. **Converts** DTOs to persistent entities
4. **Generates** database tables and JPA entities dynamically
5. **Registers** controllers, repositories, and UI components
6. **Manages** multi-tenancy and transaction rollback
7. **Provides** REST API for import/export operations

This modular, converter-based architecture makes Openkoda extensible - new component types can be added by implementing the `YamlToEntityConverter` interface and annotating with `@YamlToEntityParentConverter`.

The system enables true low-code development by allowing features to be defined declaratively in YAML and JavaScript, then automatically transformed into fully-functional Java Spring Boot applications.