# NEXT PROMPT

## Current Task

LS-001 Website Performance Audit

## Current Status

Phase 1 is committed and the production-preview dashboard evidence is complete.

- Commit: `8ad9a05 Implement Phase 1 frontend performance improvements`.
- The commit contains the three reviewed frontend changes and LS-001 documentation artifacts.
- The authenticated production-preview Lighthouse test for `http://localhost:4173/dashboard` had no warnings: FCP 0.5 s, LCP 1.6 s, Speed Index 2.0 s, TBT 0 ms, Interactive 1.6 s.
- `/api/auth/me`, `/api/tenants`, and `/api/tenant/dashboard/summary` each showed one XHR `200` plus one CORS preflight `204`; no duplicate application requests were observed.
- No support API requests were observed while the support widget was closed.
- Frontend lint and production build previously passed.
- Broader UI regression checks remain incomplete, but the measured performance/request objective passed.
- The working tree was clean when the commit was verified; no push was performed by Codex.

## Recommended Next Action

**F. Start separate backend performance task**

## Why This Is The Next Action

Phase 1 is complete and should not be reopened for additional frontend fixes based on the current evidence. Any remaining backend/API/database performance work is outside this task’s committed frontend scope and should begin as a separately scoped task with its own investigation, measurements, authorization, and risk review.

## Ready-To-Copy Codex Prompt

```text
Start a separate backend performance task related to LS-001.

Do not modify the LS-001 Phase 1 frontend implementation. Read the LS-001 artifacts first, especially 01-investigation.md, 02-spec.md, 03-plan.md, 06-qa.md, 07-evidence.md, and 08-lighthouse-followup.md, plus AGENTS.md, backend/AGENTS.md, and docs/agentic/README.md.

Create a new Level 2 task artifact folder with a new task ID. Investigate backend/API/database performance candidates only through safe, read-only measurements and source inspection. Prioritize /api/tenant/dashboard/summary, /api/tenants, billing summary overlap, and unbounded support history. Do not implement fixes in this task. Do not change application code, backend code, database code, migrations, routes, API contracts, configuration, or infrastructure. Do not run migrations, destructive commands, commit, or push.

Document FACT, INFERENCE, RECOMMENDATION, and REQUIRES APPROVAL separately. Do not expose secrets, credentials, SQL dumps, raw provider responses, stack traces, or private data. Any query rewrite, cache, pagination contract, index, schema, or authorization-related change requires measured evidence and explicit approval before implementation.

Stop and ask for approval before expanding scope, changing LS-001 artifacts, or implementing any fix.

Final response format:

1. Summary
2. New task folder and artifacts
3. Measurements and findings
4. Risks and unknowns
5. Recommended next action
6. Git status summary
7. Safety confirmation
```

## Stop Conditions

Codex must stop before starting the separate backend task if a new task ID/folder is ambiguous, if measurements require destructive or production-data operations, or if implementation scope expands beyond read-only investigation and documentation. Codex must ask for approval before changing LS-001 artifacts, modifying code, adding migrations/indexes, changing API contracts, or touching authentication, billing, or tenant isolation.

## After Codex Finishes

Confirm the new task is separate from LS-001, review its investigation measurements and risk classification, and verify that no application or database files changed. Then copy the next prompt from the updated `## Ready-To-Copy Codex Prompt` section in `NEXT-PROMPT.md`.
