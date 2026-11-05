# Openkoda — Architectural Analysis Summary

**Workspace**: `/home/jksingh/openkoda`  
**Aggregator Version**: `1.7.1`  
**Primary Stack**: Spring Boot 3.0.5 / Java 17 / PostgreSQL / Hibernate 6 / GraalVM JS / Thymeleaf / Hazelcast  
**Analysis Date**: November 2026  

---

## 1. What the Application Does

Openkoda is an extensible, multi-tenant enterprise application platform and rapid SaaS development engine. Rather than serving only fixed business models, it functions as a **low-code runtime host**:
- Stores database schema definitions, dynamic forms, server-side JavaScript scripts, cron schedules, and HTML UI templates as first-class persistent database entities.
- Generates Java bytecode in memory using **ByteBuddy** at application boot and during runtime restarts to dynamically produce JPA entities and Spring Data repositories without recompiling or redeploying code.
- Executes business workflows through a monadic functional pipeline (`Flow`) and polyglot server scripts inside an embedded **GraalVM JavaScript** engine.
- Provides a multi-tenant portal with row-level and schema-level data isolation, role-based access control, third-party integrations (GitHub, Jira, Trello, Slack), and OpenAI-backed report generation.

---

## 2. Observed Architecture

Openkoda is structured as a **Modular Monolith** organized into functional modules with specific metadata-driven extensions:
1. **Two-Stage Boot Pipeline**:
   - Stage 1: Raw JDBC pre-flight (`JDBCApp`) executes incremental database migrations (`DbVersionService`) and queries dynamic entity descriptors.
   - Stage 2: ByteBuddy in-memory bytecode synthesis injects `@Entity` classes into the JVM ClassLoader before Spring Boot (`App.startApp`) scans and builds the JPA persistence unit.
2. **Monadic Flow Pipeline**:
   - Encapsulates application use cases into functional chains (`Flow.init().then().thenSet().execute()`), decoupling request handling from procedural script execution and binding results into a `PageModelMap`.
3. **Database-Backed Dynamic Presentation**:
   - Extends Thymeleaf's `ClassLoaderTemplateResolver` (`FrontendResourceOrClassLoaderTemplateResolver`) to load HTML templates directly from the `frontend_resource` database table.
4. **Distributed State Synchronization**:
   - Relies on Hazelcast cluster topics (`CLUSTER_EVENT_TOPIC`) to invalidate and synchronize dynamic metadata (schedulers, event listeners, dynamic forms) across cluster nodes.

---

## 3. Main Responsibilities and Business Capabilities

1. **Multi-Tenancy & Organization Management**: Tenant isolation via `organization_id` foreign keys, optional schema-per-tenant (`org_<orgId>`), and thread-local tenant resolution (`TenantResolver`).
2. **Dynamic Data Model & Low-Code Engine**: Metadata-driven entity creation, ByteBuddy runtime class compilation, and dynamic Spring Data repository generation (`DynamicEntityRegistrationService`).
3. **Polyglot Scripting & ServerJS Flow Execution**: Execution of server-side JavaScript inside GraalVM polyglot context (`JsFlowRunner`) with access to Java service beans.
4. **CMS, UI Components & Page Builder**: Dynamic Thymeleaf template resolution from database records, component widgets, and custom layouts.
5. **Identity & Access Management (RBAC)**: Multi-chain Spring Security filters (session login, API token headers, path-prefix tokens), hierarchical dynamic privileges, and user management.
6. **Event Bus & Schedulers**: Asynchronous event dispatching (`ApplicationEventService`), cron job scheduling (`JobsScheduler`), and Hazelcast cluster synchronization.
7. **External System Integrations**: Outbound adapters for GitHub, Atlassian Jira, Trello, Basecamp, Slack, and Microsoft Teams.
8. **File & Media Storage**: File upload and asset streaming supporting PostgreSQL BLOB storage, local filesystems, and AWS S3.
9. **Audit Logging & Diagnostics**: Session-scoped Hibernate interceptor (`PropertyChangeInterceptor`) for property mutation auditing and system health monitoring.
10. **Component Import / Export**: Serialization of forms, UI resources, scripts, and privileges to zipped YAML archives for portability.

---

## 4. Top Five Architectural Findings

1. **"ComponentProvider" Universal Dependency Hub (God Object)**  
   *Evidence*: [`ComponentProvider.java:44-60`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/ComponentProvider.java#L44-L60), [`Services.java:22-60`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/Services.java#L22-L60)  
   *Impact*: Controllers, services, and repositories inherit or inject `ComponentProvider`, creating an interconnected dependency web that forced the team to enable `spring.main.allow-circular-references=true`. This complicates unit testing, increases coupling, and hinders component modularization.

2. **Transaction Boundaries Placed on Web Controllers**  
   *Evidence*: [`CRUDControllerHtml.java:215, 250`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/controller/CRUDControllerHtml.java#L215)  
   *Impact*: Placing `@Transactional` directly on Spring MVC controller methods keeps database transactions open through HTTP presentation handling, increasing connection pool hold times and leaking persistence concerns into the transport layer.

3. **Security Authorization Rules Embedded in Persistence Repositories**  
   *Evidence*: [`SearchableFunctionalRepositoryWithLongId.java:68-88`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/core/repository/common/SearchableFunctionalRepositoryWithLongId.java#L68-L88)  
   *Impact*: Repository methods query `UserProvider.getFromContext()` to evaluate security privileges inside SQL specifications. This inverts architectural layering by coupling the persistence layer to web/session security contexts.

4. **Unrestricted Host Access in Polyglot JavaScript Execution**  
   *Evidence*: [`JsFlowRunner.java:53-57, 76-79`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/uicomponent/JsFlowRunner.java#L53-L57)  
   *Impact*: The GraalVM context is configured with `HostAccess.ALL` and `allowAllAccess(true)`. If non-superadmins are granted permission to create or edit ServerJS code, they could perform arbitrary JVM reflection or system operations.

5. **Custom SQL Migration Runner Instead of Industry Tooling**  
   *Evidence*: [`DbVersionService.java:34-70`](file:///home/jksingh/openkoda/openkoda/src/main/java/com/openkoda/service/upgrade/DbVersionService.java#L34-L70), `migration/core_upgrade.sql`  
   *Impact*: Database migrations rely on custom regex parsing of `-- @version:` comments in SQL files rather than standard, battle-tested migration tools like Flyway or Liquibase, lacking automated checksumming and transactional rollback features.

---

## 5. Most Consequential Unknowns

1. **Multi-Schema Production Adoption**:  
   The codebase provides code paths for schema-per-tenant isolation (`MultitenancyService.createTenant`), but the default configuration is shared-schema with row-level filtering. It is unconfirmed from the repository whether multi-schema isolation is actively tested and deployed in live production clusters.
2. **GraalVM Performance Profile in Containerized Environments**:  
   GraalVM JS 22.3.1 runs inside an OpenJDK container image (`eclipse-temurin:17-jdk`). It is unknown whether production relies on interpreted execution or if ahead-of-time Truffle JIT compilation optimizations are enabled.
3. **AWS S3 vs Database BLOB Storage Utilization**:  
   Both storage backends are implemented in `FileService`, but the repository ships with `file.storage.type=database`. The actual deployment ratio between cloud object storage and relational BLOBs is unknown.

