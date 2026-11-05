# Openkoda — Code & Module Organization

This document provides a comprehensive analysis of the [`openkoda/src`](file:///home/jksingh/openkoda/openkoda/src) directory tree and all its subdirectories, detailing package responsibilities, layer interactions, and architectural patterns.

---

## 1. High-Level Directory Overview

```
openkoda/src/
├── main/
│   ├── java/
│   │   ├── com/openkoda/               # Main Java codebase (~623 classes)
│   │   │   ├── controller/             # Web MVC & REST API Controllers
│   │   │   ├── core/                   # Platform plumbing, flow engine & security
│   │   │   ├── dto/                    # Data Transfer Objects
│   │   │   ├── form/                   # Dynamic & static form rules and validation
│   │   │   ├── integration/            # Third-party integrations (GitHub, Jira, etc.)
│   │   │   ├── model/                  # Domain entities & JPA entity hierarchies
│   │   │   ├── repository/             # Spring Data JPA repositories & specifications
│   │   │   ├── service/                # Business logic, export, and dynamic entities
│   │   │   ├── uicomponent/            # Live script runners & component interop
│   │   │   └── App.java                # Spring Boot application bootstrap
│   │   └── reactor/util/               # Reactor Tuple extensions for Openkoda Flow
│   └── resources/
│       ├── components/                 # Reusable frontend resource HTML/JS components
│       ├── components-additional-files/# Extra static resources for component plugins
│       ├── db/ & migration/            # Database initialization DDL & Flyway/SQL scripts
│       ├── default-code/               # Starter code templates for runtime scripts
│       ├── fonts/                      # Font assets (OpenSans, etc.)
│       ├── public/vendor/              # Static frontend vendor libraries & Swagger UI
│       ├── templates/                  # Thymeleaf templates (page, module, XML)
│       └── *.properties                # Configuration profiles & localization bundles
└── test/
    ├── java/
    │   ├── com/openkoda/               # Unit, integration, and security test suites
    │   └── cucumber/                   # Cucumber BDD step definitions & Page Objects
    └── resources/
        ├── features/                   # Gherkin BDD scenario specifications
        ├── migration/                  # Test database schema migrations
        └── security/                   # Test certificates and keys
```

---

## 2. Java Application Source Code (`src/main/java`)

### 2.1 Application Entry Point
* **[`com.openkoda.App`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/App.java)**:
  * The main Spring Boot bootstrap class.
  * Extends `SpringBootServletInitializer`.
  * Initializes ByteBuddy-based dynamic classes via [`DynamicEntityRegistrationService.buildAndLoadDynamicClasses()`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java) before the JPA `EntityManagerFactory` is constructed.
  * Configures the Hibernate vendor adapter and sets up `PersistenceUnitPostProcessor` so dynamic runtime classes are recognized as native JPA entities.

### 2.2 [`com.openkoda.core`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core) — Platform Engine & Infrastructure
This package contains the proprietary architecture powering Openkoda:

| Subpackage | Responsibilities & Key Classes |
| :--- | :--- |
| **`flow`** | **The Monadic Flow Engine**: Replaces traditional imperative service orchestration with a fluent pipeline.<br>• [`Flow<I, O, CP>`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/Flow.java): Chains steps (`then()`, `thenSet()`, `thenWithoutResult()`).<br>• [`PageModelMap`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/PageModelMap.java): Request-scoped data carrier bound to the view or JSON model.<br>• [`ResultAndModel`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/ResultAndModel.java): Request container passing the accumulated result, services, and parameters.<br>• [`TransactionalExecutor`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/TransactionalExecutor.java): Wraps execution pipelines inside transactions. |
| **`customisation`** | **Server-Side Polyglot & Scripting**: Enables dynamic runtime extensions.<br>• [`ServerJSRunner`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/customisation/ServerJSRunner.java): Sandboxed execution of JavaScript on the server using GraalVM.<br>• [`BasicCustomisationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/customisation/BasicCustomisationService.java): Coordinates dynamic component registries. |
| **`security`** | **Authentication & Authorization Core**:<br>• [`WebSecurityConfig`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/WebSecurityConfig.java): Spring Security filter chain setup.<br>• [`OrganizationUserDetailsService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/OrganizationUserDetailsService.java): Resolves users within tenant context.<br>• [`ApiTokenHeaderAuthenticationFilter`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/ApiTokenHeaderAuthenticationFilter.java): API token parsing and header validation.<br>• [`HasSecurityRules`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/HasSecurityRules.java): Method-level SpEL security evaluations. |
| **`multitenancy`** | **Multi-Tenancy Isolation**:<br>• Supports Shared Schema (via `organization_id` discriminator), Separate Schema (`org_<id>`), and Separate Database isolation modes.<br>• [`TenantResolver`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/TenantResolver.java): ThreadLocal tenant identifier resolver for Hibernate. |
| **`form`** | **Dynamic Form Abstraction**:<br>• [`AbstractEntityForm`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/form/AbstractEntityForm.java) & [`MapEntityForm`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/form/MapEntityForm.java): Model-form binding supporting both typed Java classes and dynamic key-value attributes.<br>• [`FormFieldDefinitionBuilder`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/form/FormFieldDefinitionBuilder.java): Fluent builder for UI input definitions and validation rules. |
| **`configuration`** | **Spring Configuration Beans**:<br>• [`FrontendResourceOrClassLoaderTemplateResolver`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/FrontendResourceOrClassLoaderTemplateResolver.java): Hybrid Thymeleaf resolver resolving templates from DB before falling back to classpath.<br>• Configs for WebSockets, Swagger/OpenAPI, Session, Audit, and Mail. |
| **`job`** | Quartz / Spring Scheduled background task triggers and executors. |
| **`audit`** | Change tracking and audit logging interceptors for auditable entities. |
| **`cache`** | In-memory and distributed caching abstractions ([ModelCache](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/cache/ModelCache.java)). |
| **`lifecycle`** | Schema generation and database view initializers ([SearchViewCreator](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/lifecycle/SearchViewCreator.java)). |
| **`tracker`** | Request performance metrics, logging decorators, and execution tracing. |

---

### 2.3 [`com.openkoda.controller`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller) — Presentation Layer
Controllers handle HTTP routing, invoke the `Flow` engine, and return views or JSON payloads:

- **`admin/`**: Admin portal functionality:
  - System configuration, server health, log levels, dynamic entity editors, and module activation.
- **`api/`**: Public and authenticated REST endpoints:
  - `auth/`: Authentication endpoints (login, register, token refresh, password recovery).
  - `v1/` & `v2/`: Versioned REST APIs for users, organizations, files, and dynamic entities.
- **`organization/`**: Multi-tenant organization lifecycle:
  - Creation, settings, member invitation, role assignment, and tenant switching.
- **`frontendresource/`**: Endpoints dynamically serving runtime UI components, custom styles, and dynamic pages.
- **`file/`**: File upload, download, and streaming endpoints.
- **`notification/`**: User notifications, websocket updates, and email dispatch status.
- **`report/`**: Configurable query and dashboard reports.
- **`role/`**: RBAC role creation, permission matrix mapping, and assignment.
- **`user/`**: User profiles, profile pictures, security preferences, and invitations.
- **`common/`**: Shared base controllers (e.g., [`AbstractController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/common/AbstractController.java)).

---

### 2.4 [`com.openkoda.service`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service) — Business Logic Layer
Encapsulates domain operations and low-code service execution:

- **`dynamicentity/`**:
  - [`DynamicEntityRegistrationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java): Compiles bytecode at runtime for user-defined entities.
  - [`DynamicEntityDescriptorFactory`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityDescriptorFactory.java): Registry of dynamic entity metadata, fields, and search formulas.
- **`openai/`**: Integration with OpenAI APIs (chat completion, automated suggestions, content generation).
- **`export/` & `csv/`**: Robust import/export service capable of reading/writing CSV, XLSX, and relational DTOs.
- **`autocomplete/`**: Fast lookup services for form field auto-completion.
- **`user/` & `organization/`**: User account lifecycles, invitations, and multi-tenant onboarding.
- **`notification/`**: Email and in-app notification routing.
- **`role/`**: Role-based and privilege-based permission resolution.
- **`upgrade/`**: Schema upgrade and data migration assistance between platform versions.

---

### 2.5 [`com.openkoda.model`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model) — Data & Persistence Model
Contains JPA entities and value objects structured around common patterns:

- **`common/` (Foundational Entity Hierarchy)**:
  - [`OpenkodaEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/common/OpenkodaEntity.java): Base class providing integer/long primary key, optimistic locking (`@Version`), and index columns.
  - [`TimestampedEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/common/TimestampedEntity.java): Adds created/modified timestamps.
  - [`OrganizationRelatedEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/common/OrganizationRelatedEntity.java): Foundation for multi-tenancy; enforces `organization_id` foreign key.
  - [`SearchableEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/common/SearchableEntity.java): Full-text search and filtering support across tables.
- **`component/` (Low-Code Infrastructure Models)**:
  - [`FrontendResource`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/FrontendResource.java): Dynamic UI templates stored in DB.
  - [`ServerJs`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/ServerJs.java): Dynamic server-side scripts.
  - [`Form`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/Form.java): User-defined form structures.
  - [`ControllerEndpoint`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/ControllerEndpoint.java): Custom HTTP endpoints declared at runtime.
- **`DynamicEntity`**: Runtime-extended entity holding schema-free dynamic fields.
- **`authentication/`**: External identity mappings:
  - Google, LinkedIn, Facebook, Salesforce, LDAP, and API Keys.
- **`task/` & `notification/`**: Scheduled tasks, HTTP webhook tasks, and user notification messages.

---

### 2.6 [`com.openkoda.repository`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository) — Data Access Layer
- Extends Spring Data JPA with security and search enhancements:
  - [`SecureRepository`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository/SecureRepository.java): Ensures queries respect tenant bounds and permissions.
  - **`specifications/`**: JPA `Specification` predicates for full-text search, multi-field filters, and tenant isolation.
  - Domain repositories: `user`, `organization`, `notifications`, `file`, `task`, `ai`, `admin`.

---

### 2.7 [`com.openkoda.uicomponent`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent) — Live UI & Script Interop
Serves as the execution sandbox bridge between server-side JavaScript and Spring beans:
- **`live/`**: Exposes curated, safe service wrappers into the JavaScript runtime:
  - [`LiveDataServices`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveDataServices.java): Database query execution from JS.
  - [`LiveOpenAIServices`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveOpenAIServices.java): Invoking AI models from scripts.
  - [`LiveSystemServices`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveSystemServices.java): Logging, emails, and platform utilities.
  - [`LiveIntegrationServices`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveIntegrationServices.java): Calling third-party APIs.
- **[`JsFlowRunner`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java)**: Runs reactive flows written in JavaScript.

---

### 2.8 [`com.openkoda.integration`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration) — Third-Party Integrations
Out-of-the-box connectors for third-party tools:
- **`consumer/`**: Event consumers for GitHub, Jira, Trello, and Basecamp.
- **`form/`**: Configuration forms for Slack, MS Teams, GitHub, Jira, and Trello.
- **`service/`**: Integration verification, webhooks, and push notification delivery.

---

### 2.9 [`reactor.util.function`](file:///home/jksingh/openkoda/openkoda/src/main/java/reactor/util/function)
- Provides [`ViewVariants`](file:///home/jksingh/openkoda/openkoda/src/main/java/reactor/util/function/ViewVariants.java), extending Reactor’s `Tuple4` to support multiple view options and PageModel mapping functions within Openkoda’s reactive Flow engine.

---

## 3. Resources Directory (`src/main/resources`)

The resources directory contains application assets, templates, and configurations:

```
src/main/resources/
├── components/                     # Dynamic UI components (HTML/JS)
│   ├── global/                     # Components accessible globally across tenants
│   ├── organization/               # Components scoped to organization pages
│   └── public/                     # Publicly viewable web components
├── components-additional-files/    # Additional static assets for UI components
├── db/ & migration/                # PostgreSQL schema DDL, indexing, and migration SQL
├── default-code/                   # Baseline starter templates for server-side scripts
├── fonts/                          # Embedded fonts (e.g. Open Sans)
├── public/vendor/                  # Packaged client-side libraries:
│   ├── bootstrap/ & sb-admin/      # CSS framework and admin dashboard theme
│   ├── codemirror/                 # In-browser code editor for dynamic JS/HTML
│   ├── datatables-responsive/      # Interactive grid tables
│   ├── swagger-ui/                 # Interactive REST API documentation
│   └── chart.js & morrisjs/        # Data visualization charts
├── templates/                      # Thymeleaf server-side templates:
│   ├── frontend-resource/          # Wrapper templates for DB-driven frontend resources
│   ├── module/                     # Templates grouped by module (integration, etc.)
│   ├── page/                       # Concrete view pages (login, dashboard, forms)
│   └── xml/                        # XML sitemaps and export templates
└── *.properties                    # Configuration files:
    ├── application.properties      # Main Spring configuration
    ├── application-openkoda.properties # Openkoda custom property overrides
    ├── messages.properties         # English localization strings
    └── messages_pl.properties      # Polish localization strings
```

---

## 4. Test Directory (`src/test`)

The test folder combines automated unit tests with Cucumber Behavior-Driven Development (BDD):

```
src/test/
├── java/
│   ├── com/openkoda/               # Unit and integration test cases
│   └── cucumber/                   # BDD step definitions & Page Object Model
│       ├── common/                 # Common test context, browsers, hooks
│       └── page/                   # Selenium / Web driver page representations
└── resources/
    ├── features/                   # Gherkin scenario feature files:
    │   ├── authentication/         # Login, registration, 2FA, password recovery
    │   ├── forms/                  # Form validations, submissions, dynamic fields
    │   ├── navigation/             # Navigation menus, role-based visibility
    │   └── tables/                 # Grid filtering, sorting, pagination
    ├── migration/                  # Test database schema setup
    └── security/                   # Key store & certificate assets for tests
```

---

## 5. Architectural Summary & Design Patterns

1. **Monadic Flow Orchestration**: Request handling flows through `Flow.init(...)` pipelines, guaranteeing uniform transactional boundaries, authorization checks, and model population.
2. **Dynamic Runtime Extensibility**: Bytecode compilation via ByteBuddy lets the system synthesize new JPA entities and repositories without restarting or redeploying the application.
3. **Dual-Layer Template Resolution**: Thymeleaf is configured with a custom hybrid resolver that prioritizes database-persisted UI components before falling back to filesystem/classpath templates.
4. **Sandboxed Polyglot Scripting**: Server-side JavaScript runs in a controlled GraalVM environment with access restricted to curated "Live" Spring services.
5. **Multi-Tenancy Isolation**: Multi-tenancy is deeply embedded across entity hierarchies, security interceptors, and database schema routing.
