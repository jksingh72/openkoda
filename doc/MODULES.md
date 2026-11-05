# Openkoda — Product Modules & Functional Architecture

This document provides a detailed breakdown of all functional modules in Openkoda, identifying their components, responsibilities, APIs, and interactions.

---

## 1. Multi-Tenancy & Organization Management Module

* **Primary Package**: [`com.openkoda.core.multitenancy`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy), [`com.openkoda.controller.organization`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/organization)
* **Key Classes**:
  * [`MultitenancyService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/MultitenancyService.java): Core orchestration service for tenant creation, asynchronous entity-manager execution across tenants, and tenant database DDL scripts.
  * [`TenantResolver`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/TenantResolver.java): Implements Hibernate `CurrentTenantIdentifierResolver`. Maintains active `TenantedResource` (Organization ID, Host, Entity Key, Method) in a `ThreadLocal`.
  * [`QueryExecutor`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/QueryExecutor.java): Low-level thread-safe JDBC/JPA query executor executing SQL statements within transactional boundaries.
  * [`Organization`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/Organization.java) & [`UserRole`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/UserRole.java): Tenant boundary entity and membership mapping.

### Tenancy Isolation Modes
1. **Shared Schema (Default)**:
   - Data stored in a single PostgreSQL database schema (`public`).
   - Tenant isolation enforced programmatically via `organization_id` foreign key columns on all [`OrganizationRelatedEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/common/OrganizationRelatedEntity.java) implementations and secured via Spring Security SpEL rules.
2. **Multi-Schema Isolation (`is.multitenancy=true`)**:
   - Each tenant receives a distinct PostgreSQL schema: `org_<organizationId>`.
   - On tenant creation, [`MultitenancyService.createTenant(orgId)`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/multitenancy/MultitenancyService.java) executes `CREATE SCHEMA org_<orgId>` and replicates tenanted tables without constraints.
3. **Multi-Database Isolation**:
   - Physical database separation across different PostgreSQL database instances.

---

## 2. Dynamic Data Model & Low-Code Entity Engine

* **Primary Package**: [`com.openkoda.service.dynamicentity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity)
* **Key Classes**:
  * [`DynamicEntityRegistrationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityRegistrationService.java): Coordinates ByteBuddy bytecode compilation, class generation, and Spring Data repository registration.
  * [`DynamicEntityDescriptorFactory`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityDescriptorFactory.java): In-memory catalog of registered dynamic entity descriptors.
  * [`DynamicEntityDescriptor`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/dynamicentity/DynamicEntityDescriptor.java): Holds entity metadata, table names, fields, search index formulas, and privileges.
  * [`DynamicEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/DynamicEntity.java): Database record representing a user-defined entity.

### How Dynamic Code Generation Works
1. When an administrator creates a new form/entity, the definition is stored in `form` and `dynamic_entity` tables.
2. During initialization or via `App.restart(true)`, `DynamicEntityRegistrationService`:
   - Builds Java bytecode for classes extending [`OpenkodaEntity`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/common/OpenkodaEntity.java) with annotations (`@Entity`, `@Table`, `@Column`, `@ManyToMany`).
   - Injects the generated classes into the runtime ClassLoader.
   - Generates Spring Data JPA [`SecureRepository`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/repository/SecureRepository.java) interfaces.
   - Integrates them into Hibernate's `PersistenceUnitPostProcessor` so they become standard first-class JPA entities.

---

## 3. Flow Engine & Polyglot Server-side Scripting

* **Primary Package**: [`com.openkoda.core.flow`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow), [`com.openkoda.uicomponent`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent)
* **Key Classes**:
  * [`Flow<I, O, CP>`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/Flow.java): Monadic functional execution pipeline chaining computations with `then()`, `thenSet()`, `thenWithoutResult()`.
  * [`ResultAndModel<I, CP>`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/ResultAndModel.java): Request container passing the accumulated result, [`PageModelMap`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/flow/PageModelMap.java), services, and HTTP parameters.
  * [`JsFlowRunner`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java): Evaluates JavaScript flow definitions within a GraalVM polyglot context.
  * [`ServerJSRunner`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/customisation/ServerJSRunner.java): Executes standalone server-side JavaScript scripts triggered by event listeners or scheduled jobs.
  * [`LiveComponentProvider`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/live/LiveComponentProvider.java): Spring service providing JavaScript scripts safe access to repositories, utilities, and services.

---

## 4. Dynamic UI, Page Builder & Frontend Resources

* **Primary Package**: [`com.openkoda.core.service.FrontendResourceService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/FrontendResourceService.java), [`com.openkoda.controller.PageBuilderController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/PageBuilderController.java)
* **Key Classes**:
  * [`FrontendResource`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/component/FrontendResource.java): Database entity storing HTML templates, CSS stylesheets, UI components, or scripts.
  * [`FrontendResourceOrClassLoaderTemplateResolver`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/configuration/FrontendResourceOrClassLoaderTemplateResolver.java): Custom Thymeleaf `ClassLoaderTemplateResolver` that queries the database first for modified templates before falling back to classpath files.
  * [`PageBuilderController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/PageBuilderController.java): Provides endpoints for the visual drag-and-drop page builder.

---

## 5. Security, RBAC & Row-Level Authorization

* **Primary Package**: [`com.openkoda.core.security`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security), [`com.openkoda.model`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model)
* **Key Classes**:
  * [`HasSecurityRules`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/HasSecurityRules.java): Master interface defining Spring Security constants and SpEL evaluation rules.
  * [`UserProvider`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/UserProvider.java): Helper retrieving the authenticated `OrganizationUser` and managing cron job / background authentication.
  * [`RunAsService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/security/RunAsService.java): Safe user spoofing/impersonation engine for administrators.
  * [`Privilege`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/Privilege.java) & [`DynamicPrivilege`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/model/DynamicPrivilege.java): Static enum privileges and dynamic privileges manageable via UI.

---

## 6. Event Bus, Task Scheduling & Clustering

* **Primary Package**: [`com.openkoda.core.service.event`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event), [`com.openkoda.core.job`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/job)
* **Key Classes**:
  * [`ApplicationEventService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ApplicationEventService.java): Dispatches synchronous and asynchronous application events.
  * [`EventListenerService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/EventListenerService.java): Registers database-backed event listeners linked to server JS or Java consumers.
  * [`ClusterEventSenderService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/ClusterEventSenderService.java): Publishes cluster events over Hazelcast topic `CLUSTER_EVENT_TOPIC`.
  * [`SchedulerService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/event/SchedulerService.java): Configures cron-triggered jobs persisted in the database.

---

## 7. Generic CRUD & API Controller Layer

* **Primary Package**: [`com.openkoda.controller`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller), [`com.openkoda.controller.api`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/api)
* **Key Classes**:
  * [`CRUDControllerHtml`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java): Handles all HTML CRUD web traffic for entities registered in `HtmlCRUDControllerConfigurationMap`.
  * [`CRUDApiController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/api/CRUDApiController.java): Exposes RESTful endpoints for CRUD operations.
  * Standard URL pattern:
    - Web UI: `/html/organization/{orgId}/{entityName}/all`, `/html/organization/{orgId}/{entityName}/new`, `/html/organization/{orgId}/{entityName}/{id}/settings`
    - REST API: `/api/v1/organization/{orgId}/{entityName}/all`, `/api/v1/{entityName}/{id}`

---

## 8. Smart Reporting & AI Integration

* **Primary Package**: [`com.openkoda.controller.report`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/report), [`com.openkoda.service.openai`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/openai)
* **Key Classes**:
  * [`QueryReportController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/report/QueryReportController.java): Executes SQL reports, generates ChartJS charts, and exports results to Excel.
  * [`ChatGPTService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/openai/ChatGPTService.java): Calls OpenAI API using TheoKanning client.
  * [`ChatGPTPromptService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/openai/ChatGPTPromptService.java): Introspects JPA entity metadata to generate schema prompts for natural-language-to-SQL generation.

---

## 9. Integrations & Webhook Subsystem

* **Primary Package**: [`com.openkoda.integration`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration)
* **Key Classes**:
  * [`IntegrationService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/service/IntegrationService.java): Manages OAuth tokens and integration configurations.
  * Integration Consumers:
    * [`SlackService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/service/SlackService.java) & `PushNotificationService`
    * [`JiraIntegrationConsumers`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/JiraIntegrationConsumers.java)
    * [`GitHubIntegrationConsumers`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/GitHubIntegrationConsumers.java)
    * [`TrelloIntegrationConsumers`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/TrelloIntegrationConsumers.java)
    * [`BasecampIntegrationConsumers`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/integration/consumer/BasecampIntegrationConsumers.java)

---

## 10. Component Packaging & Migration Module

* **Primary Package**: [`com.openkoda.controller.ComponentsController`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/ComponentsController.java), [`com.openkoda.service.export`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/export)
* **Key Classes**:
  * [`ComponentExportService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/export/ComponentExportService.java): Serializes forms, scripts, resources, event listeners, and schedulers into YAML and bundles them into a ZIP archive.
  * [`ZipComponentImportService`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/export/ZipComponentImportService.java): Reads uploaded application ZIP packages, validates contents, and inserts/updates records within a single transaction.
