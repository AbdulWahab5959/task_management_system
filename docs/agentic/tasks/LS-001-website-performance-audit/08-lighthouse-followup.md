# LS-001 — Lighthouse Follow-up

## Report Summary

| Capture | URL | Environment | Results |
|---|---|---|---|
| Production preview root | `http://localhost:4173/` | Preview server; mobile Lighthouse emulation | FCP 2.1 s; LCP 2.2 s; Speed Index 2.1 s; TBT 120 ms |
| Dev dashboard | `http://localhost:5173/dashboard` | Vite development server | FCP 2.0 s; LCP 4.9 s; Speed Index 5.5 s; TBT 350 ms |
| Dev mobile/throttled dashboard | `http://localhost:5173/dashboard` | Vite development server; mobile throttling | FCP 11.0 s; LCP 23.0 s; Speed Index 63.3 s; TBT 1,580 ms |

The report files were supplied as `localhost_4173-20260910T113013.html`, `localhost_5173-20260910T112033.html`, and `localhost_5173-20260910T112308.html`. Lighthouse reports a Chrome-extension performance warning in all three captures.

## Validity Assessment

- Production frontend performance: the `4173` report is valid only as a production-preview root-route measurement. It is not a complete production dashboard benchmark.
- Dashboard route performance: the two `5173` reports do measure `/dashboard`, but they run through Vite development mode and therefore include possible Vite, React Refresh, source-module, and extension overhead.
- Dev-only debugging: both `5173` reports are useful for identifying development behavior, request sequencing, and route symptoms.
- Mobile throttled diagnosis: the `5173` mobile/throttled report is useful for diagnosing the worst-case development experience and prioritizing follow-up, but its timings must not be presented as production timings.

## Key Finding

The `4173` report is useful, with approximately 2.1 s FCP, 2.2 s LCP, and 2.1 s Speed Index, but it was captured on `/`, not `/dashboard`. It cannot prove that dashboard performance is fixed. It also does not provide authenticated dashboard API evidence.

## Duplicate Request Status

The two dev dashboard reports each contain two entries for every requested endpoint below. The pairs are a 200 response and a 204 response. This is observed in development only; the captures do not establish whether the same duplication occurs in production.

| Endpoint | Status | Classification | Reason |
|---|---|---|---|
| `/api/auth/me` | Two entries in both dev reports | Dev-only / StrictMode likely | Duplicate observed on Vite dev server; production occurrence remains unknown until the production dashboard test |
| `/api/tenants` | Two entries in both dev reports | Dev-only / StrictMode likely | Same development-only evidence; no production dashboard capture yet |
| `/api/tenant/dashboard/summary` | Two entries in both dev reports | Dev-only / StrictMode likely | Same development-only evidence; no production dashboard capture yet |

These are not classified as confirmed production issues or fixed. They remain unknown in production and still require investigation if they reproduce in the extension-free production dashboard capture.

## Required Next Manual Test

Run Lighthouse again on [http://localhost:4173/dashboard](http://localhost:4173/dashboard) using:

- production preview;
- an incognito window or a Chrome profile with extensions disabled;
- a logged-in user;
- mobile throttling;
- the Network tab with Preserve log enabled if possible.

Record the final URL, Lighthouse warnings, FCP/LCP/Speed Index/TBT, and the request count/status for the three endpoints above. Preserve the Network log or HAR if available.

## Decision

**C. Retest production dashboard first.**

This is the safest engineering recommendation. Do not commit the current Phase 1 frontend changes based on the supplied reports alone, and do not implement additional fixes yet. If the production dashboard capture shows one request per endpoint, the existing Phase 1 changes can be reviewed for commit readiness. If duplicates remain, investigate them before committing or changing backend/database behavior.

## Production Dashboard Retest Result (2026-09-14)

The newly supplied Lighthouse JSON report supersedes the earlier missing-evidence conclusion:

- Final URL: `http://localhost:4173/dashboard`
- Lighthouse warnings: none
- FCP: 0.5 s
- LCP: 1.6 s
- Speed Index: 2.0 s
- TBT: 0 ms
- Interactive: 1.6 s
- Root document server response: 10 ms

This is a production-preview dashboard capture with successful authenticated API responses. The report is therefore valid for the requested production dashboard performance check.

## Corrected Duplicate Request Status

The apparent pairs are not duplicate application calls. For each endpoint, Lighthouse records one `XHR` request with status `200` and one `Preflight` request with status `204`:

| Endpoint | Production observation | Classification |
|---|---|---|
| `/api/auth/me` | One XHR 200; one CORS Preflight 204 | Fixed; no duplicate application request observed |
| `/api/tenants` | One XHR 200; one CORS Preflight 204 | Fixed; no duplicate application request observed |
| `/api/tenant/dashboard/summary` | One XHR 200; one CORS Preflight 204 | Fixed; no duplicate application request observed |

No support API requests were present in the supplied request data while the support widget was closed. The report has no Lighthouse warnings.

## Corrected Decision

**E. Commit current Phase 1** is now the recommended next action, pending explicit developer authorization to commit. The production dashboard capture validates the main performance/request objective. Do not implement additional fixes from this evidence. Full UI regression checks not represented by Lighthouse remain a separate risk.
