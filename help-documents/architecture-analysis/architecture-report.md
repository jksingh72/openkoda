# Openkoda — Technical Architecture Analysis Report

**Repository**: `openkoda`  
**Aggregator Version**: `1.7.1`  
**Primary Framework**: Spring Boot 3.0.5 / Java 17+  
**Target Environment**: Linux / Docker (Eclipse Temurin 17 JDK) / PostgreSQL 14+ / Hazelcast  
**Date of Analysis**: November 2026  
**Status**: Confirmed from repository evidence  

---

## 1. Executive Summary

**Openkoda** is an open-source, multi-tenant, metadata-driven low-code enterprise platform and SaaS rapid application development framework built on **Java 17**, **Spring Boot 3.0.5**, **Hibernate 6 / JPA**, **PostgreSQL**, **Thymeleaf**, and **GraalVM Polyglot JavaScript**.

Rather than being a conventional static web application, Openkoda functions as an **extensible low-code application runtime engine**. It couples declarative schema management (storing table layouts, forms, server scripts, cron jobs, and UI pages directly inside the database) with dynamic runtime bytecode generation using **ByteBuddy**. During application boot and dynamic restart cycles, Openkoda synthesizes JPA entity classes and Spring Data repository interfaces in memory and registers them with the active Hibernate and Spring ApplicationContext.

The architectural style is a **Modular Monolith** organized into functional packages, utilizing a **Monadic Flow Pipeline** (`com.openkoda.core.flow.Flow`) for application use-case orchestration, an embedded **GraalVM Polyglot JS execution sandbox** (`JsFlowRunner`) for dynamic server scripts, a **Thymeleaf template resolver** reading templates directly from database entities (`FrontendResource`), and a distributed state synchronization mechanism using **Hazelcast** cluster topics.

The analysis confirms strong functional separation for core platform concepts, accompanied by distinct coupling anomalies—notably a universal **"ComponentProvider" mega-aggregator** pattern requiring Spring circular bean references (`spring.main.allow-circular-references=true`), transaction management placed directly on web controllers, and security authorization checks embedded directly inside data persistence repository specifications.

---

## 2. Scope, Exclusions, and Analysis Method

### 2.1 Scope of Inspection
- **Project Structure & Root Artifacts**: Root aggregator `pom.xml`, `openkoda-app/pom.xml`, `openkoda/pom.xml`, Maven configurations, Docker infrastructure (`docker/Dockerfile`, `docker-compose.yaml`, `docker-compose-no-db.yaml`, `entrypoint.sh`), build scripts (`scripts/*.sh`), and examples (`examples/insurance`, `examples/timelog`).
- **Core Application Source Code**: `openkoda/src/main/java/` comprising **623 handwritten Java source files** across packages `com.openkoda.controller`, `com.openkoda.core`, `com.openkoda.dto`, `com.openkoda.form`, `com.openkoda.integration`, `com.openkoda.model`, `com.openkoda.repository`, `com.openkoda.service`, `com.openkoda.uicomponent`, and `reactor.util.function`.
- **Resources & Database Migrations**: `openkoda/src/main/resources/` comprising **89 Thymeleaf templates**, resource configurations (`application.properties`, `application-openkoda.properties`), DDL and migration SQL scripts (`db/init.sql`, `migration/core_upgrade.sql`, `migration/upgrade.sql`).
- **Test Infrastructure**: `openkoda/src/test/java/` (38 test classes) including unit/integration tests and Cucumber BDD feature specifications (`openkoda/src/test/resources/features/`).

### 2.2 Exclusions & Boundaries
- **User-Created `web/` Folder**: Per explicit user instruction, the recently created `web/` directory was completely excluded from analysis as it is non-original.
- **Build Targets and Binaries**: `openkoda/target/`, `openkoda/build/`, `.class` files, compiled JARs, and Maven/git metadata (`.git`, `.kiro`, `.vscode`) were excluded from architectural deductions.
- **Vendored Client Assets**: Third-party JavaScript/CSS libraries under `openkoda/src/main/resources/public/vendor/` (Bootstrap, Vue 2, FontAwesome, JQuery, Datatables) were acknowledged as UI runtime dependencies but excluded from code-level architectural classification.
- **Dynamic Bytecode Artifacts**: Generated dynamic entity classes under package `com.openkoda.dynamicentity.generated.*` are generated at runtime via ByteBuddy and do not exist as static `.java` files on disk.

### 2.3 Analysis Methodology
The analysis was performed through static source-code inspection, AST verification, symbol tracking, dependency relationship graphing, configuration parameter auditing, and git history inspection. Findings are categorized as:
- **Confirmed**: Supported by direct, unambiguous code or configuration evidence.
- **Inferred**: Strongly supported by naming, architectural patterns, and indirect references, but lacking exhaustive formal specification.
- **Unknown**: Undetermined due to runtime variability or lack of repository evidence.

---

## 3. Languages, Frameworks, and Application Types

| Category | Technology / Specification | Evidence / File Path |
| :--- | :--- | :--- |
| **Language** | Java 17 (`<maven.compiler.source>17</maven.compiler.source>`) | [`openkoda-app/pom.xml#L27-L28`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L27-L28) |
| **Primary Framework** | Spring Boot 3.0.5 | [`pom.xml#L15`](file:///home/jksingh/openkoda/pom.xml#L15) |
| **Persistence / ORM** | Jakarta Persistence 3.1, Hibernate 6.0, Hypersistence Utils 3.2.0 | [`openkoda-app/pom.xml#L110-L160`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L110-L160) |
| **Database** | PostgreSQL 14+ (JDBC driver `42.7.2`), H2 (test scope) | [`openkoda-app/pom.xml#L222-L226`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L222-L226) |
| **Bytecode Manipulation** | ByteBuddy 1.14+ (`net.bytebuddy:byte-buddy`) | [`openkoda-app/pom.xml#L444-L452`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L444-L452) |
| **Polyglot Scripting** | GraalVM SDK & JS ScriptEngine 22.3.1 (`org.graalvm.js:js`) | [`openkoda-app/pom.xml#L195-L210`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L195-L210) |
| **Presentation Engine** | Thymeleaf 3.1 (`spring-boot-starter-thymeleaf`, `thymeleaf-layout-dialect`) | [`openkoda-app/pom.xml#L134-L186`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L134-L186) |
| **Security Framework** | Spring Security 6.0 (`spring-boot-starter-security`, OAuth2 Client, LDAP) | [`openkoda-app/pom.xml#L172-L278`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L172-L278) |
| **Clustering & Session** | Hazelcast 5.x (`spring-session-hazelcast:3.0.0`) | [`openkoda-app/pom.xml#L258-L261`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L258-L261) |
| **Reactive Tuple Utilities** | Project Reactor Core 3.0.2 (`reactor-core`) | [`openkoda-app/pom.xml#L217-L220`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L217-L220) |
| **AI Integration** | TheoKanning OpenAI GPT3 Java SDK 0.11.1 (`openai-gpt3-java:service`) | [`openkoda-app/pom.xml#L563-L566`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L563-L566) |
| **Testing** | JUnit Jupiter 5.9.2, Mockito 5.2.0, Cucumber 7.8.1, Selenium 4.13.0, Selenide 6.12.4 | [`openkoda-app/pom.xml#L409-L544`](file:///home/jksingh/openkoda/openkoda-app/pom.xml#L409-L544) |

### Application Type
Openkoda is a **hybrid multi-tenant server application**:
1. **Server-Rendered Multi-Tenant Web Portal**: Powered by Spring MVC and dynamic database-backed Thymeleaf templates for end-user and administrator dashboards.
2. **Headless JSON REST API (v1 / v2)**: Providing programmatic access to entities, authentication, and platform features.
3. **Low-Code Application Host**: An in-memory application runtime that loads entity schemas, forms, rules, and scripts from database tables or imported ZIP packages and serves them dynamically without redeploying binaries.

---

## 4. Repository and Deployment-Unit Map

```
/home/jksingh/openkoda/
├── pom.xml                               # Aggregator root POM (defines modules: openkoda-app, openkoda)
├── openkoda-app/                         # Parent BOM / build definition POM (contains 774 lines of deps & plugins)
│   └── pom.xml
├── openkoda/                             # Main application codebase (623 Java classes, 89 templates)
│   ├── pom.xml                           # Module POM producing openkoda.jar / WAR
│   └── src/
│       ├── main/java/com/openkoda/       # Platform core and business logic
│       ├── main/resources/               # Templates, DDL/SQL migrations, application configs
│       └── test/                         # Unit tests, JUnit suite, Cucumber BDD tests
├── docker/                               # Containerization manifests
│   ├── Dockerfile                        # Multi-stage container definition using eclipse-temurin:17-jdk
│   ├── docker-compose.yaml               # Application + PostgreSQL container setup
│   ├── docker-compose-no-db.yaml         # Application-only container pointing to external DB
│   └── entrypoint.sh                     # Container initialization and property injection script
├── scripts/                              # Local developer scripts (ok-run.sh, ok-build.sh, ok-db-init.sh)
├── examples/                             # Sample business applications packaged as Openkoda components
│   ├── insurance/                        # Complete Insurance sample app (insurance.zip, pom.xml)
│   └── timelog/                          # Time tracking sample component
├── doc/ (symlinked from docs/)           # Architectural and reference documentation
└── help-documents/                       # Operational guides and technical references
```

### Deployment Units
- **Primary Executable Artifact**: A single executable Fat JAR / WAR generated by `spring-boot-maven-plugin` (`openkoda/build/openkoda.jar`).
- **Container Image**: `openkoda/openkoda:${VERSION}` packaged using `docker/Dockerfile` on top of `eclipse-temurin:17-jdk`, running as unprivileged user `openkoda-cloud` (UID 20000).
- **Component Packages (Extensions)**: Portable `.zip` archives containing YAML definitions and static assets exported via `ComponentsController` and imported into running instances.
- **Database Dependency**: PostgreSQL 14+ database instance (single public schema or tenant-specific schemas).

---

## 5. Observed Architectural Style and Supporting Evidence

The codebase exhibits a **Metadata-Driven Modular Monolith with Polyglot Scripting & Monadic Flow Orchestration**.

### 5.1 Architecture Patterns Observed
1. **Metadata-Driven Runtime Synthesis**:
   - Rather than requiring Java source files for every business entity, entity models are defined as database rows in `dynamic_entity` and `form`.
   - Evidence: [`DynamicEntityRegistrationService.java#L104-L142`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java#L104-L142) dynamically generates Java bytecode using ByteBuddy, loads classes into the JVM `ClassLoader`, and registers dynamic Spring Data JPA repositories with `JpaRepositoryFactory`.
2. **Monadic Flow Execution Pipeline**:
   - Application use cases avoid verbose procedural service calls in favor of a functional, chainable monad: `Flow.init(...).then(...).thenSet(...).execute()`.
   - Evidence: [`Flow.java#L35-L395`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/Flow.java#L35-L395) manages sequential execution steps, passes context in a `PageModelMap`, and wraps execution inside transactional boundaries via `TransactionalExecutor`.
3. **Polyglot Embedded Scripting**:
   - Server-side business logic can be written in JavaScript and executed at runtime inside a GraalVM polyglot context.
   - Evidence: [`JsFlowRunner.java#L51-L100`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java#L51-L100) binds the `flow` pipeline directly into the JavaScript runtime scope, enabling scripts stored in `server_js` to orchestrate backend workflows.
4. **Database-Backed Presentation Layer**:
   - Thymeleaf templates are resolved not just from disk/classpath, but dynamically from database records.
   - Evidence: [`FrontendResourceOrClassLoaderTemplateResolver.java#L57-L80`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/FrontendResourceOrClassLoaderTemplateResolver.java#L57-L80) intercepts template resolution requests starting with `frontend-resource#` and queries the `frontend_resource` table.
5. **Multi-Tenancy with Hybrid Isolation**:
   - Supports row-level discrimination (via `organization_id` foreign keys on entities extending `OrganizationRelatedEntity`) and optional schema-per-tenant isolation (`org_<organizationId>`).
   - Evidence: [`TenantResolver.java#L42-L100`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/TenantResolver.java#L42-L100) and [`MultitenancyService.java`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/MultitenancyService.java).
6. **Distributed State Synchronization**:
   - Cache invalidation and dynamic component updates (schedulers, event listeners, dynamic forms) are propagated across cluster instances using Hazelcast topics.
   - Evidence: [`ClusterEventSenderService.java#L36-L100`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventSenderService.java#L36-L100).

---

## 6. Layer / Responsibility Inventory

| Responsibility | Purpose | Modules / Files | Representative Symbols | Dependencies | Evidence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Presentation / UI** | Server-side HTML rendering, view templates, fragments, and dynamic layouts | `openkoda/src/main/resources/templates/`, `components/` | `generic-all.html`, `generic-forms.html`, `main.html`, `tables.html` | Thymeleaf, HTML5, Bootstrap, Vue.js | Confirmed |
| **Presentation Logic / View Models** | UI state container, attribute binding keys, and model maps | `com.openkoda.core.flow`, `com.openkoda.controller.common` | [`PageModelMap`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/PageModelMap.java), [`PageAttr`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/PageAttr.java), [`PageAttributes`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/common/PageAttributes.java) | Project Reactor Tuples | Confirmed |
| **Inbound Interfaces (HTTP/REST/WS)** | HTTP endpoints, REST API controllers, WebSocket handlers, and error advice | `com.openkoda.controller.*`, `com.openkoda.core.controller` | [`CRUDControllerHtml`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java), [`CRUDApiController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/api/CRUDApiController.java), [`GeneralControllerAdvice`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/GeneralControllerAdvice.java) | Spring Web MVC, Springdoc OpenAPI | Confirmed |
| **Contracts / Boundary Models** | Form definitions, DTOs, and serialization schemas | `com.openkoda.form.*`, `com.openkoda.dto.*`, `com.openkoda.core.form` | [`AbstractEntityForm`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/form/AbstractEntityForm.java), [`FrontendMappingDefinition`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/form/FrontendMappingDefinition.java), `NotificationDto` | Hibernate Validator, Jackson | Confirmed |
| **Application / Orchestration** | Pipeline orchestration, functional flow composition, and transaction dispatch | `com.openkoda.core.flow`, `com.openkoda.core.controller.generic` | [`Flow`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/Flow.java), [`ResultAndModel`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/ResultAndModel.java), [`TransactionalExecutor`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/TransactionalExecutor.java) | `Services`, `TransactionalExecutor` | Confirmed |
| **Domain / Business Core** | Persistent entities, tenant boundaries, privileges, and SpEL business rules | `com.openkoda.model.*`, `com.openkoda.core.helper` | [`Organization`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/Organization.java), [`User`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/User.java), [`Privilege`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/Privilege.java), [`RuleSpelHelper`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/helper/RuleSpelHelper.java) | Jakarta Persistence, Spring Expression Language | Confirmed |
| **Persistence / Data Access** | JPA repositories, criteria specifications, JDBC pre-flight, and versioning | `com.openkoda.repository.*`, `com.openkoda.core.repository` | [`SecureRepository`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository/SecureRepository.java), [`SearchableFunctionalRepositoryWithLongId`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/repository/common/SearchableFunctionalRepositoryWithLongId.java), [`DbVersionService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/upgrade/DbVersionService.java) | Spring Data JPA, Hibernate, HikariCP | Confirmed |
| **Outbound Integrations** | External SaaS API adapters and third-party webhook handlers | `com.openkoda.integration.*`, `com.openkoda.service.openai` | [`GitHubIntegrationConsumers`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/GitHubIntegrationConsumers.java), `JiraIntegrationConsumers`, `ChatGPTService` | Spring `RestTemplate`, OpenAI SDK, HTTPClient | Confirmed |
| **Messaging / Event Transport** | In-memory asynchronous event bus and Hazelcast cluster synchronization | `com.openkoda.core.service.event`, `com.openkoda.core.job` | [`ApplicationEventService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ApplicationEventService.java), [`ClusterEventSenderService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventSenderService.java), `JobsScheduler` | Hazelcast, `java.util.concurrent` | Confirmed |
| **Bootstrap / Composition** | Pre-boot JDBC migration, bytecode compilation, and Spring context initialization | `com.openkoda`, `com.openkoda.core.configuration` | [`OpenkodaApp`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/OpenkodaApp.java), [`JDBCApp`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/JDBCApp.java), [`App`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java), [`WebSecurityConfig`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/WebSecurityConfig.java) | Spring Boot, ByteBuddy, Raw JDBC | Confirmed |
| **Polyglot Scripting Engine** | Execution of server-side JavaScript with access to Flow and Java services | `com.openkoda.uicomponent.*` | [`JsFlowRunner`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java), [`LiveComponentProvider`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveComponentProvider.java) | GraalVM Polyglot Engine | Confirmed |
| **Low-Code Synthesis Engine** | In-memory compilation and dynamic loading of JPA entities and repositories | `com.openkoda.service.dynamicentity` | [`DynamicEntityRegistrationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java), `DynamicEntityDescriptorFactory` | ByteBuddy, ASM, JVM ClassLoader | Confirmed |

---

## 7. Business Capability Map

```
+-------------------------------------------------------------------------------------------------------+
|                                           OPENKODA PLATFORM                                           |
+-------------------------------------------------------------------------------------------------------+
|  1. Multi-Tenancy & Org    2. Dynamic Data Engine      3. Polyglot Scripting   4. CMS & Page Builder  |
|  - Organization boundaries - Form/schema definitions   - ServerJS execution    - FrontendResource DB  |
|  - Role assignments        - ByteBuddy class synthesis - Live services         - Dynamic Thymeleaf    |
|  - Schema/row isolation    - Dynamic JPA repos         - GraalVM VM sandbox    - UI component blocks  |
+-------------------------------------------------------------------------------------------------------+
|  5. Identity & Security    6. Event Bus & Schedulers   7. Integrations         8. File & Media Store  |
|  - User auth & OAuth2      - ApplicationEventService   - GitHub, Jira, Trello  - File entity & upload |
|  - Dynamic privileges      - Cluster synchronization   - Slack, Teams webhooks - Database BLOB / S3   |
|  - Multi-chain filters     - Cron scheduler jobs       - RestTemplate adapters - PDF report rendering |
+-------------------------------------------------------------------------------------------------------+
|  9. Audit & System Health  10. AI / OpenAI Assistant   11. Component Packaging & CLI                  |
|  - Hibernate interceptor   - ChatGPT prompt service    - YAML/ZIP exporter/importer                   |
|  - System health alerts    - Natural language query    - Modular distribution                         |
|  - Log viewer & metrics    - Report generation         - Pre-flight JDBC migrations                   |
+-------------------------------------------------------------------------------------------------------+
```

### Capability 1: Multi-Tenancy & Organization Management
- **Purpose**: Enforces strict enterprise organizational boundaries, tenant onboarding, and user-to-organization membership.
- **Owning Packages**: `com.openkoda.core.multitenancy`, `com.openkoda.controller.organization`, `com.openkoda.service.organization`.
- **Key Symbols**: [`MultitenancyService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/MultitenancyService.java), [`TenantResolver`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/TenantResolver.java), [`Organization`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/Organization.java), [`OrganizationControllerHtml`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/organization/OrganizationControllerHtml.java).
- **Data Boundary**: Governs all entities implementing `OrganizationRelatedEntity` via `organization_id` column.

### Capability 2: Dynamic Data Model & Low-Code Engine
- **Purpose**: Enables administrators to define new database tables, field types, and relational mappings via UI or YAML without restarting the deployment binary.
- **Owning Packages**: `com.openkoda.service.dynamicentity`, `com.openkoda.model.component`, `com.openkoda.controller`.
- **Key Symbols**: [`DynamicEntityRegistrationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java), [`DynamicEntityDescriptor`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityDescriptor.java), [`Form`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/Form.java), [`CRUDControllerHtml`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java).
- **External Dependencies**: ByteBuddy, ASM, Hibernate Schema Validator.

### Capability 3: Polyglot Scripting & ServerJS Flow Execution
- **Purpose**: Executes custom server-side JavaScript logic at runtime with full access to repositories, services, and monadic flow pipelines.
- **Owning Packages**: `com.openkoda.uicomponent`, `com.openkoda.uicomponent.live`.
- **Key Symbols**: [`JsFlowRunner`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java), [`LiveComponentProvider`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveComponentProvider.java), [`ServerJs`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/ServerJs.java).
- **External Dependencies**: GraalVM Polyglot JS engine.

### Capability 4: CMS, UI Components & Page Builder
- **Purpose**: Dynamic content management, database-stored Thymeleaf templates, custom layouts, menus, and dashboard widgets.
- **Owning Packages**: `com.openkoda.controller.frontendresource`, `com.openkoda.core.configuration`, `com.openkoda.core.service`.
- **Key Symbols**: [`FrontendResourceOrClassLoaderTemplateResolver`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/FrontendResourceOrClassLoaderTemplateResolver.java), [`FrontendResource`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/FrontendResource.java), [`PageBuilderController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/PageBuilderController.java).

### Capability 5: Identity, Authentication & Role-Based Access Control (RBAC)
- **Purpose**: User registration, credential authentication, API token authentication, LDAP / SSO integration, and hierarchical privilege checks.
- **Owning Packages**: `com.openkoda.core.security`, `com.openkoda.controller.user`, `com.openkoda.service.user`, `com.openkoda.service.role`.
- **Key Symbols**: [`WebSecurityConfig`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/WebSecurityConfig.java), [`OrganizationUserDetailsService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/OrganizationUserDetailsService.java), [`HasSecurityRules`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/HasSecurityRules.java), [`User`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/User.java), [`Privilege`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/Privilege.java).

### Capability 6: Event Bus, Scheduling & Notification Engine
- **Purpose**: Asynchronous task execution, scheduled cron jobs, notification generation, and multi-node cluster synchronization.
- **Owning Packages**: `com.openkoda.core.service.event`, `com.openkoda.core.job`, `com.openkoda.service.notification`.
- **Key Symbols**: [`ApplicationEventService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ApplicationEventService.java), [`ClusterEventSenderService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventSenderService.java), [`SchedulerService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/SchedulerService.java), [`NotificationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/notification/NotificationService.java).

### Capability 7: External Systems & Issue Tracking Integrations
- **Purpose**: Bi-directional event integration with third-party project management and communication tools.
- **Owning Packages**: `com.openkoda.integration.*`.
- **Key Symbols**: [`GitHubIntegrationConsumers`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/GitHubIntegrationConsumers.java), `JiraIntegrationConsumers`, `TrelloIntegrationConsumers`, `BasecampIntegrationConsumers`.

### Capability 8: File & Media Asset Storage
- **Purpose**: Uploading, storing, verifying, and serving user files and assets across local database BLOBs, filesystems, or AWS S3.
- **Owning Packages**: `com.openkoda.controller.file`, `com.openkoda.service`, `com.openkoda.model.file`.
- **Key Symbols**: `FileController`, `FileService`, [`File`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/file/File.java), `FileRepository`.

### Capability 9: Audit Logging, Observability & System Diagnostics
- **Purpose**: Transactional tracking of entity property changes, error log viewing, database health monitoring, and system metrics.
- **Owning Packages**: `com.openkoda.core.audit`, `com.openkoda.controller.admin`, `com.openkoda.core.service.system`.
- **Key Symbols**: [`PropertyChangeInterceptor`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/audit/PropertyChangeInterceptor.java), `AuditController`, `SystemHealthController`, `SystemHealthStatusService`.

### Capability 10: AI Assistance & Query Reporting
- **Purpose**: Natural-language database querying and report synthesis powered by OpenAI models.
- **Owning Packages**: `com.openkoda.service.openai`, `com.openkoda.controller.report`, `com.openkoda.repository.ai`.
- **Key Symbols**: `ChatGPTService`, `QueryReportController`, `SecureQueryReportRepository`.

### Capability 11: Component Packaging, Import & Export
- **Purpose**: Serializes platform configurations (forms, UI components, JS scripts, schedulers, event listeners) into YAML and ZIP archives for migration and version control.
- **Owning Packages**: `com.openkoda.controller.ComponentsController`, `com.openkoda.service.export`.
- **Key Symbols**: [`ComponentsController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/ComponentsController.java), `ComponentExportService`, `ZipComponentImportService`.

---

## 8. Cross-Cutting Concerns

| Concern | Implementation Mechanism | Key Classes / Config Keys | Evidence / File Path |
| :--- | :--- | :--- | :--- |
| **Authentication** | Spring Security multi-filter chain: Session/Form login, API Token Header, Path-Prefix Token, RememberMe, OAuth2 | `WebSecurityConfig`, `ApiTokenHeaderAuthenticationFilter`, `TokenPathPrefixAuthenticationFilter` | [`WebSecurityConfig.java#L158-L200`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/WebSecurityConfig.java#L158-L200) |
| **Authorization** | Method-level `@PreAuthorize`, SpEL expression evaluation, and Repository-level scope filtering | `HasSecurityRules`, `UserProvider`, `SearchableFunctionalRepositoryWithLongId` | [`SearchableFunctionalRepositoryWithLongId.java#L68-L88`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/repository/common/SearchableFunctionalRepositoryWithLongId.java#L68-L88) |
| **Input & Business Validation** | Technical validation via Jakarta Validation (`@Valid`, `BindingResult`); business validation via `FormService` & SpEL rules | `ValidationService`, `RuleSpelHelper`, `AbstractEntityForm` | [`CRUDControllerHtml.java#L231`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java#L231) |
| **Logging & Auditing** | Entity-level auditing via session-scoped Hibernate Interceptor; request tracing with ID injection | `PropertyChangeInterceptor`, `LoggingComponentWithRequestId`, `Audit` | [`PropertyChangeInterceptor.java#L48-L58`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/audit/PropertyChangeInterceptor.java#L48-L58) |
| **Error Handling** | Controller advice translating exceptions into model attributes; monadic error interception | `GeneralControllerAdvice`, `ErrorControllerImpl`, `Flow.executeFlow` | [`Flow.java#L312-L334`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/Flow.java#L312-L334) |
| **Caching** | Spring Cache abstraction (`@EnableCaching`), Thymeleaf template cache toggle | `application-openkoda.properties` (`spring.thymeleaf.cache=false`), `App.java#L65` | [`App.java#L65`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java#L65) |
| **Concurrency** | Fixed thread pool (`Executors.newFixedThreadPool(4)`) for async events; `ThreadLocal` for tenant resolution | `ApplicationEventService`, `TenantResolver` | [`ApplicationEventService.java#L49`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ApplicationEventService.java#L49) |
| **Transaction Management** | Spring `@EnableTransactionManagement` + `@Transactional` annotations on controller methods and programmatic `TransactionalExecutor` | `TransactionalExecutor`, `CRUDControllerHtml.save` | [`CRUDControllerHtml.java#L215`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java#L215) |
| **Configuration** | Layered Spring properties loaded via active profiles (`application-<profile>.properties`), environment variables, and pre-flight JDBC inspection | `SpringProfilesHelper`, `JDBCApp.getProperty` | [`JDBCApp.java#L128-L142`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/JDBCApp.java#L128-L142) |
| **Secrets Handling** | In-memory token hashing via `ApplicationAwarePasswordEncoder`; externalized DB credentials via environment overrides | `ApplicationAwarePasswordEncoder`, `WebSecurityConfig` | [`WebSecurityConfig.java#L120-L148`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/WebSecurityConfig.java#L120-L148) |

---

## 9. Representative Execution Flows

### 9.1 Flow 1: Read Request (Generic Tenanted HTML List View)
- **Trigger**: HTTP GET `/html/organization/{organizationId}/{obj}/all`
- **Entry Point**: [`CRUDControllerHtml.getAll(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java#L88-L153)
- **Input Translation**:
  - Request parameters parsed into `Pageable` (`createPageable`), search query (`createSearch`), and filters (`createFilters`).
  - Controller retrieves `CRUDControllerConfiguration` from `HtmlCRUDControllerConfigurationMap.getIgnoreCase(objKey)`.
- **Authorization Check**:
  - Checks if `UserProvider.getFromContext()` has `conf.getGetAllPrivilege()` globally or within `organizationId`. If unauthorized and no orgs match, returns HTTP 401.
- **Application Orchestration (Flow)**:
  - Chains calls using monadic `Flow.init(componentProvider)`:
    1. Sets `searchTerm` and `objFilters`.
    2. Calls `conf.getSecureRepository().search(...)` passing `organizationId`, search specifications, and pageable.
    3. Transforms result records using `ReflectionBasedEntityForm.calculateFieldsValuesWithReadPrivileges(...)` to filter out columns for which the active user lacks read privileges.
    4. Populates headers (`genericTableViewHeaders`) and filters (`genericTableFilters`).
- **Persistence Interaction**:
  - `SearchableFunctionalRepositoryWithLongId.search(...)` generates JPA Criteria query with `LIKE` clauses on `indexString` and joins tenant predicate (`organizationId`).
- **Output / Side Effect**:
  - Returns `ModelAndView` (`.mav(...)`) selecting `tableViewWebEndpoint` or default template `generic-all.html`.

### 9.2 Flow 2: State-Changing Request (Generic Tenanted Entity Save)
- **Trigger**: HTTP POST `/html/organization/{organizationId}/{obj}/{id}/settings`
- **Entry Point**: [`CRUDControllerHtml.save(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java#L249-L271)
- **Transaction**: Method annotated with Spring `@Transactional`.
- **Authorization Check**:
  - Evaluates `notValidAccess(conf.getPostSavePrivilege(), conf.getOrganizationId(), organizationId)`.
- **Input Validation**:
  - Spring MVC validates `@Valid AbstractOrganizationRelatedEntityForm form, BindingResult br`.
- **Application Orchestration**:
  - Chains execution via `Flow`:
    1. Fetches existing entity: `conf.getSecureRepository().findOne(objectId)`.
    2. Validates business constraints and populates entity: `services.validation.validateAndPopulateToEntity(form, br, entity)`.
    3. Saves entity: `conf.getSecureRepository().saveOne(entity)`.
    4. Regenerates form object: `conf.createNewForm(organizationId, entity)`.
- **Persistence & Interception**:
  - Spring Data JPA executes `saveOne(...)`.
  - `PropertyChangeInterceptor.onFlushDirty(...)` intercepts modified entity properties and queues audit entries in `auditMap`.
- **Output / Side Effect**:
  - If validation succeeded, renders `formSuccessFragment`; if errors occurred, renders `formErrorFragment` with HTTP 400.

### 9.3 Flow 3: Asynchronous Event & Cluster Synchronization
- **Trigger**: Dynamic component update (e.g. administrator creates or updates an event listener or scheduler).
- **Entry Point**: [`ClusterEventSenderService.loadEventListener(eventListenerId)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventSenderService.java#L66-L73)
- **Condition Check**: Evaluates `ClusterHelper.isCluster()`.
- **Transport**:
  - Obtains Hazelcast instance: `ClusterHelper.getHazelcastInstance()`.
  - Publishes `ClusterEvent(EVENT_LISTENER_ADD, eventListenerId)` to topic `CLUSTER_EVENT_TOPIC`.
- **Consumption on Remote Nodes**:
  - Remote nodes listen on topic via `ClusterEventListenerService.onMessage(...)`.
  - Unpacks event payload and triggers local `EventListenerService.loadEventListener(id)`, syncing memory cache without requiring node restarts.

### 9.4 Flow 4: Outbound External Integration (GitHub Issue Creation)
- **Trigger**: Internal notification emitted with propagation flag (`NotificationDto.getPropagate() == true`).
- **Entry Point**: [`GitHubIntegrationConsumers.createGitHubIssueFromOrgNotification(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/GitHubIntegrationConsumers.java#L51-L82)
- **Validation**: Checks `services.notification.isOrganization(notification)` and reads `IntegrationModuleOrganizationConfiguration`.
- **Payload Construction**:
  - Extracts title and body from notification message keys using `messages.get(notification.getMessageKey())`.
  - Formats JSON payload with issue title and body.
- **Outbound HTTP Call**:
  - Executes `restTemplate.exchange(...)` with HTTP POST and Bearer authorization header to GitHub REST API endpoint (`api.github.com/repos/{owner}/{repo}/issues`).
- **Error Handling**: Catches HTTP client exceptions and logs warnings through `IntegrationComponentProvider`.

### 9.5 Flow 5: Critical Application-Specific Workflow: Dynamic Entity Generation & Bootstrapping
- **Trigger**: Application startup command (`OpenkodaApp.main(args)`).
- **Execution Steps**:
  1. **Safety Check**: [`App.initializationSafetyCheck(isForce)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java#L99-L120) prevents accidental database drop unless `--force` or explicit prompt confirmation is provided.
  2. **Pre-Flight JDBC Migrations**: [`JDBCApp.main(args)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/JDBCApp.java#L30-L108) connects directly via raw JDBC (bypassing Hibernate), runs incremental SQL scripts via `DbVersionService.tryUpgrade(con)`.
  3. **Metadata Inspection**: `JDBCApp` queries `select * from form as f inner join dynamic_entity as de on de.table_name=f.table_name`.
  4. **Bytecode Synthesis (ByteBuddy)**: [`DynamicEntityRegistrationService.buildAndLoadDynamicClasses(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java#L104-L142) compiles Java bytecode in memory for entity classes under `com.openkoda.dynamicentity.generated.*` and injects them into the JVM ClassLoader.
  5. **Dynamic Repository Generation**: ByteBuddy generates repository interfaces extending `SecureRepository<T>`.
  6. **Spring Boot Bootstrap**: [`App.startApp(appClass, args, true)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java#L87-L97) starts Spring Boot context.
  7. **JPA Integration**: [`App.persistenceUnitPostProcessor()`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java#L165-L171) registers dynamic entity class names with Hibernate `EntityManagerFactoryBuilder`.
  8. **Dynamic Repository Factory**: [`DynamicEntityRegistrationService.registerDynamicRepositories(...)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java#L68-L78) instantiates dynamic repositories using `JpaRepositoryFactory` and registers them with `SearchableRepositories`.

---

## 10. Dependency and Boundary Findings

| Finding | Evidence | Architectural Context | Impact | Priority | Confidence | Suggested Next Step |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F1: "ComponentProvider" Universal Dependency Hub (God Object)** | [`ComponentProvider.java#L44-L60`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/ComponentProvider.java#L44-L60), [`Services.java#L22-L60`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/Services.java#L22-L60), `application-openkoda.properties#L22` | Controllers, services, and repositories inherit or inject `ComponentProvider`, which injects all services and repositories. Required enabling `spring.main.allow-circular-references=true`. | High architectural coupling, breaks dependency inversion, complicates modular testing and component isolation. | High | Confirmed | Replace universal mega-aggregator with targeted constructor injection in controllers and services; disable circular references. |
| **F2: Transaction Demarcation on Web Controllers** | [`CRUDControllerHtml.java#L215, L250`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java#L215) | `@Transactional` is placed directly on Spring MVC controller methods (`saveNew`, `save`) rather than in an application service layer. | Ties HTTP transport lifecycle to database transaction duration, increasing connection pool hold times and leaking persistence concerns to the web layer. | Medium | Confirmed | Encapsulate transactional write pipelines inside dedicated application services or `TransactionalExecutor`. |
| **F3: Security Authorization Logic Embedded in Persistence Repositories** | [`SearchableFunctionalRepositoryWithLongId.java#L68-L88`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/repository/common/SearchableFunctionalRepositoryWithLongId.java#L68-L88) | Repositories invoke `UserProvider.getFromContext()` and evaluate user privileges (`hasWritePrivilegeForEntity`) inside repository query methods. | Inverts architectural layering: persistence layer directly couples to security session context, hindering headless/batch usage without an active security context. | Medium | Confirmed | Extract authorization checks to the application orchestration layer (Flow / Service) before invoking pure repository queries. |
| **F4: Unrestricted Host Access in Polyglot JavaScript Execution** | [`JsFlowRunner.java#L53-L57, L76-L79`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java#L53-L57) | GraalVM context configured with `.allowHostAccess(HostAccess.ALL).allowAllAccess(true).allowHostClassLoading(true)`. | Security risk if non-superadmin users obtain permissions to author or edit ServerJS code, allowing arbitrary JVM class reflection. | High | Confirmed | Restrict GraalVM `HostAccess` to an explicit whitelist of safe services (`LiveComponentProvider`) and disable arbitrary class lookup. |
| **F5: Custom SQL Migration Engine Bypassing Standard Tooling** | [`DbVersionService.java#L34-L70`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/upgrade/DbVersionService.java#L34-L70) | Custom regex parser reads `-- @version:` comments in `core_upgrade.sql` and tracks state in `db_version`. | Lacks advanced migration features (checksum validation, rollback scripts, distributed locks) provided by industry tools (Liquibase / Flyway). | Low | Confirmed | Evaluate standardizing on Flyway or Liquibase for enterprise database schema evolution. |
| **F6: Pre-Flight JDBC App Coupling** | [`OpenkodaApp.java#L30`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/OpenkodaApp.java#L30), [`JDBCApp.java#L30-L108`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/JDBCApp.java#L30-L108) | Raw JDBC connection opened before Spring context boots to inspect dynamic entity tables and run migrations. | Bypasses Spring datasource management, connection pooling, and configuration lifecycle, leading to duplicate property resolution logic. | Medium | Confirmed | Migrate pre-flight discovery to a formal Spring `BeanFactoryPostProcessor` or `ApplicationContextInitializer`. |

---

## 11. Prioritized Recommendations

### Corrective Architectural Work (Technical Debt & Safety)
1. **Confine GraalVM JavaScript Sandboxing**:
   - **Rationale**: Currently, `JsFlowRunner` allows full host access (`HostAccess.ALL`) and arbitrary class loading. Any user with rights to save a `ServerJs` record can execute arbitrary JVM calls.
   - **Action**: Implement a restricted `HostAccess` policy exposing only safe helper methods and explicitly whitelisted service beans.
2. **Remove Circular Bean Dependencies**:
   - **Rationale**: `application-openkoda.properties` explicitly enables `spring.main.allow-circular-references=true` because `ComponentProvider` creates cyclical links between services, controllers, and repositories.
   - **Action**: Deprecate `ComponentProvider` as a universal base class; migrate controllers to explicit constructor injection of only required services.
3. **Move `@Transactional` from Controllers to Application Tier**:
   - **Rationale**: `CRUDControllerHtml` uses `@Transactional` on controller methods, extending open database transaction windows through presentation rendering.
   - **Action**: Relocate transactional boundaries into dedicated application service handlers or use `TransactionalExecutor` within Flow pipelines.

### Optional Architectural Improvements (Scalability & Maintainability)
1. **Decouple Repository Interfaces from Security Context**:
   - **Rationale**: `SearchableFunctionalRepositoryWithLongId` accesses `UserProvider.getFromContext()`, making background jobs or asynchronous workers spoof security contexts (`RunAsService`).
   - **Action**: Pass caller security scope or tenant identity explicitly as query parameters rather than reading thread-local contexts inside data access interfaces.
2. **Transition from Custom `DbVersionService` to Standard Flyway / Liquibase**:
   - **Rationale**: Flyway is already supported in modern Spring Boot 3; using custom comment-based regex parsing increases fragility as DDL evolves.
   - **Action**: Wrap `core_upgrade.sql` scripts into standard Flyway versioned migration files (`V1_6_0__dynamic_entity.sql`).

---

## 12. Unknowns and Questions Requiring Human Confirmation

1. **Multi-Schema vs Shared-Schema Production Usage**:
   - The codebase supports multi-schema isolation (`org_<organizationId>`), but default configuration is shared-schema with row-level filtering. *Confirmation needed*: Is multi-schema isolation actively used in production environments, or is shared-schema the sole supported production mode?
2. **GraalVM Polyglot Licensing & Engine Performance in Container Runtimes**:
   - GraalVM JS 22.3.1 runs on top of standard JDK 17 (`eclipse-temurin:17-jdk`). *Confirmation needed*: Is GraalVM JS running in interpreted mode or with native Truffle JIT compilation enabled in production container deployments?
3. **External S3 Storage Adoption**:
   - AWS SDK dependencies (`software.amazon.awssdk:s3`) are imported in `openkoda-app/pom.xml`, but the default config specifies `file.storage.type=database`. *Confirmation needed*: What proportion of production deployments utilize S3 versus database BLOB storage?

