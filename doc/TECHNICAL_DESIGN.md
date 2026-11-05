# Openkoda — Technical Design & Low-Level Architecture

This document details the core technical design, execution patterns, and data architecture of the Openkoda platform.

---

## 1. Five-Tier Architectural Pattern

```mermaid
graph TB
    subgraph PresentationTier ["1. Presentation Tier"]
        Thymeleaf["Thymeleaf Template Engine"]
        DynamicResolver["FrontendResourceOrClassLoaderTemplateResolver"]
        PageBuilder["Page Builder & UI Widgets"]
        RESTAPI["Spring Web REST APIs"]
    end

    subgraph ControllerTier ["2. Controller Tier"]
        CRUDHtml["CRUDControllerHtml"]
        CRUDApi["CRUDApiController"]
        ComponentsCtrl["ComponentsController"]
        PageBuilderCtrl["PageBuilderController"]
        AdminCtrl["AdminLogsController & SystemHealthController"]
    end

    subgraph BusinessTier ["3. Business Logic & Flow Tier"]
        Flow["Flow Monadic Execution Pipeline"]
        GraalJS["GraalVM Polyglot JS Engine"]
        LiveComp["LiveComponentProvider"]
        EventBus["ApplicationEventService"]
        HazelcastSync["Hazelcast Cluster Synchronization"]
    end

    subgraph SecurityDataAccessTier ["4. Security & Data Access Tier"]
        SecRules["HasSecurityRules (SpEL / JPQL Filters)"]
        SecRep["SecureRepository & SecureRepositories"]
        AuditInt["Hibernate PropertyChangeInterceptor"]
        GlobalSearch["SearchViewCreator (global_search_view)"]
    end

    subgraph PersistenceTier ["5. Persistence & Infrastructure Tier"]
        Postgres[("PostgreSQL 14+\n(Shared Schema / Multi-Schema / Multi-DB)")]
        HazelcastRing["Hazelcast Distributed Memory"]
        FileStore["File Storage (PostgreSQL LOB / FS / S3)"]
    end

    PresentationTier --> ControllerTier
    ControllerTier --> BusinessTier
    BusinessTier --> SecurityDataAccessTier
    SecurityDataAccessTier --> PersistenceTier
```

---

## 2. Dynamic Bytecode Generation with ByteBuddy

One of Openkoda's key technical innovations is avoiding generic "key-value EAV (Entity-Attribute-Value)" anti-patterns for dynamic entities. Instead, Openkoda synthesizes real Java bytecode classes and genuine PostgreSQL tables at runtime.

### Bytecode Compilation Pipeline
1. **Form Definitions**: Administrators create entities with fields via the UI.
2. **Descriptor Generation**: [`DynamicEntityDescriptorFactory.create(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityDescriptorFactory.java) defines table names, column types, and formula fields.
3. **ByteBuddy Entity Synthesis**:
   ```java
   // From DynamicEntityRegistrationService.java
   DynamicType.Builder<OpenkodaEntity> builder = new ByteBuddy()
       .subclass(OpenkodaEntity.class)
       .name("com.openkoda.dynamicentity.generated." + suffixedEntityClassName)
       .annotateType(AnnotationDescription.Builder.ofType(Entity.class).build())
       .annotateType(AnnotationDescription.Builder.ofType(Table.class)
           .define("name", tableName).build());
   ```
4. **Field & Annotation Injection**: ByteBuddy generates getter/setter methods and injects annotations (`@Column`, `@Formula`, `@JoinColumn`, `@ManyToMany`).
5. **Class Loading**: Unloaded classes are loaded into the running JVM using `ClassLoadingStrategy.Default.INJECTION`.
6. **Repository Synthesis**: ByteBuddy creates a dynamic subinterface of [`SecureRepository`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository/SecureRepository.java).
7. **JPA Integration**: Openkoda's `persistenceUnitPostProcessor()` adds all dynamic entity class names to Spring's `PersistenceUnitInfo`, enabling Hibernate and Spring Data JPA to bind them as native entities.

---

## 3. The Flow Monad & Functional Pipeline

Web controller methods in Openkoda avoid procedural, boilerplate-heavy service calls in favor of a functional, monadic request pipeline implemented in [`Flow<I, O, CP>`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/Flow.java).

```mermaid
graph LR
    Init["Flow.init(services)"] --> Step1["thenSet(entity, a -> repository.findOne(id))"]
    Step1 --> Step2["thenSet(form, a -> formService.bind(a.result))"]
    Step2 --> Step3["then(a -> customValidation(a))"]
    Step3 --> Exec["execute()"]
    Exec --> View["mav('viewName') / res(JSON)"]
```

### Key Technical Characteristics of Flow
- **Immutable Result Propagation**: Each `then()` or `thenSet()` step receives a [`ResultAndModel`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/ResultAndModel.java) containing the current step result, the accumulated `PageModelMap`, and injected Spring services.
- **Transactional Boundary Management**: Steps wrapped with transactional executors commit or roll back automatically upon exceptions.
- **Bi-Directional Polyglot Support**: The same `Flow` interface is exposed into GraalVM JavaScript, allowing scripts to chain Java Spring operations:
  ```javascript
  flow
    .thenSet("lead", a => a.services.data.findLead(a.model.get("id")))
    .then(a => a.services.email.sendNotification(a.result));
  ```

---

## 4. Multi-Tenancy Architecture & Query Routing

Openkoda implements flexible multi-tenancy at both the persistence and application layer.

```mermaid
graph TD
    Request["Incoming HTTP Request"] --> Filter["TenantResolver Interceptor"]
    Filter --> ThreadLocal["TenantResolver.setTenantedResource(orgId, host, method)"]
    
    ThreadLocal --> ModeCheck{"Multi-tenancy Mode?"}
    
    ModeCheck -->|Shared Schema| SharedSQL["Query PostgreSQL 'public' Schema\nWHERE organization_id = :orgId"]
    ModeCheck -->|Multi-Schema| SchemaSQL["SET search_path = org_101, public;\nQuery tenant-specific schema"]
    ModeCheck -->|Multi-Database| DBSQL["Dynamic Routing DataSource\nRoute to Tenant Database"]
```

### Automatic Tenant Security via SpEL
In shared-schema mode, queries are automatically isolated using Spring Security SpEL rules:
```java
// Example from HasSecurityRules.java
String CHECK_CAN_READ_ORG_DATA = 
    "principal.hasGlobalOrOrgPrivilege('readOrgData', #organizationId)";
```
Repositories extending [`SecureRepository`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository/SecureRepository.java) apply JPA criteria specifications that constrain result sets to the authenticated user's organization IDs.

---

## 5. Unified Global Search Architecture

Instead of adding the operational complexity of Elasticsearch, Openkoda constructs a unified SQL view at application startup:

1. [`SearchViewCreator`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/lifecycle/SearchViewCreator.java) inspects all registered [`SearchableRepositories`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository/SearchableRepositories.java).
2. It extracts search metadata, URL path formulas, and required read privileges for each entity.
3. Generates a dynamic PostgreSQL database view:
   ```sql
   CREATE OR REPLACE VIEW global_search_view AS 
     (SELECT id, 'user' as name, organization_id, created_on, updated_on, 
             (first_name || ' ' || last_name) as description, 
             'readUserData' as required_read_privilege, 
             ('/html/organization/' || organization_id || '/user/' || id) as urlPath 
      FROM users)
     UNION
     (SELECT id, 'organization' as name, id as organization_id, created_on, updated_on, 
             name as description, 
             'readOrgData' as required_read_privilege, 
             ('/html/organization/' || id || '/settings') as urlPath 
      FROM organization)
     UNION ... (all searchable static & dynamic entities);
   ```
4. Single-query execution: [`GlobalSearchController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/GlobalSearchController.java) queries `global_search_view` using standard SQL `ILIKE` or full-text operators, enforcing tenant boundaries and read privileges in a single query.

---

## 6. Hazelcast Clustering & State Synchronization

In multi-node deployments, Openkoda nodes communicate via an embedded **Hazelcast 5.x** cluster.

1. **Distributed Sessions**: User web sessions are replicated across cluster nodes via `spring-session-hazelcast`.
2. **Cluster Topic (`CLUSTER_EVENT_TOPIC`)**:
   - When an administrator modifies a form, scheduler, or event listener on Node 1, [`ClusterEventSenderService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventSenderService.java) broadcasts a [`ClusterEvent`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEvent.java) to the topic.
   - Node 2..N receive the message via [`ClusterEventListenerService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventListenerService.java) and reload the definition locally in memory without restart.
