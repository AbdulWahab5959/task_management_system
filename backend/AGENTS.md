# Backend rules

Laravel is the trusted execution layer. Controllers authenticate and validate, then delegate business logic to services. Keep tenant access checks before tenant-connection use.

For organization-scoped work, resolve the authenticated user through Sanctum, verify organization membership/status/role, and ignore client-supplied ownership or billing identifiers. Preserve controlled API errors and never leak internals.

For billing or Stripe, backend owns plan/price selection, limits, checkout, activation, webhook signatures, idempotency, and ownership. Use transactions and safe cleanup for central organization creation and tenant provisioning. Never run destructive migrations without authorization.

For explicitly requested AI-agent work: use bounded provider calls and allowlisted, schema-validated server tools. The model may select a tool and arguments only; it never executes PHP, SQL, shell commands, arbitrary URLs, or class names. Default to read-only tools. Keep `GEMINI_API_KEY` server-side, log safe metadata only, and use HTTP fakes in tests.

## Product capability benchmark

Botpress is the external capability benchmark for LaunchStack’s future agent product: <https://botpress.com/>. Do not add chatbot runtime, AI providers, RAG, automation, or metering unless the task explicitly requests it. When requested, implement the work as a complete vertical slice rather than a placeholder UI.

The first agent slice must establish organization-owned agents, versioned configuration, bounded model/provider calls, knowledge-source ingestion, conversation persistence, preview/test execution, publish/deploy state, and a safe embed/API contract. Each operation must resolve the authenticated user and organization before tenant-connection use, enforce plan entitlements and usage atomically, and emit auditable events.

Future knowledge and runtime work must include ingestion status/retries, source deletion, retrieval citations, prompt-injection defenses, tool allowlists, timeouts, abuse throttles, retention controls, provider-cost ceilings, and HTTP-fake coverage. Customer chatbot conversations and human handoff must remain separate from the platform support inbox.

Future commercial metering must define the measured unit, period, quota behavior at 80% and 100%, hard-stop/overage policy, idempotency, reconciliation, and safe failure behavior before code is merged. The current customer plan policy is one active organization per plan; other entitlements and quotas remain plan-specific.

Relevant commands: `php artisan test`; `npm.cmd run build`.

When working from `docs/agentic/tasks/<task-id>-<short-name>/`, read the relevant task artifacts before modifying backend code. Follow the task levels and approval gates in [the workflow guide](../docs/agentic/README.md); these backend rules continue to apply.
