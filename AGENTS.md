# LaunchStack agent instructions

This is the compact source of truth for Codex, Copilot, and Cline. Rules closest to the edited file add to these rules; they do not replace them. Read detailed docs only when the task needs them.

## Non-negotiables

- Inspect current code, migrations, tests, routes, and config before editing. Preserve unrelated work and make the smallest compatible change.
- Never expose secrets, credentials, SQL, filesystem paths, stack traces, prompts, or raw provider responses. Never commit `.env` files or keys.
- Server-side auth is mandatory. Never authorize from client-supplied `user_id`, `owner_id`, `tenant_id`, `subscription_id`, `payment_id`, or selected organization.
- Organization access must be checked before tenant-connection use. Reject cross-organization access; verify status and role where required.
- Billing belongs to the authenticated user. Backend owns prices, limits, checkout, activation, and webhook verification. React only displays server results.
- Use `plans.limits.organizations`; count active organizations owned by the user only. Do not silently delete organizations on downgrade.
- Do not add chatbot runtime, AI providers, RAG, automation, metering, or unrelated refactors unless explicitly requested.
- Do not run `php artisan migrate:fresh` or `php artisan db:wipe` without explicit authorization. Do not commit, push, or reset unless asked.

## Product benchmark and truthfulness

- Use the Botpress platform as a capability benchmark, not as a branding or implementation template: <https://botpress.com/>.
- LaunchStack currently provides SaaS infrastructure, organizations, billing, support, administration, and entitlement foundations. Do not describe it as a complete AI-agent platform until the agent builder, runtime, knowledge, preview, deployment, and customer handoff path is shipped and tested.
- When chatbot work is explicitly requested, deliver one complete vertical slice first: create/configure an agent, add knowledge, test a conversation, publish it, and expose a safe embed or API path.
- Every customer-facing capability must define its backend contract, organization-scoped authorization, plan entitlement and usage behavior, loading/empty/error states, automated tests, documentation, and activation metric.
- Keep platform support conversations distinct from customer chatbot conversations and human handoff.
- Keep the one-organization-per-customer-plan policy. Plan differences should be expressed through server-owned capabilities, storage, message/API usage, team seats, support level, analytics, and automation entitlements.

## Commands

- Backend tests: `cd backend; php artisan test`
- Frontend checks: `cd frontend; npm.cmd run lint; npm.cmd run build`
- Backend build: `cd backend; npm.cmd run build`

Run the narrowest relevant check after editing and report the exact result. Do not claim an unrun check passed.

## Scope and references

- Backend rules: `backend/AGENTS.md`
- Frontend rules: `frontend/AGENTS.md`
- Auth and roles: `docs/AUTHORIZATION-AND-ROLES.md`
- Organizations and limits: `docs/ORGANIZATION-MANAGEMENT.md` and `docs/BUSINESS-RULES.md`
- Billing and plans: `docs/BILLING-AND-SUBSCRIPTIONS.md` and `docs/PLANS-AND-ENTITLEMENTS.md`
- Security: `docs/SECURITY-REVIEW.md`
- API contracts: `API_ENDPOINTS.md` and `docs/API-REFERENCE.md`

When documentation conflicts, preserve working code and tests, identify the conflict, and ask before changing architecture or ownership.

## Task-artifact workflow

- Classify the task using [docs/agentic/README.md](docs/agentic/README.md). Level 1 changes may use requirement, implementation, and verification without artifacts.
- For Level 2 and Level 3 tasks, create and read the relevant `docs/agentic/tasks/<task-id>-<short-name>/` artifacts progressively before implementation. Permanent policy remains in the root and scoped `AGENTS.md` files.
- Preserve earlier artifacts as authoritative history. Record requirement amendments; never turn investigation recommendations into requirements or approved architecture without developer approval.
- For Level 3, complete requirement, investigation, specification, and plan, then stop before implementation until the developer explicitly approves that plan. Record `Approval Status: APPROVED` in `03-plan.md`, with the approver, date, plan revision, and approval source. Never fabricate approval; material plan changes require renewed approval.
- After implementation, record review against the actual diff, QA with actual results, and completion evidence. See the workflow guide for dependencies and the Level 2 specification exception.
