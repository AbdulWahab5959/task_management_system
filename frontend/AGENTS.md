# Frontend rules

React is the presentation layer. Use existing router, API client, auth context, organization context, and typed service patterns. The backend remains the source of truth for authorization, billing, limits, and action results.

Only public `VITE_*` configuration belongs in Vite. Never expose provider keys, backend exceptions, secrets, or raw model HTML. Render model content as text and treat tool activity as status, not proof of success.

Preserve responsive dashboard behavior and loading, empty, retry, unauthorized, validation, rate-limit, and provider-error states. Disable duplicate submits and make retries safe. Do not send client-selected ownership, payment, subscription, or tenant identifiers as authorization. Keep support chat separate from AI agents unless explicitly connected by an API contract.

Run `npm.cmd run lint` and `npm.cmd run build` for frontend changes.

## Product and UX benchmark

Use Botpress as a product capability reference, not as a visual copy target: <https://botpress.com/>. LaunchStack’s current shipped surfaces are SaaS foundation, organizations, billing, support, administration, and entitlement management. The public chatbot page must not imply that a builder, runtime, knowledge base, deployment flow, or agent analytics is already available while those capabilities remain roadmap work.

When agent features are explicitly requested, design the user journey around a concrete first success: configure an agent, add a source, test a conversation, publish it, and copy a safe preview/embed/API result. Keep each state visible and honest with loading, empty, validation, unauthorized, rate-limit, provider-error, quota, and published/unpublished states.

Pricing and plan surfaces must read server-provided feature and limit data consistently. Show the one-organization allowance once, then distinguish it from usage quotas such as storage, monthly messages, API requests, and team seats. Do not duplicate the same limit as both a feature bullet and a separate capacity block.

For future agent UI, provide separate areas for building, knowledge, testing, deployment, conversations/handoff, analytics, integrations, and settings. Do not present the platform support inbox as chatbot human handoff. All organization-scoped views must use the existing tenant context and typed API services; React may display server decisions but never authorize plan access locally.

Every new product surface needs a measurable activation goal, responsive keyboard-accessible interaction, clear upgrade/quota messaging, and matching backend/API documentation. Prefer a complete narrow workflow over several disconnected “coming soon” panels.

When working from `docs/agentic/tasks/<task-id>-<short-name>/`, read the relevant task artifacts before modifying frontend code. Follow the task levels and approval gates in [the workflow guide](../docs/agentic/README.md); these frontend rules continue to apply.
