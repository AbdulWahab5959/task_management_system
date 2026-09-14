# NEXT PROMPT

## Current Task

LS-001 Website Performance Audit

## Current Status

The authenticated production-preview dashboard Lighthouse test is complete for `http://localhost:4173/dashboard`.

- Lighthouse warnings: none.
- FCP: 0.5 s; LCP: 1.6 s; Speed Index: 2.0 s; TBT: 0 ms; Interactive: 1.6 s.
- `/api/auth/me`, `/api/tenants`, and `/api/tenant/dashboard/summary` each show one XHR `200` plus one CORS preflight `204`; these are not duplicate application requests.
- No support API requests were observed while the support widget was closed.
- Frontend lint and production build previously passed.
- QA passes for production performance/startup-request checks, while broader UI regression checks remain incomplete.
- No application code has been changed in this documentation follow-up. The existing Phase 1 frontend edits remain uncommitted.

## Recommended Next Action

**E. Commit current Phase 1**

## Why This Is The Next Action

The required production dashboard evidence is now successful and does not show duplicate application requests. No further performance fix is justified. The remaining action is a controlled commit of the already-reviewed Phase 1 frontend changes, but the commit must be explicitly authorized and limited to the intended files.

## Ready-To-Copy Codex Prompt

```text
Continue task:

docs/agentic/tasks/LS-001-website-performance-audit/

The authenticated production-preview Lighthouse test has passed for http://localhost:4173/dashboard:

- No Lighthouse warnings.
- FCP 0.5 s, LCP 1.6 s, Speed Index 2.0 s, TBT 0 ms, Interactive 1.6 s.
- Each of /api/auth/me, /api/tenants, and /api/tenant/dashboard/summary has one XHR 200 and one CORS Preflight 204. Treat the 204 entries as expected preflight traffic, not duplicate application calls.
- No support API requests were observed while the support widget was closed.

Read first:

- docs/agentic/tasks/LS-001-website-performance-audit/00-requirement.md
- docs/agentic/tasks/LS-001-website-performance-audit/01-investigation.md
- docs/agentic/tasks/LS-001-website-performance-audit/02-spec.md
- docs/agentic/tasks/LS-001-website-performance-audit/03-plan.md
- docs/agentic/tasks/LS-001-website-performance-audit/04-baseline.md
- docs/agentic/tasks/LS-001-website-performance-audit/05-review.md
- docs/agentic/tasks/LS-001-website-performance-audit/06-qa.md
- docs/agentic/tasks/LS-001-website-performance-audit/07-evidence.md
- docs/agentic/tasks/LS-001-website-performance-audit/08-lighthouse-followup.md
- docs/agentic/tasks/LS-001-website-performance-audit/NEXT-PROMPT.md
- AGENTS.md
- frontend/AGENTS.md
- backend/AGENTS.md
- docs/agentic/README.md

I explicitly authorize the next action: commit the current reviewed Phase 1 frontend changes.

Before committing:

1. Inspect git status, git diff, git diff --cached, and the complete contents of the task artifacts.
2. Confirm the intended application files are only:
   - frontend/src/context/AuthContext.tsx
   - frontend/src/context/TenantContext.tsx
   - frontend/src/components/support/SupportWidget.tsx
3. Confirm no backend, database, migration, environment, generated, or unrelated files are included.
4. Run git diff --check.
5. Do not rewrite, reset, discard, or modify the application changes.

Commit only the reviewed Phase 1 frontend changes and the LS-001 documentation artifacts that are intentionally part of this task. Do not push. Do not implement any additional performance fixes. Do not change backend code, database code, migrations, routes, API contracts, configuration, or infrastructure. Do not expose secrets, tokens, raw provider responses, or stack traces.

If the diff contains unexpected files, if the intended scope is ambiguous, or if a required check fails, stop before committing and report the blocker. Ask for approval again if the commit scope must expand or any code change is proposed.

After the commit attempt, update only the relevant LS-001 documentation artifacts, including NEXT-PROMPT.md, with the actual result. Do not claim a commit succeeded without the actual commit output and final git status.

Final response format:

1. Summary
2. Files committed
3. Commit hash and exact result
4. Checks run and results
5. Remaining UI regression limitations
6. Git status summary
7. Safety confirmation
```

## Stop Conditions

Codex must stop before committing if the working-tree diff includes unexpected application, backend, database, migration, environment, generated, or unrelated files; if the intended commit scope is ambiguous; if `git diff --check` fails; or if any required verification fails. Codex must stop and ask for approval before making any code fix, expanding commit scope, pushing, or changing backend/database/authentication/tenant-isolation behavior.

## After Codex Finishes

Check the reported commit hash, inspect the final Git status, confirm no unintended files were committed, and verify that no push occurred. Then copy the next prompt from the updated `## Ready-To-Copy Codex Prompt` section in `NEXT-PROMPT.md`.
