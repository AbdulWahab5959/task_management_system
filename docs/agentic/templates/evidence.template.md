# Completion Evidence

Use this template for `06-evidence.md` at completion review. Base it on applicable earlier artifacts, the actual diff, and actual verification. Do not fabricate results, screenshots, commands, or approvals. Reference safe evidence rather than copying sensitive logs.

## Task

Record task ID, title, level, completion-review date, and author.

## Sources

Reference `00-requirement.md`, `01-investigation.md`, applicable `02-spec.md`, `03-plan.md`, `04-review.md`, and `05-qa.md`. Include real approval sources and verification evidence; explain an omitted Level 2 spec.

## Final Changed Files

List actual task files added, modified, or deleted, and their purpose.

## Git Diff Summary

Record the branch, task base revision, reviewed revision/local state, and diff summary. Include staged, unstaged, and committed task changes plus reviewed untracked files. Do not stage files merely to generate evidence.

## Commands Executed

Record exact commands, working directories, dates, exit statuses, and safe output summaries, or reference the corresponding QA records. Clearly separate unrun recommendations from executed commands.

## Test Results

Summarize actual passes, failures, skipped/blocked checks, and reruns with QA references. Do not report unrun tests as passing.

## Build Results

Record builds actually executed and their results, or NOT RUN with the reason.

## Manual Verification

Reference actual observations and existing screenshots when captured. List incomplete manual checks; never invent evidence.

## Requirement Coverage

Map every acceptance criterion ID to changed behavior and verification evidence. Identify unmet or amended criteria without rewriting the original requirement.

## Database Impact

Record actual schema/data impact, environments affected, migration execution status, and any remaining rollout steps, or None with rationale.

## API Impact

Record actual contract/consumer changes and compatibility impact, or None.

## Security Impact

Record relevant review findings, safeguards verified, outstanding risks, and actual approvals.

## Performance Impact

Record measured results or explicitly unverified concerns; do not invent performance claims.

## Remaining Risks

List unresolved risks, owners or required decisions, and effect on readiness.

## Known Limitations

List unverified environments, missing evidence, intentional exclusions, and incomplete acceptance checks.

## Unrelated Changes

Compare with the investigation baseline. Identify pre-existing or concurrent user work preserved outside this task.

## Rollback Readiness

Describe the reviewed recovery path and whether it was tested. Identify data compatibility, backup, or approval gaps. A written strategy is not proof that restoration was tested.

## Final Recommendation

Not assessed. Select READY TO COMMIT / NOT READY / READY FOR PR with supporting rationale. Required approvals, unresolved blocking findings, or incomplete required verification mean NOT READY. A readiness recommendation is not authorization to commit, push, deploy, or run destructive operations.
