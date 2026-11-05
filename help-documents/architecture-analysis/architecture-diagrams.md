# Openkoda — Architectural Diagrams

This document visualizes the system context, modular decomposition, dependency graphs, and runtime execution sequences of the Openkoda platform derived directly from repository evidence.

---

## 1. System Context & External Dependencies

The following diagram illustrates Openkoda's boundaries, user actors, and integrated external infrastructure systems.

```mermaid
flowchart TD
    subgraph Users ["User Actors"]
        AdminUser["System Administrator<br/>(Browser)"]
        OrgUser["Organization User / Member<br/>(Browser)"]
        ApiClient["External Client / Service<br/>(REST API / WebSocket)"]
    end

    subgraph OpenkodaRuntime ["Openkoda Monolith (JVM 17 / Spring Boot 3.0.5)"]
        direction TB
        SecurityFilter["Spring Security Filter Chains<br/>(Session / Token / OAuth2)"]
        WebMVC["Spring MVC & Thymeleaf<br/>(/html/**)"]
        RestAPI["REST API Controllers<br/>(/api/v1/**, /api/v2/**)"]
        FlowEngine["Monadic Flow Orchestration Engine"]
        ByteBuddyEngine["ByteBuddy Dynamic Entity Engine"]
        GraalVMEngine["GraalVM Polyglot JS Engine"]
        EventBus["ApplicationEventService & Scheduler"]
    end

    subgraph Infrastructure ["Data & Clustering Infrastructure"]
        PostgresDB[("PostgreSQL 14+<br/>(Entities, Dynamic Tables, Migrations)")]
        HazelcastCluster["Hazelcast Cluster<br/>(Session Replication, Topic Sync)"]
        FileStore[("File Storage<br/>(Local DB BLOB / Filesystem / AWS S3)")]
    end

    subgraph OutboundServices ["External SaaS & Integrations"]
        GitHubAPI["GitHub REST API"]
        JiraAPI["Atlassian Jira REST API"]
        SlackTeams["Slack / MS Teams Webhooks"]
        OpenAIAPI["OpenAI API (GPT-3 / GPT-4)"]
        SMTPServer["SMTP Mail Server"]
    end

    AdminUser -->|"HTTP / Form Login"| SecurityFilter
    OrgUser -->|"HTTP / SSO / Password"| SecurityFilter
    ApiClient -->|"HTTP / Header API Token"| SecurityFilter

    SecurityFilter --> WebMVC
    SecurityFilter --> RestAPI

    WebMVC --> FlowEngine
    RestAPI --> FlowEngine
    FlowEngine --> ByteBuddyEngine
    FlowEngine --> GraalVMEngine
    FlowEngine --> EventBus

    FlowEngine --> PostgresDB
    ByteBuddyEngine --> PostgresDB
    EventBus --> HazelcastCluster
    FlowEngine --> FileStore

    EventBus --> GitHubAPI
    EventBus --> JiraAPI
    EventBus --> SlackTeams
    FlowEngine --> OpenAIAPI
    EventBus --> SMTPServer
```

---

## 2. Main Modules & Architectural Responsibilities

This diagram maps the layered architectural tiers and responsibilities established in the codebase.

```mermaid
flowchart TD
    subgraph PresentationTier ["1. Presentation Tier (UI & Client State)"]
        ThymeleafEngine["Thymeleaf Engine"]
        DynamicResolver["FrontendResourceOrClassLoaderTemplateResolver"]
        HTMLTemplates["HTML5 / Thymeleaf Templates & Layouts"]
        PageModel["PageModelMap & PageAttr View Models"]
    end

    subgraph InboundTier ["2. Inbound Interfaces (Transport)"]
        CRUDHtmlCtrl["CRUDControllerHtml (/html/{obj}/**)"]
        CRUDApiCtrl["CRUDApiController (/api/v1/{obj}/**)"]
        PageBuilderCtrl["PageBuilderController"]
        ComponentsCtrl["ComponentsController (YAML / ZIP)"]
        AdminCtrls["AdminLogsController & SystemHealthController"]
    end

    subgraph ApplicationTier ["3. Application / Orchestration Tier"]
        FlowMonad["Flow Pipeline Monad (then, thenSet, execute)"]
        TransactionalExec["TransactionalExecutor"]
        LiveCompProvider["LiveComponentProvider (JS Bridge)"]
        AppEventService["ApplicationEventService"]
    end

    subgraph PolyglotTier ["4. Scripting & Bytecode Synthesis"]
        JsRunner["JsFlowRunner (GraalVM Polyglot Context)"]
        DynamicEntityService["DynamicEntityRegistrationService"]
        ByteBuddyCompiler["ByteBuddy In-Memory Class Compiler"]
    end

    subgraph DomainTier ["5. Domain Core & Business Rules"]
        OrgEntity["Organization (Tenant Root)"]
        UserRoleEntity["User, Role & DynamicPrivilege"]
        DynamicEntityModel["DynamicEntity & Form Descriptors"]
        SpelRules["RuleSpelHelper (SpEL Expression Engine)"]
    end

    subgraph PersistenceTier ["6. Persistence & Data Access"]
        SecureRepo["SecureRepository & SearchableFunctionalRepository"]
        DynamicRepos["Dynamic Repositories (JpaRepositoryFactory)"]
        TenantResolverImpl["TenantResolver (CurrentTenantIdentifierResolver)"]
        DbVersion["DbVersionService (Pre-flight SQL Runner)"]
    end

    PresentationTier <--> InboundTier
    InboundTier --> ApplicationTier
    ApplicationTier --> PolyglotTier
    ApplicationTier --> DomainTier
    ApplicationTier --> PersistenceTier
    PolyglotTier --> PersistenceTier
    PersistenceTier --> DomainTier
```

---

## 3. Component & Module Dependencies (The ComponentProvider Hub)

This diagram details the dependencies between components, highlighting the universal `ComponentProvider` hub pattern and its relationship to controllers, services, and repositories.

```mermaid
flowchart LR
    subgraph MegaAggregator ["Universal Hub Pattern (Observed Codebase Shape)"]
        ComponentProvider["ComponentProvider<br/>(Base class for Controllers & Services)"]
        ServicesHub["Services (AllServices Bean)<br/>Injects 25+ Service Beans"]
        RepositoriesHub["Repositories (AllRepositories Bean)<br/>Injects Secure & Unsecure Repos"]
        ControllersHub["Controllers Bean<br/>Injects Controller Configurations"]
    end

    subgraph Controllers ["Controller Layer"]
        CRUDHtml["CRUDControllerHtml"]
        CRUDApi["CRUDApiController"]
        UserHtml["UserControllerHtml"]
        OrgHtml["OrganizationControllerHtml"]
    end

    subgraph Services ["Service Layer"]
        OrgService["OrganizationService"]
        UserService["UserService"]
        DynEntityService["DynamicEntityRegistrationService"]
        EventServ["EventListenerService"]
    end

    subgraph Repositories ["Repository Layer"]
        SecUserRepo["SecureUserRepository"]
        SecOrgRepo["SecureOrganizationRepository"]
        SecFormRepo["SecureFormRepository"]
        DynamicRepoReg["SearchableRepositories (Dynamic)"]
    end

    ComponentProvider --> ServicesHub
    ComponentProvider --> RepositoriesHub
    ComponentProvider --> ControllersHub

    CRUDHtml -.->|extends| ComponentProvider
    CRUDApi -.->|extends| ComponentProvider
    UserHtml -.->|extends| ComponentProvider
    OrgHtml -.->|extends| ComponentProvider

    ServicesHub --> OrgService
    ServicesHub --> UserService
    ServicesHub --> DynEntityService
    ServicesHub --> EventServ

    RepositoriesHub --> SecUserRepo
    RepositoriesHub --> SecOrgRepo
    RepositoriesHub --> SecFormRepo
    RepositoriesHub --> DynamicRepoReg

    Services -.->|injects| RepositoriesHub
    Services -.->|circular dependency enabled| ComponentProvider
```

> [!NOTE]
> The bidirectional reference between `Services`, `Repositories`, and `ComponentProvider` is the root cause for requiring `spring.main.allow-circular-references=true` in `application-openkoda.properties`.

---

## 4. Runtime Flow: Dynamic Entity Synthesis & Bootstrapping

Sequence of events executing during application initialization, demonstrating the two-stage boot pipeline:

```mermaid
sequenceDiagram
    autonumber
    participant Main as OpenkodaApp.main()
    participant JDBC as JDBCApp (Pre-Flight)
    participant DB as PostgreSQL Database
    participant Upgrade as DbVersionService
    participant DynService as DynamicEntityRegistrationService
    participant ByteBuddy as ByteBuddy In-Memory Engine
    participant SpringApp as App.startApp() (Spring Boot)
    participant PostProc as PersistenceUnitPostProcessor
    participant JpaFactory as JpaRepositoryFactory

    Main->>Main: Check safety flags (--force)
    Main->>JDBC: Launch pre-flight JDBCApp
    JDBC->>DB: Open raw JDBC Connection (bypassing Hibernate)
    JDBC->>Upgrade: tryUpgrade(Connection)
    Upgrade->>DB: Execute core_upgrade.sql version blocks
    JDBC->>DB: Query form & dynamic_entity tables
    DB-->>JDBC: Return active dynamic Form definitions
    JDBC->>DynService: generateDynamicEntityDescriptors(forms)
    Main->>DynService: buildAndLoadDynamicClasses(ClassLoader)
    DynService->>ByteBuddy: Synthesize JPA entity classes with @Entity, @Table, @Column
    ByteBuddy-->>DynService: Generated dynamic classes in ClassLoader
    DynService->>ByteBuddy: Synthesize dynamic SecureRepository interfaces
    Main->>SpringApp: SpringApplication.run(App.class, args)
    SpringApp->>PostProc: Execute persistenceUnitPostProcessor()
    PostProc->>SpringApp: Register dynamic entity names into EntityManagerFactoryBuilder
    SpringApp->>DynService: registerDynamicRepositories()
    DynService->>JpaFactory: new JpaRepositoryFactory(em).getRepository(repositoryClass)
    DynService->>DynService: Register with SearchableRepositories
    SpringApp-->>Main: Application Context Initialized & Serving Requests
```

---

## 5. Runtime Flow: Tenanted Read Request through Monadic Flow

Sequence diagram tracing an incoming HTTP GET request for a tenanted dynamic entity list:

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Web Browser / Client
    participant SecFilter as WebSecurityFilterChain
    participant Ctrl as CRUDControllerHtml.getAll()
    participant Config as HtmlCRUDControllerConfigurationMap
    participant FlowMonad as Flow Pipeline
    participant SecRepo as SecureRepository
    participant SpecFactory as SearchableFunctionalRepository
    participant DB as PostgreSQL
    participant Model as PageModelMap
    participant View as Thymeleaf / Template Engine

    Browser->>SecFilter: GET /html/organization/121/claim/all?obj_search=auto
    SecFilter->>SecFilter: Authenticate session, populate UserProvider context
    SecFilter->>Ctrl: Invoke getAll(organizationId=121, obj="claim")
    Ctrl->>Config: getIgnoreCase("claim")
    Config-->>Ctrl: Return CRUDControllerConfiguration (entity="Claim", readPriv="READ_CLAIM")
    Ctrl->>Ctrl: Verify user has privilege READ_CLAIM for org 121
    Ctrl->>FlowMonad: Flow.init(componentProvider)
    FlowMonad->>FlowMonad: thenSet(searchTerm, "auto")
    FlowMonad->>SecRepo: search("auto", organizationId=121, pageable)
    SecRepo->>SpecFactory: Apply secureSpecification & tenant predicate
    SpecFactory->>DB: SELECT * FROM claim WHERE organization_id = 121 AND index_string LIKE '%auto%'
    DB-->>SpecFactory: Return ResultSet Page
    SpecFactory-->>SecRepo: Return Page<SearchableOrganizationRelatedEntity>
    SecRepo-->>FlowMonad: Result tuple
    FlowMonad->>FlowMonad: calculateFieldsValuesWithReadPrivileges(...)
    FlowMonad->>Model: Populate genericTableViewList, headers, filters
    FlowMonad-->>Ctrl: Completed Flow execution
    Ctrl->>View: mav("generic-all.html", model)
    View-->>Browser: Rendered HTML table response
```

---

## 6. Runtime Flow: Asynchronous Cluster Synchronization

Sequence diagram showing how metadata changes (e.g. an updated scheduler or event listener) are broadcast across a distributed cluster:

```mermaid
sequenceDiagram
    autonumber
    participant NodeA_Admin as Node A (Admin User)
    participant NodeA_Ctrl as SchedulerController
    participant NodeA_Service as SchedulerService
    participant NodeA_Cluster as ClusterEventSenderService
    participant Hazelcast as Hazelcast CLUSTER_EVENT_TOPIC
    participant NodeB_Cluster as Node B ClusterEventListenerService
    participant NodeB_Service as Node B SchedulerService

    NodeA_Admin->>NodeA_Ctrl: POST /html/scheduler/5/settings (update cron)
    NodeA_Ctrl->>NodeA_Service: updateScheduler(5, form)
    NodeA_Service->>NodeA_Service: Update local scheduler registry in Node A
    NodeA_Service->>NodeA_Cluster: reloadScheduler(5)
    NodeA_Cluster->>NodeA_Cluster: Check ClusterHelper.isCluster()
    NodeA_Cluster->>Hazelcast: publish(ClusterEvent(SCHEDULER_RELOAD, 5))
    Hazelcast-->>NodeB_Cluster: onMessage(ClusterEvent)
    NodeB_Cluster->>NodeB_Service: reloadScheduler(5)
    NodeB_Service->>NodeB_Service: Reload cron job definition from DB into Node B memory
    Note over NodeA_Service,NodeB_Service: Both cluster nodes are now synchronized
```

