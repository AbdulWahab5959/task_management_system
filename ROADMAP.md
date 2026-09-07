# Roadmap

## Immediate stabilization

1. Finish responsive QA at common desktop and mobile sizes.
2. Verify support-chat loading, error, keyboard, realtime-fallback, and touch states.
3. Run the complete backend and frontend checks.
4. Verify migrations on a fresh test database.
5. Publish production/deployment, backup, monitoring, and error-reporting documentation.

## Audit-driven production readiness

These priorities were added after the September 2026 system audit. Complete them in order and verify each item with automated tests and browser-based QA where applicable.

### P0 — Core product and security blockers

- Implement the first complete chatbot customer workflow: chatbot configuration, knowledge/content management, conversations, deployment/embed flow, analytics, and plan-based entitlement enforcement.
- Define and enforce the email-verification policy consistently at the API level for billing, organization creation, support, and other business-critical actions.
- Harden browser authentication by replacing localStorage bearer tokens with secure HttpOnly Sanctum cookies where practical; otherwise add token expiry, revocation, strict CSP, and a complete XSS review.
- Complete two-factor authentication hardening, including atomic TOTP replay prevention, atomic recovery-code consumption, re-authentication for security changes, and dedicated feature tests.

### P1 — Billing and operational reliability

- Add a complete customer billing portal with payment-method management, receipts, cancellation/resume flows, failed-payment recovery, and clear downgrade/over-limit behavior.
- Add tax/VAT support, legally compliant invoices, refund policy handling, and provider reconciliation workflows.
- Restrict invoice PDF fetching to trusted provider URLs or replace external URL fetching with a secure provider/API or private storage flow.
- Add production backups, monitoring, alerting, error reporting, webhook failure visibility, queue/worker health checks, and incident-response documentation.

### P2 — Product quality and growth

- Add customer-facing usage analytics and the metrics required to measure activation, conversion, MRR, churn, retention, refunds, CAC, and LTV.
- Improve onboarding around the customer outcome, including guided setup, successful first-use milestones, upgrade prompts, and recovery states.
- Add granular permissions, ownership transfer, organization lifecycle policies, audit history, and enterprise team controls such as SSO/SCIM when commercially justified.
- Complete browser and mobile UX QA, including keyboard navigation, focus trapping and Escape handling for dialogs, screen-reader labels, contrast, touch states, and responsive layouts.
- Add real product screenshots, demos, customer proof, support SLAs, and accurate pricing/product messaging before launch.

### P3 — Launch and commercial readiness

- Publish deployment, security, privacy, terms, cancellation, refund, data-retention, backup, and incident-response documentation.
- Run an OWASP ASVS-aligned security review and penetration test before handling production customer data at scale.
- Verify fresh-database migrations, deployment rollback procedures, monitoring alerts, Stripe test/live configuration, and disaster recovery.
- Define launch gates: no critical/high security findings, core chatbot workflow complete, billing reconciliation verified, accessibility QA complete, and measurable activation and retention instrumentation live.

## Botpress benchmark comparison

This benchmark uses Botpress public product and documentation pages reviewed in September 2026. It is a product-gap analysis, not a request to copy Botpress branding, pricing, or implementation.

### Current LaunchStack strengths

- Secure SaaS foundation: authentication, email verification, password recovery, user settings, protected routes, and two-factor authentication foundations.
- Organization foundation: one organization per plan, memberships, invitations, roles, permissions, tenant isolation, lifecycle actions, and audit logging.
- Account billing foundation: user-owned subscriptions and payments, Stripe checkout/webhooks, invoices, plan limits, entitlements, usage records, downgrade protection, and one-organization enforcement.
- Support foundation: FAQ flows, customer support conversations, admin inbox, notifications, and realtime fallback behavior.
- Administration foundation: users, plans, subscriptions, payments, refunds, activity logs, and platform analytics.

### Major gaps against a complete agent platform

| Capability | Botpress benchmark | LaunchStack status | Roadmap priority |
| --- | --- | --- | --- |
| Agent builder | Visual drag-and-drop Studio with workflows, nodes, cards, emulator, and custom code | No shipped chatbot builder or runtime; public chatbot page is marked future | P0 |
| Knowledge | Website ingestion, document uploads, tables, searchable knowledge bases, resync, and storage visibility | No shipped knowledge-base ingestion, indexing, retrieval, or vector-storage product flow | P0 |
| Test and deploy | Conversation emulator, shareable preview, webchat embed, channels, API, and versioned deployment | No agent preview, embed/deployment flow, channel management, or chatbot API | P0 |
| Operate conversations | Human handoff, unified inbox, assignment, escalation triggers, and preserved context | Existing support inbox is platform support, not customer chatbot handoff | P1 |
| Agent analytics | Conversation/session analytics, event logs, error monitoring, custom dashboards, and AI-spend visibility | Admin business analytics exists; agent-level runtime analytics does not | P1 |
| Collaboration | RBAC, simultaneous Studio collaboration, bot access controls, import/export, and staging/production separation | Organization roles and permissions exist; collaborative builder and environments do not | P1 |
| Integrations | Channels, external services, API/SDK, custom integrations, and backup model strategies | General API foundation exists; no chatbot integration catalog or SDK contract | P1 |
| Commercial model | Free entry point, usage-based AI spend, hard spend caps, add-ons, plan comparison, and managed services | Fixed plans and quotas exist; AI cost ledger, add-ons, spend caps, and managed offering do not | P1/P2 |
| Developer experience | Quickstart that builds, tests, and deploys an agent with extensive product documentation | General API documentation exists but contains stale route claims and no chatbot quickstart | P1 |
| Activation UX | Fast first-agent setup, guided onboarding, shareable result, and clear upgrade path | Organization/billing onboarding exists; first successful chatbot outcome is not shipped | P0 |

### Ordered benchmark roadmap

1. **P0: Ship one complete agent path.** Create an organization-owned agent, configure instructions, add a small knowledge source, preview a conversation, publish it, and provide a safe embed/API endpoint. Do not expose the surface as complete until this path works end to end.
2. **P0: Build knowledge foundations.** Add files, URLs, structured records, ingestion status, indexing/retry jobs, source deletion, retrieval citations, storage accounting, and organization-scoped authorization.
3. **P0: Add runtime safety.** Add provider abstraction, model timeouts, retries, content limits, prompt-injection defenses, tool allowlists, secret isolation, conversation retention, abuse throttles, and cost ceilings.
4. **P0: Make usage commercially reliable.** Meter incoming messages, model tokens, storage, API calls, and seats atomically; show current-period usage; warn at 80% and 100%; define hard-stop versus overage behavior; and reconcile provider usage with billing records.
5. **P1: Add customer operations.** Build chatbot-to-human handoff with a unified inbox, assignment, status, escalation rules, preserved transcript context, SLA timestamps, and organization-level permissions. Keep it separate from platform support.
6. **P1: Add deployment and integrations.** Support a versioned publish flow, rollback, shareable preview, web embed customization, API keys/scopes, webhooks, channel adapters, integration health, and a public integration contract.
7. **P1: Add team-grade collaboration.** Add bot-level permissions, concurrent editing or conflict handling, draft/published states, staging/production environments, import/export, and audit events for agent changes.
8. **P1: Add agent analytics.** Track sessions, messages, resolution, fallback, latency, errors, handoffs, source citations, provider/model usage, and cost by organization and agent. Provide exportable reports and retention controls.
9. **P1: Replace the generic onboarding path.** Guide a new user to a working agent in minutes with sample data, a test prompt, a preview link, an embed snippet, and a clear next action. Measure time-to-first-success and activation conversion.
10. **P2: Improve monetization safely.** Add a free trial/free plan policy, annual/monthly comparison, usage add-ons, optional AI spend caps, transparent provider-cost handling, plan comparison, self-serve upgrades, and an enterprise/managed path only after unit economics are measured.
11. **P2: Complete developer documentation.** Publish a chatbot quickstart, API/SDK reference, embed guide, webhook events, authentication/scopes, rate limits, error codes, data retention, security model, and runnable examples. Regenerate `API_ENDPOINTS.md` from the current route list.
12. **P2: Prove production quality.** Add end-to-end browser tests for build, knowledge ingestion, preview, publish, handoff, limits, billing, and deletion; load-test message and ingestion queues; and complete accessibility, security, privacy, backup, and disaster-recovery gates.

### Benchmark product rules

- Never describe LaunchStack as a complete AI-agent platform while the builder, runtime, knowledge, preview, and deployment path is unfinished.
- Treat Botpress as a capability benchmark only. Keep LaunchStack’s own one-organization plan model, pricing decisions, brand, and security architecture.
- Every new customer-facing capability must have a backend contract, organization-scoped authorization, usage/billing behavior, loading/empty/error states, tests, documentation, and a measurable activation outcome.

## Product improvements

- More complete analytics
- Invoice generation
- Granular permissions
- Stronger notification system
- Two-factor authentication
- Better empty states and onboarding
- Automated deployment
- Final branding and content review
- Privacy Policy and Terms of Service review

## AI support, later

Keep the current support chat as the manual/FAQ version. Define the AI scope and safety rules first, then build a server-side controlled MVP, connect it to the existing conversations, add approved knowledge and human handoff, and complete security/cost testing before production use.
