# Requirements Document

## Introduction

Openkoda is an open-source (MIT license), enterprise-grade low-code application development platform built on Java 17, Spring Boot 3.x, Hibernate, PostgreSQL, and GraalVM. It accelerates delivery of enterprise systems, multi-tenant SaaS applications, and internal tools by providing a rich set of pre-built capabilities — authentication, multi-tenancy, dynamic data modeling, a page builder, smart reporting, workflow automation, external integrations, and operational tooling — while retaining full pro-code extensibility with standard Java and Spring Boot.

This document formally captures the existing functional capabilities of Openkoda 1.7.x as a requirements specification so that the behavior is unambiguously understood, can be tested, and serves as a baseline for future evolution.

---

## Glossary

- **Platform**: The Openkoda application as a whole, including its runtime, UI, and all subsystems.
- **Administrator**: A user with global superuser privileges who can access the admin panel and manage platform-wide settings.
- **Organization**: A tenant unit within the Platform. One Platform instance may host many Organizations.
- **User**: An authenticated human actor operating within the Platform, associated with one or more Organizations.
- **Role**: A named collection of Privileges assigned to a User either globally or within a specific Organization.
- **Privilege**: An atomic access-control permission governing a specific action (e.g., `readOrgData`, `manageUserRoles`).
- **DynamicPrivilege**: A user-defined Privilege created at runtime via the UI, stored in the database.
- **Dynamic_Entity**: A database table and its corresponding JPA entity class synthesized at runtime from a Form definition using ByteBuddy.
- **Form**: An administrative definition that specifies fields, types, validations, and metadata for a Dynamic_Entity.
- **Frontend_Resource**: A database-stored HTML/CSS/JavaScript template or snippet rendered by the Thymeleaf template engine.
- **Flow**: The monadic functional pipeline (`Flow<I, O, CP>`) used internally by controllers to chain validation, data access, and view-model generation.
- **Event**: A typed application event (e.g., `USER_CREATED`, `SCHEDULER_EXECUTED`) published on the internal event bus.
- **Event_Listener**: A database-backed subscription that maps an Event to a consumer function (server-side JavaScript or built-in Java handler).
- **Scheduler**: A database-backed cron job definition that emits `SCHEDULER_EXECUTED` events on a configured schedule.
- **Component**: A portable application artifact (Form, Frontend_Resource, Event_Listener, Scheduler, web endpoint) that can be serialized to YAML and packaged into a ZIP archive.
- **Report**: A named SQL query definition whose results are displayed as a table, chart, or downloadable file.
- **Audit_Record**: An immutable log entry recording a property-level diff of an entity change, the modifying User, timestamp, and IP address.
- **Backup**: A compressed, optionally GPG-encrypted archive containing a `pg_dump` of the database and application configuration.
- **StorageType**: The physical backend for file storage — one of `database` (PostgreSQL LOB), `filesystem` (local disk), or `amazon` (AWS S3).
- **Hazelcast_Cluster**: The embedded Hazelcast 5.x in-memory cluster used for distributed session replication and cluster-wide event broadcasting.
- **global_search_view**: A PostgreSQL `VIEW` automatically generated at startup that unions all searchable entities for permission-filtered global search.

---

## Requirements

### Requirement 1: Enterprise Application Foundation — Authentication

**User Story:** As a User, I want to authenticate securely with the Platform, so that only authorized individuals can access application data.

#### Acceptance Criteria

1. WHEN a user submits valid login credentials (username and password), THE Platform SHALL establish an authenticated session and redirect the user to their default landing page.
2. WHEN a user submits invalid credentials, THE Platform SHALL reject the authentication request and return an error response without revealing whether the username or password was incorrect.
3. THE Platform SHALL support header-based API authentication using an `X-Auth-Token` token for REST API clients.
4. THE Platform SHALL support token-based authentication via a URL path prefix for webhook and download scenarios.
5. THE Platform SHALL support token-based authentication via a request parameter for use cases that cannot set custom headers.
6. WHEN a user requests a password reset, THE Platform SHALL send a time-limited reset link to the user's registered email address.
7. THE Platform SHALL enforce secure session cookies by default, configurable via the `SECURE_COOKIE` environment variable.
8. WHERE the OAuth2 integration feature is enabled, THE Platform SHALL support authentication via Google and Facebook identity providers.
9. WHERE the LDAP integration feature is enabled, THE Platform SHALL support authentication via an external LDAP directory.

---

### Requirement 2: Enterprise Application Foundation — User Management

**User Story:** As an Administrator, I want to manage users across multiple Organizations, so that I can control who has access to what within each tenant.

#### Acceptance Criteria

1. THE Platform SHALL allow an Administrator to create, read, update, and deactivate User accounts.
2. THE Platform SHALL allow an Administrator to invite new users to an Organization, sending an invitation email to the provided address.
3. THE Platform SHALL allow an Administrator to assign and revoke Roles for a User both globally and within the scope of a specific Organization.
4. WHEN a User's Role or Privilege set is modified, THE Platform SHALL apply the change to all subsequent requests made by that User without requiring a session restart.
5. THE Platform SHALL maintain a unique email address per User account and enforce this constraint at the persistence layer.
6. THE Platform SHALL allow an Administrator to impersonate (spoof) another User's identity for debugging purposes, with the spoofed session clearly distinguishable from a normal session.
7. WHEN an Administrator ends an impersonation session, THE Platform SHALL restore the original Administrator's identity and privileges.
8. THE Platform SHALL display user profile information including first name, last name, email, and Organization memberships.

---

### Requirement 3: Enterprise Application Foundation — Role-Based Security Model

**User Story:** As an Administrator, I want to define roles with granular privileges, so that users only access the data and actions they are authorized for.

#### Acceptance Criteria

1. THE Platform SHALL enforce method-level authorization using Spring Security SpEL expressions evaluated against the authenticated User's Privilege set.
2. THE Platform SHALL enforce row-level data isolation in shared-schema mode by automatically appending `organization_id` filters on all queries for Organization-scoped entities.
3. THE Platform SHALL support global Privileges that apply platform-wide regardless of Organization context.
4. THE Platform SHALL support Organization-scoped Privileges that apply only within the context of a specific Organization.
5. WHEN a User accesses a CRUD endpoint for an Organization-scoped entity, THE Platform SHALL verify that the User holds either a matching global Privilege or the matching Organization-level Privilege for that Organization.
6. THE Platform SHALL allow Administrators to define custom DynamicPrivileges through the UI, which are stored in the database and available for assignment to Roles at runtime.
7. THE Platform SHALL provide a set of built-in static Privileges covering standard operations such as `readOrgData`, `manageOrgData`, `readUserData`, `manageUserRoles`, `canReadBackend`, `canManageBackend`, `readReports`, `createReports`, and `useReportingAI`.
8. THE Platform SHALL allow field-level access control, restricting which fields within an entity form are visible or editable based on the User's Privileges.

---

### Requirement 4: Enterprise Application Foundation — Admin Dashboard

**User Story:** As an Administrator, I want a dedicated administration panel, so that I can monitor and manage the Platform from a central location.

#### Acceptance Criteria

1. WHEN a User with the `canSeeAdminPanel` privilege logs in, THE Platform SHALL display a navigation entry and route to the admin panel.
2. THE Admin_Panel SHALL provide access to user management, organization management, role management, system health, audit logs, scheduler configuration, event listener configuration, and component import/export.
3. THE Platform SHALL present real-time system health indicators including JVM memory usage, disk usage, active database connection counts, and background thread pool status.
4. THE Platform SHALL provide access to application logs from within the admin panel.
5. THE Platform SHALL display the Platform version and active Spring profiles on the admin overview page.

---

### Requirement 5: Industry-Specific Application Templates

**User Story:** As a developer, I want to start from a pre-built domain-specific application template, so that I can reduce the time needed to build a production application.

#### Acceptance Criteria

1. THE Platform SHALL provide an Embedded Insurance application template that includes data models, dashboards, and business features for insurance policy management.
2. THE Platform SHALL provide a Time Tracking (Timelog) application template that allows employees to record hours spent on tasks and managers to generate monthly performance reports.
3. WHEN an Administrator uploads a template ZIP archive via Configuration > Import/Export, THE Platform SHALL import all components (Forms, Frontend_Resources, Event_Listeners, Schedulers, web endpoints) contained in the archive within a single database transaction.
4. IF the imported archive contains no recognizable component manifests or the archive is corrupt, THEN THE Platform SHALL reject the import and return a descriptive error message.
5. THE Platform SHALL make all imported template components immediately active without requiring an application restart, except where new Dynamic_Entity schemas require a hot restart.

---

### Requirement 6: Data Model Builder — Dynamic Entities

**User Story:** As a developer, I want to define new database entities through the UI, so that I can extend the application data model without writing Java code.

#### Acceptance Criteria

1. WHEN an Administrator saves a new Form definition with fields in the Data Model Builder, THE Platform SHALL generate and inject a compiled JPA `@Entity` class and a corresponding Spring Data `SecureRepository` interface into the running JVM using ByteBuddy bytecode generation.
2. WHEN a Dynamic_Entity definition is saved, THE Platform SHALL apply the corresponding DDL to the PostgreSQL database (creating or altering the target table) at the next hot restart.
3. THE Platform SHALL support the following field types in Form definitions: text, number, date, time, boolean, dropdown (single select), multi-select, code snippet (HTML/CSS/JS), file attachment, geographic coordinate (Point), and foreign key reference.
4. WHEN a Dynamic_Entity definition changes, THE Administrator SHALL be able to trigger a hot restart via Save & Apply, which regenerates all Dynamic_Entity classes and relaunches the Spring application context without terminating the JVM process.
5. THE Platform SHALL register all Dynamic_Entity instances in the global_search_view so that records of those entities are returned by global search queries.
6. WHEN a Dynamic_Entity is registered, THE Platform SHALL automatically generate CRUD web UI endpoints (`/html/organization/{orgId}/{entityName}/all`, `/html/organization/{orgId}/{entityName}/new`, `/html/organization/{orgId}/{entityName}/{id}/settings`) and REST API endpoints (`/api/v1/organization/{orgId}/{entityName}/all`, `/api/v1/{entityName}/{id}`).

---

### Requirement 7: Data Model Builder — Field Configuration and Validation

**User Story:** As a developer, I want to configure field-level constraints and display settings for dynamic entities, so that the generated forms enforce data quality automatically.

#### Acceptance Criteria

1. THE Platform SHALL allow each field in a Form definition to have a display label, a database column name, a data type, and an optional validation rule.
2. THE Platform SHALL support intelligent autocomplete in the field type editor within the Development Kit UI.
3. WHEN a required field is omitted on form submission, THE Platform SHALL return a validation error response identifying the field and the constraint violated.
4. THE Platform SHALL support conditional field types whose available options depend on the value of another field.
5. THE Platform SHALL apply all field definitions immediately to the UI after a hot restart without requiring any code deployment.

---

### Requirement 8: Dashboard Builder

**User Story:** As a developer or Administrator, I want to visually compose custom dashboards for different user types, so that each audience sees only the widgets relevant to them.

#### Acceptance Criteria

1. THE Platform SHALL provide a drag-and-drop visual page builder that allows Administrators to arrange pre-built widgets, images, and data tables on a dashboard canvas.
2. THE Platform SHALL support creating dashboards scoped to a specific Organization, visible only to members of that Organization.
3. THE Platform SHALL support creating global dashboards visible to all authenticated Users.
4. WHEN an Administrator saves a dashboard layout, THE Platform SHALL persist the layout definition in the database and render it on the next page load without a restart.
5. THE Platform SHALL provide pre-built dashboard widgets including message senders, email schedulers, attachment lists, task lists, notes, and detailed entity information panels.
6. THE Platform SHALL support embedding ChartJS data visualizations as widgets within dashboards.

---

### Requirement 9: Custom HTML/CSS Look and Feel

**User Story:** As a developer, I want to override default UI templates with custom HTML and CSS, so that my application has a distinct visual identity.

#### Acceptance Criteria

1. THE Platform SHALL allow Administrators to create and edit Frontend_Resources (HTML templates, CSS stylesheets) stored in the database through the admin UI.
2. WHEN a view is resolved, THE Platform SHALL first look up a matching Frontend_Resource in the database; IF a match is found, THEN THE Platform SHALL render it instead of the classpath-based template.
3. THE Platform SHALL support three access scopes for Frontend_Resources: `PUBLIC` (unauthenticated pages), `ORGANIZATION` (scoped to a specific tenant), and `GLOBAL` (platform-wide, visible to all authenticated Users).
4. WHEN a Frontend_Resource is saved or updated, THE Platform SHALL make the change effective on the next HTTP request without an application restart.
5. THE Platform SHALL allow Administrators to assign a required Privilege to a Frontend_Resource, restricting access to Users who hold that Privilege.

---

### Requirement 10: Custom Business Logic via Server-Side JavaScript

**User Story:** As a developer, I want to write and execute server-side JavaScript business logic, so that I can implement custom rules without redeploying the application.

#### Acceptance Criteria

1. THE Platform SHALL execute server-side JavaScript using the GraalVM polyglot JavaScript engine within a sandboxed execution context.
2. THE Platform SHALL expose a `LiveComponentProvider` interface to server-side scripts, providing access to repositories, utility services, email services, and notification services.
3. WHEN a server-side script is attached to a web endpoint and a matching HTTP request is received, THE Platform SHALL execute the script and return its output as the HTTP response.
4. WHEN a server-side script is attached to an Event_Listener and the corresponding Event is emitted, THE Platform SHALL execute the script asynchronously with the event payload.
5. THE Platform SHALL expose a `flow` object within script context, allowing scripts to chain operations using the same monadic Flow pipeline available to Java controllers.
6. THE Platform SHALL expose `services.data`, `services.email`, and `services.notification` within script context so scripts can persist data, send emails, and dispatch in-app notifications.
7. IF a server-side script throws an uncaught exception, THEN THE Platform SHALL log the error with the script identifier and continue processing other requests and events without crashing.

---

### Requirement 11: Smart Reporting — SQL Reporting

**User Story:** As a business analyst, I want to write custom SQL queries and view the results in the application, so that I can derive insights from application data without external tools.

#### Acceptance Criteria

1. THE Platform SHALL allow Users with the `createReports` privilege to define named SQL Report definitions by writing SQL queries against the application's database schema.
2. WHEN a Report is executed, THE Platform SHALL run the SQL query within a read-only transaction and return the result as a paginated data table in the UI.
3. THE Platform SHALL allow Users with the `readReports` privilege to view and run saved Reports created by other users within the same Organization.
4. THE Platform SHALL allow Users to download Report results as CSV or Excel files.
5. THE Platform SHALL allow periodic execution of Reports on a configured schedule and delivery of results to specified recipients.
6. IF a Report SQL query contains a syntax error or references a non-existent table, THEN THE Platform SHALL return a descriptive database error message to the user without crashing.

---

### Requirement 12: Smart Reporting — Reporting AI (Natural Language to SQL)

**User Story:** As a business analyst, I want to describe a data question in plain language and have a SQL query generated automatically, so that I can create reports without knowing SQL.

#### Acceptance Criteria

1. THE Platform SHALL integrate with the OpenAI API to generate SQL queries from natural-language prompts provided by Users with the `useReportingAI` privilege.
2. WHEN a User submits a natural-language prompt, THE Platform SHALL extract the database schema metadata (table names and column names) from the JPA entity metamodel and include it in the prompt sent to the AI, without sending actual data records.
3. THE Platform SHALL present the AI-generated SQL query to the User for review and allow the User to edit it before execution.
4. THE Platform SHALL allow the User to iteratively refine the generated SQL by submitting follow-up natural-language prompts.
5. THE Platform SHALL allow the User to save the AI-generated Report for periodic execution.
6. IF the OpenAI API is unavailable or returns an error, THEN THE Platform SHALL display an error message to the User and prevent query execution from the failed response.

---

### Requirement 13: Smart Reporting — Data Visualization

**User Story:** As a business analyst, I want to visualize report data as charts, so that trends are easier to communicate to stakeholders.

#### Acceptance Criteria

1. THE Platform SHALL allow Users to associate a ChartJS chart configuration with a Report definition to visualize query results graphically.
2. THE Platform SHALL render chart visualizations in the report view using ChartJS embedded in the page.
3. THE Platform SHALL support embedding chart visualizations as widgets within dashboards.
4. THE Platform SHALL allow Users to download chart data via the existing CSV/Excel export mechanism.

---

### Requirement 14: Automations — Email Sender

**User Story:** As a developer, I want the Platform to send transactional emails, so that users and administrators receive timely notifications.

#### Acceptance Criteria

1. THE Platform SHALL send transactional emails via SMTP using a configurable outbound email address.
2. THE Platform SHALL support HTML email templates resolved through the Thymeleaf engine, allowing custom layouts and data-driven content.
3. THE Platform SHALL store a record of each sent email in the database, including recipient, subject, body, timestamp, and associated Organization.
4. WHERE the Mailgun integration is configured, THE Platform SHALL route outbound email through the Mailgun API instead of SMTP.
5. THE Platform SHALL allow Organization-level email sender configuration, overriding the global SMTP settings for a specific Organization.
6. IF email delivery fails, THEN THE Platform SHALL log the failure with the recipient address, error detail, and timestamp.
7. THE Platform SHALL expose email-sending capability to server-side JavaScript scripts via the `services.email` interface.

---

### Requirement 15: Automations — In-App Notifications

**User Story:** As a developer, I want to programmatically send in-app notifications, so that users are alerted to important events within the application UI.

#### Acceptance Criteria

1. THE Platform SHALL allow server-side code and scripts to send in-app notifications to a specific User.
2. THE Platform SHALL allow server-side code and scripts to send in-app notifications to all Users within a specific Organization.
3. THE Platform SHALL allow server-side code and scripts to send in-app notifications globally to all authenticated Users.
4. WHEN a notification is created, THE Platform SHALL emit a `NOTIFICATION_CREATED` event on the internal event bus.
5. THE Platform SHALL display unread in-app notifications in the UI and mark them as read when the User views them.
6. THE Platform SHALL expose notification dispatch capability to server-side JavaScript scripts via the `services.notification` interface.

---

### Requirement 16: Automations — Data-Driven Document Generation

**User Story:** As a developer, I want to generate PDF, Word, and Excel documents from application data, so that I can produce formatted output documents programmatically.

#### Acceptance Criteria

1. THE Platform SHALL generate PDF documents server-side from HTML/CSS templates rendered via the Flying Saucer (iText5) library.
2. THE Platform SHALL support data-driven placeholders within document templates that are populated from application entity data at generation time.
3. THE Platform SHALL support conditional section selection in document templates based on entity field values.
4. THE Platform SHALL support multi-row and multi-column table sections in document templates driven by collection data.
5. WHEN a document is generated, THE Platform SHALL make it available for download or attachment to an entity record.

---

### Requirement 17: Automations — Business Process Automations (Events and Scheduler)

**User Story:** As a developer, I want to define event-driven automations and scheduled jobs, so that business processes run automatically in response to system events or on a time schedule.

#### Acceptance Criteria

1. THE Platform SHALL publish typed Events on the internal event bus for the following system occurrences: `USER_CREATED`, `USER_REGISTERED`, `USER_MODIFIED`, `USER_DELETED`, `USER_VERIFIED`, `USER_LOGGED_IN`, `ORGANIZATION_CREATED`, `ORGANIZATION_MODIFIED`, `ORGANIZATION_DELETED`, `USER_ROLE_CREATED`, `USER_ROLE_MODIFIED`, `USER_ROLE_DELETED`, `EVENT_LISTENER_CREATED`, `EVENT_LISTENER_MODIFIED`, `EVENT_LISTENER_DELETED`, `NOTIFICATION_CREATED`, `BACKUP_CREATED`, `BACKUP_FILE_COPIED`, `APPLICATION_STARTED`, and `SCHEDULER_EXECUTED`.
2. THE Platform SHALL allow Administrators to create Event_Listener records in the database that map a named Event to a server-side JavaScript consumer function.
3. WHEN an Event is emitted and a matching Event_Listener is registered, THE Platform SHALL execute the listener's consumer function with the event payload, either synchronously or asynchronously based on the listener configuration.
4. THE Platform SHALL allow Administrators to create Scheduler records in the database with a cron expression, an event name, and optional event data.
5. WHEN a Scheduler's cron expression fires, THE Platform SHALL emit a `SCHEDULER_EXECUTED` event carrying the configured event data, triggering any registered Event_Listeners for that scheduler.
6. THE Platform SHALL allow Administrators to reload Scheduler and Event_Listener definitions from the database at runtime without restarting the application.
7. WHEN an Event_Listener or Scheduler definition is modified in the database, THE Platform SHALL broadcast a reload signal over the Hazelcast_Cluster topic so all cluster nodes pick up the change.

---

### Requirement 18: Custom Integrations — REST API

**User Story:** As an integrator, I want an automatically generated REST API for all application entities, so that I can connect external systems without writing custom endpoints.

#### Acceptance Criteria

1. THE Platform SHALL automatically generate REST API endpoints for all registered entities (both static and Dynamic_Entities) following the URL convention `/api/v1/organization/{orgId}/{entityName}/{id}`.
2. THE REST API SHALL support standard CRUD operations: GET (single and list), POST (create), PUT/PATCH (update), and DELETE.
3. THE REST API SHALL enforce the same Role-Based access control and row-level tenant isolation as the HTML UI.
4. THE REST API SHALL accept and return JSON payloads.
5. THE Platform SHALL authenticate REST API requests using the `X-Auth-Token` header mechanism.
6. THE Platform SHALL provide API documentation for the generated endpoints.

---

### Requirement 19: Custom Integrations — External Application Integrations (Slack, Discord, GitHub, Jira, Trello, Basecamp)

**User Story:** As a developer, I want pre-built integration consumers for popular third-party tools, so that I can trigger actions in those tools from application events.

#### Acceptance Criteria

1. THE Platform SHALL provide a Slack integration that sends outbound notifications to configured Slack channels when triggered by an Event_Listener.
2. THE Platform SHALL provide a Discord integration that sends outbound notifications to configured Discord channels when triggered by an Event_Listener.
3. THE Platform SHALL provide a GitHub integration consumer that creates issues in a configured GitHub repository when triggered by an Event_Listener.
4. THE Platform SHALL provide a Jira integration consumer that creates tickets in a configured Jira project when triggered by an Event_Listener.
5. THE Platform SHALL provide a Trello integration consumer that creates cards in a configured Trello board when triggered by an Event_Listener.
6. THE Platform SHALL provide a Basecamp integration consumer that creates messages or to-dos in a configured Basecamp project when triggered by an Event_Listener.
7. THE Platform SHALL handle inbound webhook payloads by dispatching them to registered server-side JavaScript flows or Java consumers.
8. IF an outbound integration call fails due to a network or API error, THEN THE Platform SHALL log the error with the integration name, target URL, and response status without propagating the failure to the triggering request.

---

### Requirement 20: Custom Integrations — Salesforce, Google, Facebook, LinkedIn Identity Federation

**User Story:** As an Administrator, I want to connect external identity providers for user contact sync and SSO, so that users can authenticate and their contact information can be synchronized automatically.

#### Acceptance Criteria

1. WHERE the Google OAuth2 integration is enabled, THE Platform SHALL allow Users to authenticate using their Google identity and link the Google account to a Platform User record.
2. WHERE the Facebook OAuth2 integration is enabled, THE Platform SHALL allow Users to authenticate using their Facebook identity and link the Facebook account to a Platform User record.
3. WHERE the Salesforce integration is enabled, THE Platform SHALL support contact synchronization between Platform User records and Salesforce contacts.
4. WHERE the LinkedIn integration is enabled, THE Platform SHALL support linking a LinkedIn identity to a Platform User record.

---

### Requirement 21: Scalable Multitenancy — Multiple Organizations

**User Story:** As an Administrator, I want to create and manage multiple Organizations within a single Platform instance, so that different business units or customers are logically isolated from each other.

#### Acceptance Criteria

1. THE Platform SHALL support creating an unlimited number of Organizations within a single database instance.
2. THE Platform SHALL isolate Organization data so that a User in Organization A cannot read or modify data belonging to Organization B unless granted explicit cross-organization privileges.
3. THE Platform SHALL allow each Organization to have its own logo and color palette, applied to pages scoped to that Organization.
4. THE Platform SHALL allow Administrators to assign different Roles and Privileges to Users independently per Organization.
5. WHEN an Organization is created, THE Platform SHALL emit an `ORGANIZATION_CREATED` event on the internal event bus.
6. WHEN an Organization is deleted, THE Platform SHALL emit an `ORGANIZATION_DELETED` event and remove or archive all data associated with that Organization according to the configured retention policy.

---

### Requirement 22: Scalable Multitenancy — Advanced Multi-Tenancy Models

**User Story:** As a platform operator, I want to choose between shared schema, separate schema, and separate database tenancy models, so that I can match the isolation level to the customer's compliance and performance requirements.

#### Acceptance Criteria

1. THE Platform SHALL support a shared-schema tenancy model where all Organizations share a single PostgreSQL schema and tenant isolation is enforced via `organization_id` column filtering at the application layer.
2. WHERE the `is.multitenancy=true` property is set, THE Platform SHALL support a multi-schema tenancy model where each Organization receives a dedicated PostgreSQL schema named `org_{organizationId}`.
3. WHEN a new Organization is created in multi-schema mode, THE Platform SHALL execute `CREATE SCHEMA org_{organizationId}` and replicate all tenanted table structures into the new schema.
4. THE Platform SHALL support a multi-database tenancy model that routes database connections to separate PostgreSQL instances per Organization using a dynamic datasource router.
5. WHEN a request arrives, THE Platform SHALL set the active tenant context in a thread-local variable (`TenantResolver`) that Hibernate uses to resolve the correct schema or datasource for all queries in that request.

---

### Requirement 23: Scalable Multitenancy — Clustering

**User Story:** As a platform operator, I want to run multiple application nodes in a cluster, so that the Platform remains available and scales horizontally under load.

#### Acceptance Criteria

1. THE Platform SHALL replicate user web sessions across all cluster nodes using Hazelcast-backed Spring Session, so that any node can serve any session without sticky routing.
2. WHEN an Administrator modifies a Form definition, Event_Listener, or Scheduler on one cluster node, THE Platform SHALL broadcast a reload signal over the `CLUSTER_EVENT_TOPIC` Hazelcast topic to all other nodes.
3. WHEN a cluster node receives a `CLUSTER_EVENT_TOPIC` reload signal, THE Platform SHALL reload the affected component definitions in memory without requiring a JVM restart on that node.
4. THE Platform SHALL support TCP-IP and multicast discovery modes for Hazelcast cluster formation.
5. THE Platform SHALL support deployment behind a load balancer (NGINX, AWS ALB, or equivalent) with SSL termination.

---

### Requirement 24: Flexible File Management

**User Story:** As a user, I want to attach and retrieve files within the application, so that documents and images are stored alongside the relevant records.

#### Acceptance Criteria

1. THE Platform SHALL support three storage backends for uploaded files: `database` (PostgreSQL LOB), `filesystem` (local disk), and `amazon` (AWS S3), configured via the `StorageType` setting.
2. WHEN a file is uploaded, THE Platform SHALL store the file to the configured storage backend and persist a `File` entity record containing the original filename, MIME type, size, storage path, and associated Organization ID.
3. WHEN a file download is requested, THE Platform SHALL stream the file content from the configured storage backend to the HTTP response, setting appropriate `Content-Type` and `Content-Disposition` headers.
4. THE Platform SHALL enforce access control on file downloads so that only Users with the appropriate Organization membership or Privilege can retrieve a file.
5. THE Platform SHALL support image scaling for uploaded images, producing resized variants at configurable widths.
6. THE Platform SHALL allow file attachments to be associated with Dynamic_Entity records through a file-attachment field type in Form definitions.
7. THE Platform SHALL enforce a configurable maximum file upload size, returning an error if the upload exceeds the limit.

---

### Requirement 25: Import/Export — Data Export to CSV and Excel

**User Story:** As a user, I want to export filtered entity data to CSV or Excel, so that I can analyze it in spreadsheet tools.

#### Acceptance Criteria

1. THE Platform SHALL provide a data export action on all entity list views that downloads the currently displayed (and filtered) records as a CSV file.
2. THE Platform SHALL provide a data export action that downloads Report results as an Excel (`.xlsx`) file.
3. WHEN generating an export file, THE Platform SHALL apply the same row-level security and tenant filters as the corresponding list or report view.
4. THE Platform SHALL include column headers matching the field display labels in all exported files.

---

### Requirement 26: Import/Export — Data Import from CSV and Excel

**User Story:** As an administrator, I want to import records from a CSV or Excel file, so that I can bulk-load data without manual entry.

#### Acceptance Criteria

1. THE Platform SHALL allow Administrators with appropriate privileges to upload a CSV or Excel file to create new records or update existing records for a registered entity.
2. WHEN a CSV/Excel file is uploaded for import, THE Platform SHALL validate each row against the entity's field definitions before committing any records.
3. IF any row in an import file fails validation, THEN THE Platform SHALL report all validation errors (row number and field name) and abort the import transaction without persisting partial data.
4. THE Platform SHALL provide import feedback to the Administrator indicating the number of records created and updated.

---

### Requirement 27: Import/Export — Component Import and Export (ZIP)

**User Story:** As a developer, I want to package and move application components between environments using a ZIP archive, so that I can promote configurations from development to staging to production.

#### Acceptance Criteria

1. THE Platform SHALL allow Administrators to export all application Components (Forms, Frontend_Resources, web endpoints, Event_Listeners, Schedulers, server-side scripts) as YAML manifests bundled in a single ZIP archive.
2. WHEN an Administrator uploads a component ZIP archive via the import endpoint, THE Platform SHALL parse all YAML manifests and upsert the corresponding database records within a single database transaction.
3. WHEN a component import transaction completes, THE Platform SHALL broadcast reload signals over the Hazelcast_Cluster so all nodes pick up the changes.
4. IF the uploaded ZIP archive contains malformed YAML or references entity types that cannot be resolved, THEN THE Platform SHALL reject the import, roll back the transaction, and return a descriptive error log.
5. THE Platform SHALL display an import summary log to the Administrator after a successful import, listing each component that was created or updated.
6. THE Platform SHALL support importing the pre-built application templates (Insurance, Timelog) using the same ZIP import mechanism.

---

### Requirement 28: Import/Export — Maven Project Package Export

**User Story:** As a developer, I want the exported application ZIP to include a ready-to-use Maven project structure, so that I can set up a local Java development environment and extend the application with my IDE.

#### Acceptance Criteria

1. WHEN the Platform generates a component export ZIP archive, THE Platform SHALL include a valid Maven `pom.xml` and source directory structure so the archive can be directly imported as a Maven project in a Java IDE.
2. THE generated Maven project SHALL declare the `openkoda` module as a dependency, inheriting the platform's dependency management.
3. THE Platform SHALL ensure the exported Maven project compiles against the Java 17 language level and Spring Boot 3.x dependency versions used by the running Platform instance.

---

### Requirement 29: Control and Maintenance — Full Audit Trail

**User Story:** As a compliance officer, I want every data change to be automatically recorded, so that I have a complete audit trail of who changed what and when.

#### Acceptance Criteria

1. THE Platform SHALL intercept all entity insert, update, and delete operations via a Hibernate session-scoped interceptor (`PropertyChangeInterceptor`).
2. WHEN an entity is modified, THE Platform SHALL record an Audit_Record containing the entity type, entity ID, a JSON diff of changed properties (old value and new value), the modifying User's ID, the client IP address, and the timestamp.
3. THE Platform SHALL persist Audit_Records in a dedicated `audit` table within the same database transaction as the entity modification.
4. THE Platform SHALL allow Administrators with the `readOrgAudit` privilege to view Audit_Records filtered by entity type, entity ID, User, Organization, and date range.
5. THE Platform SHALL NOT allow Audit_Records to be deleted or modified by any User role, including Administrators.

---

### Requirement 30: Control and Maintenance — Application and Data Backup

**User Story:** As a platform operator, I want the Platform to automatically back up application data, so that I can recover from data loss or system failures.

#### Acceptance Criteria

1. THE Platform SHALL support automated backups triggered by a configured `Scheduler`, with the backup event name set to `backup`.
2. WHEN a backup is triggered, THE Platform SHALL execute a `pg_dump` of the PostgreSQL database and create a compressed (`tar.gz`) archive containing the dump and the application configuration file (`application.properties`).
3. THE Platform SHALL support configurable backup options including `BACKUP_DATABASE` and `BACKUP_PROPERTIES`.
4. WHERE a GPG public key is configured, THE Platform SHALL encrypt the backup archive using GPG before emitting the `BACKUP_CREATED` event.
5. WHEN the backup archive is created, THE Platform SHALL emit a `BACKUP_CREATED` event, allowing Event_Listeners to trigger downstream actions (e.g., copying the file to remote storage via SCP or AWS S3).
6. THE Platform SHALL support secure copy (SCP) transport of backup archives to a remote host, emitting a `BACKUP_FILE_COPIED` event upon success.

---

### Requirement 31: Control and Maintenance — System Health and Logs

**User Story:** As an Administrator, I want to monitor the Platform's runtime health and access application logs, so that I can detect and diagnose issues proactively.

#### Acceptance Criteria

1. THE Platform SHALL expose a system health dashboard showing real-time metrics including JVM heap memory usage, disk storage utilization, active database connection pool counts, and background thread pool status.
2. THE Platform SHALL run periodic background health checks (`SystemHealthAlertJob`) and emit alerts when a monitored metric exceeds a configured threshold.
3. THE Platform SHALL make application log files accessible to Administrators through the admin panel without requiring SSH access to the server.
4. THE Platform SHALL allow Administrators to configure the log level (e.g., DEBUG, INFO, WARN, ERROR) for specific loggers at runtime through the `LogConfigService` without restarting the application.
5. THE Platform SHALL expose a session management view allowing Administrators to see and terminate active user sessions.

---

### Requirement 32: Platform Bootstrap and Lifecycle

**User Story:** As a platform operator, I want the Platform to initialize reliably on startup, so that dynamic entities and database migrations are applied before the application begins serving traffic.

#### Acceptance Criteria

1. WHEN the Platform starts, THE Platform SHALL execute a pre-Spring JDBC migration phase (`JDBCApp`) that applies versioned SQL upgrade scripts from `core_upgrade.sql` before the Spring application context is created.
2. WHEN the pre-Spring phase completes, THE Platform SHALL query all Form and Dynamic_Entity definitions from the database and generate the corresponding Java bytecode classes via ByteBuddy before Hibernate initializes.
3. THE Platform SHALL register all Dynamic_Entity classes with Hibernate's `PersistenceUnitPostProcessor` so they are treated as first-class JPA entities and Spring Data repositories are created for them.
4. WHEN the Spring application context starts, THE Platform SHALL load initial administrator credentials, static Roles, and built-in Privileges from the database via `BasicCustomisationService`.
5. WHEN the Spring application context starts, THE Platform SHALL reconstruct the `global_search_view` PostgreSQL view by querying all registered searchable entities via `SearchViewCreator`.
6. WHEN startup is complete, THE Platform SHALL emit an `APPLICATION_STARTED` event on the internal event bus, carrying the startup timestamp.
7. THE Platform SHALL be ready to accept HTTP traffic on the configured port (default `8080`) after the `APPLICATION_STARTED` event is emitted.

---

### Requirement 33: Global Search

**User Story:** As a user, I want to search across all application data from a single search box, so that I can find any record quickly regardless of its type.

#### Acceptance Criteria

1. THE Platform SHALL maintain a `global_search_view` PostgreSQL view that unions rows from all entities that implement the `SearchableRepository` interface, including both static and Dynamic_Entities.
2. WHEN a User submits a search query, THE Platform SHALL query `global_search_view` using case-insensitive substring matching (`ILIKE`) against the entity's configured search index formula.
3. THE Platform SHALL filter search results to include only records the authenticated User is permitted to read, based on the `required_read_privilege` column in the view.
4. THE Platform SHALL filter search results to include only records belonging to Organizations of which the authenticated User is a member or to which the User holds a global privilege.
5. WHEN search results are returned, THE Platform SHALL include the entity type, a description string, and a deep-link URL (`urlPath`) for each result.
