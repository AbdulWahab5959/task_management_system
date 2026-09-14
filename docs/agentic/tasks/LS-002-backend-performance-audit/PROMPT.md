# PROMPT

## Current Task

LS-002 Backend Performance Audit

## Current Status

LS-002-P1 implementation is complete. The approved cursor-pagination scope was implemented for customer and admin support-history routes, retaining `data` as an array, adding `next_cursor` and `has_more`, enforcing a server-side page-size limit, and preserving authentication, tenant isolation, authorization, billing ownership, and existing messages. Focused and full backend tests passed (153 tests, 758 assertions), PHP lint, frontend lint, and frontend production build passed. Review, QA, and evidence are recorded in `04-review.md`, `05-qa.md`, and `06-evidence.md`. QA is PARTIAL because manual UI/responsive pagination checks are blocked by unavailable browser access. No database migration, cache, index, or unrelated optimization was added.

## Recommended Next Action

Complete the remaining LS-002 QA and evidence checks. Do not implement additional fixes or commit.

## Ready-To-Copy Codex Prompt

```text
Continue task:

docs/agentic/tasks/LS-002-backend-performance-audit/

Read first:

- docs/agentic/tasks/LS-002-backend-performance-audit/00-requirement.md
- docs/agentic/tasks/LS-002-backend-performance-audit/01-investigation.md
- docs/agentic/tasks/LS-002-backend-performance-audit/PROMPT.md
- AGENTS.md
- backend/AGENTS.md
- docs/agentic/README.md

Read `01-investigation.md`, `02-spec.md`, `03-plan.md`, `04-review.md`, `05-qa.md`, and `06-evidence.md` before verifying the completed implementation.

Run only safe, relevant QA: review the actual diff; verify manual customer/admin pagination behavior in a production-like local frontend; verify loading older messages, chronological order, no duplicates, scroll preservation, organization switching, retry, end-of-history, and responsive behavior. Run the full backend test suite only if it does not require production/private data or destructive database operations.

- do not alter application code;
- do not use production/private data;
- do not run migrations or database writes;
- update only `05-qa.md`, `06-evidence.md`, and `PROMPT.md` with actual results.

Do not implement any change. Do not connect to `saas_system` or open unverified tenant SQLite files.

Do not capture credentials, bearer tokens, raw SQL, bindings, response bodies, customer text, payment data, private logs, or production data.

Update only:

- docs/agentic/tasks/LS-002-backend-performance-audit/01-investigation.md
- docs/agentic/tasks/LS-002-backend-performance-audit/PROMPT.md

Do not modify LS-001 artifacts. Do not modify frontend, backend, API, database schema, migrations, routes, configuration, cache, or infrastructure code. Do not implement fixes, reset/truncate data, commit, or push.

If QA requires a code change, database migration/write, production/private data, or any material API/security/tenant/billing scope change, stop and report the blocker.

Final response format:

1. Summary
2. QA checks performed
3. Results and limitations
4. Files updated
5. Git status summary
6. Safety confirmation
```

## Stop Conditions

Stop before changing code, database schema, adding migrations/cache/indexes, changing authorization/billing/tenant isolation, using private or production data, committing, or pushing. Stop if manual verification cannot be performed safely.

## After Codex Finishes

Review `05-qa.md` and `06-evidence.md`, confirm manual checks and limitations are accurately recorded, and do not commit until QA is complete and the evidence recommendation changes from NOT READY.
