# Prompt 2: Business Understanding Analysis

```markdown
BUSINESS UNDERSTANDING — REQUIRED FIRST DELIVERABLE

In addition to the technical architecture analysis, produce a standalone
document named business-understanding.md.

Audience:
Business owners, product managers, business analysts, operational users,
and new team members who need to understand the application without
reading source code.

Primary goal:
Explain what the application does for the business—not merely how
the software is implemented.

Use plain language. Avoid framework names, class names, database table
names, and other implementation details in the main narrative.
Place supporting code references in a separate evidence appendix.

ANALYSIS APPROACH

Inspect available evidence, including:
- README files and product documentation.
- User-facing screens, labels, navigation, and help text.
- Routes and user actions.
- Workflows, use cases, and business services.
- Business rules, calculations, validations, and permissions.
- Data models and state transitions.
- Reports, dashboards, notifications, and exports.
- Tests and example scenarios.
- Integration contracts and configuration, without exposing secrets.

Do not infer the business solely from entity or directory names.
Cross-check important conclusions against multiple relevant artifacts
where possible.

DOCUMENT STRUCTURE

1. APPLICATION PURPOSE

Explain:
- What business problem does the application address?
- What activities does it enable?
- Who appears to benefit from it?
- What is inside and outside its apparent scope?

Separate purpose explicitly stated in documentation from purpose inferred
from implementation.

Do not invent revenue models, business strategy, customer segments,
measured benefits, or commercial outcomes.

2. USERS AND ROLES

Identify supported roles and explain:
- Who the role represents.
- What they are trying to accomplish.
- Which actions they can perform.
- Which restrictions or approvals apply.

Distinguish an explicitly implemented role from an inferred user persona.

3. BUSINESS CAPABILITIES

Group functionality into business-oriented capabilities rather than
technical modules.

For each capability, explain:
- What it enables.
- Who uses it.
- What starts the process.
- The main information required.
- The expected outcome.
- Important dependencies on other capabilities.

Use business-friendly names such as "Manage applications" or
"Approve payments" only when supported by the repository.

4. MAIN USER JOURNEYS AND BUSINESS PROCESSES

Describe the most important end-to-end processes.

For each process, include:
- Trigger.
- Participating roles.
- Preconditions.
- Main steps in plain language.
- Decisions and approval points.
- Alternative paths and failures.
- Final outcome.
- Notifications or external handoffs.

Where useful, provide a simple Mermaid flowchart using business terms.

Clearly distinguish:
- Behavior implemented in the code.
- Behavior described only in documentation.
- Behavior that remains uncertain.

Do not assume that every implemented feature is enabled in production.

5. BUSINESS RULES AND POLICIES

Identify meaningful rules such as:
- Eligibility criteria.
- Required approvals.
- Pricing or fee calculations.
- Limits and thresholds.
- Deadlines and expiry.
- Allowed and prohibited actions.
- Ownership and access restrictions.
- Cancellation and reversal conditions.

For each rule, include:
Rule | When it applies | Business effect | Evidence status

Distinguish:
- Business policy.
- Technical input validation.
- Configurable behavior.
- Example or test-only behavior.

Preserve exact thresholds or formulas when supported by evidence.
Do not expose sensitive configuration values.

6. IMPORTANT BUSINESS INFORMATION

Explain key business concepts in plain language:
- What each concept represents.
- How concepts relate.
- Who creates or updates them.
- Their lifecycle or status changes.

Do not simply reproduce the database schema.

7. OUTPUTS AND BUSINESS VISIBILITY

Describe:
- Reports and dashboards.
- Notifications and alerts.
- Documents, exports, and receipts.
- What each output helps a user understand or decide.

Do not claim that a metric is actively monitored or used by the business
unless evidence establishes that.

8. EXTERNAL BUSINESS INTERACTIONS

Explain interactions with external parties or systems:
- Why the interaction exists.
- What information is exchanged.
- What business process depends on it.
- What happens when it fails, if identifiable.

Distinguish a configured integration from a placeholder or unused adapter.

9. BUSINESS IMPACT AND RISKS

Explain evidence-backed consequences in business terms, such as:
- A process can become blocked.
- Users may need manual intervention.
- Different paths appear to apply inconsistent rules.
- A failed handoff may delay completion.

Do not invent financial losses, legal obligations, regulatory violations,
or operational incident histories.

Separate observed behavior from potential risk.

10. OPEN BUSINESS QUESTIONS

List questions that code inspection cannot resolve.

For each question, provide:
- What is not known.
- What evidence was inspected.
- Why the answer matters.
- Who could likely confirm it.
- What documentation or observation would resolve it.

Use plain-language labels:
- Confirmed: directly supported by inspected evidence.
- Inferred: plausible, with supporting but incomplete evidence.
- Needs confirmation: evidence is missing or ambiguous.

11. BUSINESS GLOSSARY

Define application-specific business terms, statuses, abbreviations,
and role names.

Do not invent definitions for ambiguous terms.

12. EVIDENCE APPENDIX

Map major business claims to:
- File paths.
- Relevant symbols or sections.
- Line ranges where available.
- Any conflicting evidence.
- Evidence status.

Keep this appendix separate so the main document remains readable
for nontechnical stakeholders.

QUALITY CHECK

Before completing the document, verify:
- It explains business purpose, not just software structure.
- Features are described as user or business outcomes.
- Major claims are traceable to evidence.
- Inferences are clearly labeled.
- Unknown information is not presented as fact.
- Technical detail is confined mainly to the evidence appendix.
- Business intent is not assumed to be identical to implemented behavior.

DELIVERY ORDER

Present the deliverables in this order:
1. business-understanding.md
2. analysis-summary.md
3. architecture-report.md
4. architecture-diagrams.md
5. component-catalog.json

In the final response, summarize the business understanding first,
then the technical architecture.

Ignore the webfolder
```

