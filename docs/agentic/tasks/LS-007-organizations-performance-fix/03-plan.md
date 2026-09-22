# Plan: Organizations page consistency and loading performance

## Scope

Level 2 frontend change. Keep API contracts and authorization unchanged.

## Implementation steps

1. Use shared card/button patterns for organization selection and creation.
2. Stabilize snapshot card dimensions and the first loading render.
3. Remove unnecessary initial settings and plan-list requests; load them only for editing or the plan-limit flow.
4. Add small in-flight request reuse for summary and current billing, and remove the duplicate tenant refresh after creation.
5. Run frontend lint/build and `git diff --check`.

## Approval

- Approval required: No (Level 2; no API or architecture change).
