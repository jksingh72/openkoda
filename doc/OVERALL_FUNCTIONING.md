# Openkoda — Overall Functioning & Operational Lifecycle

This document describes the end-to-end operation, bootstrapping lifecycle, request flows, and operational procedures of Openkoda.

---

## 1. System Bootstrapping & Lifecycle

Openkoda uses a multi-phase initialization pipeline to support runtime bytecode compilation and dynamic entities:

```mermaid
sequenceDiagram
    autonumber
    participant Main as OpenkodaApp.main()
    participant JDBC as JDBCApp (Pre-Flight)
    participant DB as PostgreSQL
    participant Dyn as DynamicEntityRegistrationService
    participant Boot as App.startApp() (Spring Boot)
    participant Init as BasicCustomisationService
    participant Hazel as Hazelcast Cluster

    Main->>Main: Verify flags (--force) & active profiles
    Main->>JDBC: Launch JDBCApp pre-flight
    JDBC->>DB: Connect using raw JDBC driver
    JDBC->>DB: Execute DbVersionService migrations (core_upgrade.sql)
    JDBC->>DB: Query form & dynamic_entity definitions
    JDBC->>Dyn: Generate DynamicEntityDescriptors
    Main->>Dyn: buildAndLoadDynamicClasses(ClassLoader)
    Dyn->>Dyn: ByteBuddy compiles and injects entity classes
    Main->>Boot: Launch Spring Boot Container
    Boot->>Boot: Hibernate PersistenceUnitPostProcessor registers dynamic classes
    Boot->>Boot: Spring Data creates repositories and registers beans
    Boot->>Init: onApplicationStart()
    Init->>DB: Load initial administrative credentials and privileges
    Init->>DB: Load schedulers and event listeners from database
    Init->>DB: SearchViewCreator executes DDL for global_search_view
    Init->>Hazel: Join Hazelcast cluster and listen to CLUSTER_EVENT_TOPIC
    Init->>Init: Emit ApplicationEvent.APPLICATION_STARTED
    Boot-->>Main: Application ready and accepting traffic on port 8080
```

---

## 2. HTTP Request Lifecycle (Generic CRUD Flow)

When an authenticated user accesses or submits a dynamic CRUD entity:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web Browser / API Client
    participant Sec as Spring Security Filters
    participant Tenant as TenantResolver
    participant Ctrl as CRUDControllerHtml / CRUDApiController
    participant Flow as Flow Pipeline
    participant Rep as SecureRepository
    participant Audit as PropertyChangeInterceptor
    participant DB as PostgreSQL
    participant View as Thymeleaf / FrontendResource

    Client->>Sec: POST /html/organization/5/invoice/new
    Sec->>Sec: Validate session / API token & check @PreAuthorize
    Sec->>Tenant: Set TenantedResource(orgId=5, user, method=POST)
    Sec->>Ctrl: Dispatch request to generic CRUD handler
    Ctrl->>Flow: Flow.init(services).thenSet(...).execute()
    Flow->>Rep: Call saveOne(entity)
    Rep->>Audit: Intercept entity insertion
    Audit->>Audit: Record JSON property diff, client IP, user ID
    Rep->>DB: INSERT INTO invoice (...) VALUES (...)
    Audit->>DB: INSERT INTO audit (...) VALUES (...)
    Flow-->>Ctrl: Return PageModelMap
    Ctrl->>View: Request template resolution
    View->>DB: Check if custom template exists in frontend_resource
    View->>View: Render HTML with model data
    View-->>Client: 200 OK (HTML / JSON)
```

---

## 3. Dynamic Event Dispatching & Asynchronous Consumers

Openkoda provides an asynchronous event bus that connects system actions with notification channels and integrations:

```mermaid
graph TD
    Trigger["Action Occurs\n(e.g., User Registered, Form Saved, Cron Triggered)"] --> Dispatch["ApplicationEventService.emitEvent(event, data)"]
    
    Dispatch --> SyncListeners["Synchronous Event Listeners"]
    Dispatch --> AsyncListeners["Asynchronous Thread Pool"]
    
    AsyncListeners --> ConsumerType{"Consumer Type"}
    
    ConsumerType -->|JavaScript| GraalJS["ServerJSRunner.startServerJs(script, model)"]
    ConsumerType -->|Email| EmailService["EmailService.sendAndSaveEmail(...)"]
    ConsumerType -->|Webhook| WebhookJob["PostMessagesToWebhookJob (Slack, Teams)"]
    ConsumerType -->|Issue Tracker| IssueConsumer["Jira / GitHub / Trello Consumer"]
```

---

## 4. Component Packaging & Hot Migration Flow

Openkoda applications can be exported and imported as ZIP archives without redeploying code:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant Ctrl as ComponentsController
    participant ZipService as ZipComponentImportService
    participant DB as PostgreSQL
    participant Hazel as ClusterEventSenderService
    participant Cluster as Hazelcast Nodes

    Admin->>Ctrl: POST /html/component/import/zip (Upload application.zip)
    Ctrl->>ZipService: Process uploaded archive within a single transaction
    ZipService->>ZipService: Parse YAML manifests (forms, endpoints, events, schedulers)
    ZipService->>DB: Insert/Update records in component tables
    ZipService->>Hazel: Broadcast reload signals
    Hazel->>Cluster: Publish SCHEDULER_RELOAD, FORM_RELOAD, EVENT_LISTENER_RELOAD
    Cluster->>Cluster: Invalidate local caches and reload components
    ZipService-->>Ctrl: Return import summary log
    Ctrl-->>Admin: Display import success confirmation
```

---

## 5. Hot Application Restart Mechanism

When dynamic entity schemas change (new database columns added or modified), Openkoda provides a programmatic restart mechanism without terminating the JVM process:

1. Admin clicks **Save & Apply** in the Data Model Builder.
2. The controller calls [`App.restart(reloadAllForms = true)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java).
3. A background non-daemon thread:
   - Fetches all current `Form` definitions from the database.
   - Gracefully closes the active Spring `ConfigurableApplicationContext`.
   - Invokes [`DynamicEntityRegistrationService.generateDynamicEntityDescriptors(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java).
   - Re-synthesizes and injects modified classes into the ClassLoader via ByteBuddy.
   - Re-launches the Spring application context using `SpringApplicationBuilder`.
4. The application is completely updated with the new schema in a few seconds.
