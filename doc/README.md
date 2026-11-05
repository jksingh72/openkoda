# Openkoda Architecture & System Documentation

Welcome to the Openkoda platform architectural documentation suite. This folder contains a comprehensive reference architecture, subsystem breakdowns, technical designs, and operational guides.

---

## Documentation Index

| Document | Description |
| :--- | :--- |
| **[REFERENCE_ARCHITECTURE.md](./REFERENCE_ARCHITECTURE.md)** | **Master Reference Architecture Document** covering executive summary, tech stack, modular architecture, ByteBuddy class compilation, Flow monadic pipeline, multi-tenancy models, and developer guides. |
| **[MODULES.md](./MODULES.md)** | **Functional Module Directory** detailing each of the 10 subsystems (Multi-Tenancy, Dynamic Entities, Flow & Scripting, Page Builder, Security, Event Bus, Controllers, Smart Reporting, Integrations, and Component Import/Export). |
| **[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)** | **Technical Design & Low-Level Architecture** detailing the 5-tier architecture, ByteBuddy bytecode compilation, GraalVM polyglot execution, unified search view (`global_search_view`), and Hazelcast clustering. |
| **[OVERALL_FUNCTIONING.md](./OVERALL_FUNCTIONING.md)** | **Overall Functioning & Runtime Lifecycle** detailing the pre-flight bootstrapping sequence (`JDBCApp`), HTTP request pipeline, event bus execution, component migration, and hot-restarting. |

---

## Existing Guides in Repository
For installation, administration, and basic application setup, also refer to:
* **[5-Minute Guide](../openkoda/doc/5-minute-guide.md)**: Quickstart guide to building an application.
* **[Admin Manual](../openkoda/doc/admin.md)**: Platform administrative features, users, and organizations.
* **[Application Development Guide](../openkoda/doc/app-development.md)**: Extending Openkoda with Java and server-side JavaScript.
* **[Installation Manual](../openkoda/doc/installation.md)**: Docker and standalone installation, PostgreSQL configuration, and multi-tenancy setup.
