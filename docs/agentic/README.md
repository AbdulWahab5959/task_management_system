# LaunchStack agentic engineering workflow

## Purpose

The root and scoped `AGENTS.md` files define permanent engineering policy. `docs/agentic/tasks/` holds task-specific requirements, investigation, decisions, plans, review, QA, and evidence. Reference permanent rules instead of copying them into every artifact.

This is the developer/Codex workflow for the existing repository, including use from VS Code. It adds no customer AI capability. Approval and verification gates are policy enforced by the developer and coding agent; automated enforcement, CI, hooks, task-generation scripts, and deployment automation are not part of these phases.

Read [root policy](../../AGENTS.md), the relevant [backend rules](../../backend/AGENTS.md) or [frontend rules](../../frontend/AGENTS.md), and the task's existing artifacts before working. Task artifacts cannot override permanent policy. Follow root policy when code, tests, and documentation conflict.

## Task levels

Classify by the behavior and data at risk, not by file count. Record the level and reason in the requirement and plan. Use the highest applicable level; an isolated bug affecting authentication or payments is still Level 3. If investigation reveals higher risk, update the classification with a dated explanation and satisfy that level's prerequisites before continuing implementation.

| Level | Examples | Required flow |
| --- | --- | --- |
| Level 1 - Small / low risk | Text correction, minor CSS or visual adjustment, obvious isolated low-risk bug, documentation update | Requirement -> implementation -> verification. Artifacts optional. |
| Level 2 - Standard engineering | Multi-file bug, frontend/backend change, ordinary API modification, organization or dashboard feature, non-destructive schema enhancement | `00` -> `01` -> optional `02` -> `03` -> implementation -> `04` -> `05` -> `06`. |
| Level 3 - High risk | Authentication, authorization, tenant isolation, billing, Stripe, subscriptions, payments, migrations affecting important data, infrastructure, deployment, security architecture, future AI providers/tools | `00` -> `01` -> `02` -> `03` -> explicit human approval -> implementation -> `04` -> `05` -> `06`. |

Level 2 requires a specification when observable behavior, API contracts, architecture, or compatibility needs clarification. Otherwise explain why `02-spec.md` is unnecessary in `03-plan.md` under Sources and mark later source lists accordingly. There is no automatic plan-approval gate for ordinary Level 2 work within the user's request. If a developer decision or expanded scope is required, record it and obtain it before the dependent work.

## Task creation

For each new Level 2/3 task, use `docs/agentic/tasks/<task-id>-<short-name>/`. Choose an unused task ID and a short descriptive name. For example, `LS-001-organization-create-bug` illustrates naming only; it is not an existing task.

Create artifacts progressively by copying the corresponding template, renaming it as below, and filling it from evidence available at that stage. Do not pre-create review, QA, or evidence files with expected results. The empty `tasks/` directory is retained by `.gitkeep` until real tasks are added.

| Task filename | Template | When to create |
| --- | --- | --- |
| `00-requirement.md` | [Requirement](templates/requirement.template.md) | Capture the user request and classify the task. |
| `01-investigation.md` | [Investigation](templates/investigation.template.md) | Investigate the recorded requirement against the current repository. |
| `02-spec.md` | [Specification](templates/spec.template.md) | Resolve behavior/contracts after investigation; mandatory for Level 3. |
| `03-plan.md` | [Plan](templates/plan.template.md) | Define implementation and verification from preceding artifacts. |
| `04-review.md` | [Review](templates/review.template.md) | Review the actual implementation and complete diff. |
| `05-qa.md` | [QA](templates/qa.template.md) | Record verification of the implemented change and review findings. |
| `06-evidence.md` | [Evidence](templates/evidence.template.md) | Assemble completion evidence from all applicable prior artifacts and actual verification. |

Keep the required headings. Replace template guidance in a task copy with findings; use `Not applicable - <reason>` for irrelevant areas and `Unknown / Unverified - <reason and next check>` when evidence is missing. List an optional omitted spec as skipped with a reason, not as a broken link or a nonexistent source. Use task-local filenames in Sources and relative links to files that actually exist.

## Working in Codex or Copilot

The developer supplies the requirement, or the path to an existing task directory. Codex/Copilot reads the applicable policy and task history, investigates current code, and prepares the artifacts appropriate to the task level. Read-only investigation is not authorization to implement. For a resumed task, check its recorded status, amendments, approval scope, and current Git state before proceeding; do not restart or silently overwrite earlier work.

Before editing, inspect `git status`, `git diff`, and `git diff --cached`. Record the branch, base revision, existing staged/unstaged changes, and untracked files in the investigation. Keep unrelated user work distinguishable throughout implementation and review. A task directory does not isolate a branch or worktree.

The developer approves requirements and decisions outside the original scope, approves Level 3 plans, and decides whether to commit, open a PR, or release. Codex can prepare and verify the work; a readiness recommendation does not authorize staging, committing, pushing, deployment, or destructive operations.

## Artifact dependencies

```text
User requirement
  -> 00-requirement
  -> 01-investigation (reads 00 and current repository evidence)

00 + 01
  -> 02-spec (required for Level 3; conditional for Level 2)

00 + 01 + applicable 02
  -> 03-plan
  -> Level 3: explicit developer approval of this plan revision
  -> implementation

Implementation + actual Git diff + 00 + 01 + applicable 02 + 03
  -> 04-review

Implementation + 04-review + planned acceptance checks
  -> 05-qa

All applicable earlier artifacts + actual verification
  -> 06-evidence
```

For Level 2 without a spec: `00 + 01 -> 03-plan -> implementation`. Record `Approval Required: NO` when no developer decision is outstanding; do not fabricate an `APPROVED` status to pass an inapplicable gate.

For Level 3: `03-plan APPROVED -> implementation`. Approval must satisfy the following gate, not just be a word in a generated file.

## Human approval gates

Explicit developer approval is required before Level 3 implementation. High-risk areas include authentication, authorization, tenant isolation, Stripe, billing, subscriptions, payments, important database migrations, destructive operations, production deployment, security architecture, secret handling, major infrastructure, and future AI tools/providers. Read-only investigation of these areas may proceed; executing a migration, deployment, or a test against important data is not read-only investigation.

Codex may create `00`, `01`, `02`, and `03`, then must stop before implementation and present the concrete plan for developer approval. A request to investigate, an agent recommendation, silence, or an automatically filled template is not approval of the plan. Existing explicit developer approval can be recorded without asking again only if it actually covers the current plan and its revision.

In `03-plan.md`, record `Approval Required: YES` and `Approval Status: PENDING` until the developer approves. To proceed, record `Approval Status: APPROVED`, the developer's identity, approval date, plan revision, and a traceable source such as a conversation message reference or a short accurate quotation with date. Codex records the decision; it cannot approve its own plan. Rejection remains `REJECTED` until the developer explicitly approves a revised plan.

Approval is limited to the documented scope and operations. Material changes to scope, behavior, architecture, risk, or affected high-risk operations require a new plan revision, a retained record of the previous decision, `Approval Status: PENDING`, and renewed approval before implementing the changed work. Level 2 recommendations outside the request also require a developer decision; risk escalation makes the full Level 3 gate mandatory. Routine steps already covered by approval do not need repeated approval.

## Artifact immutability and history

Earlier artifacts are authoritative history of what was requested, observed, and decided. Do not silently rewrite them to make a later implementation appear compliant. Preserve the original requirement and add amendments using:

```text
## Requirement Amendment

Date:
Requested By:
Change:
Reason:
```

Also link the decision source and affected acceptance criteria. If requirements or findings change, append a dated correction/amendment, describe its effect on the spec and plan, and retain previous decisions. Use a plan revision label/date to tie approval to a specific scope, even before a commit exists.

Classify investigation statements explicitly:

| Label | Meaning |
| --- | --- |
| FACT | Directly observed behavior with a file, test, command, or other verifiable source. |
| INFERENCE | A conclusion drawn from stated evidence, with uncertainty identified. |
| RECOMMENDATION | A proposed change, not an approved requirement or architecture decision. |
| REQUIRES APPROVAL | A concrete decision that the developer must resolve before dependent work. |

Recommendations become approved scope only through a recorded developer decision. A blank Approved Behavior section or an agent-authored approval field grants no authority. Reference policy and safely summarize requests; redact sensitive material rather than copying credentials, private customer data, raw provider responses, or secret-bearing logs into versioned artifacts.

## Review, QA, and evidence

Review the complete task diff against the requirement, investigation, applicable spec, and plan (including approval when required). Inspect staged and unstaged diffs and the contents of new untracked files, which normal `git diff` omits. When resuming across commits, identify the task's base revision so committed task changes are included. Separate pre-existing unrelated changes using the investigation baseline; do not discard them.

Use `READY FOR QA` or `CHANGES REQUIRED` in review. Record issues with severity, source, impact, and required action. A self-review is not an independent human approval; state who performed the review. After fixes, update the findings and rerun affected checks. Do not hide failed attempts when recording a successful rerun.

Use verification commands from applicable `AGENTS.md` and current package/config files. Record the working directory, exact command, time, exit status, observed result, and limitations. Use `NOT RUN` or `BLOCKED` for unexecuted checks. Documentation-only work may use diff, link, policy-preservation, and ignore-rule checks; application tests are unnecessary unless application behavior changes.

QA is `PASS` only when all required acceptance checks actually pass, `FAIL` for unresolved failures, and `PARTIAL` for incomplete or blocked required verification. A skipped irrelevant check needs a reason. Do not claim a historical documented test baseline as a current result.

Evidence links the implementation, review, QA, and actual verification. It records file changes, coverage of acceptance criteria, remaining risks, unrelated work, and rollback readiness. `READY TO COMMIT` or `READY FOR PR` is a recommendation only; use `NOT READY` while required approvals, fixes, or verification remain outstanding. Never fabricate command output, test results, screenshots, or approvals.

## Version-control scope

The root `.gitignore` permits the three project `AGENTS.md` files, `.github/copilot-instructions.md`, the root `README.md`, `ROADMAP.md`, `PROGRESS.md`, and Markdown under `docs/agentic/`. Other Markdown, generated PDFs, environment files, local skills, and existing generated-output exclusions keep their current ignore behavior. `.gitkeep` retains the task directory without a fake task.

Permitting a file does not stage or commit it. Review the intended files explicitly before any separately authorized commit. Existing references to other local documentation may be unavailable in a fresh clone while those files remain ignored; report a missing source and inspect the working code/tests rather than inventing its contents. Decide any broader documentation publication separately.
