# Better Canvas View Phase 4 Security Review

## Verdict: APPROVE WITH COMPENSATING CONTROLS

The Phase 4 working tree based on `origin/dev` commit `44d1024` is approved for
release after the manual signed-in Brave diagnostic succeeds. No Critical or
High security vulnerability was reproduced. One Low redirect-observability risk
and the expected local-profile data exposure remain documented below.

## Scope and Reviewed Artifact

- System: Better Canvas View `0.1.0`, local single-user Chrome MV3 extension.
- Source: complete tracked repository plus the Phase 4 hardening diff on
  `feature/phase-4-hardening`.
- Generated artifact: `.output/chrome-mv3`, produced by `npm run check`.
- Excluded: `.env`, archived artifacts, the everyday Brave profile, cloud/IAM,
  and LLM threat categories that do not exist in this release.

The generated manifest contains only `alarms`, exact host permission
`https://sjsu.instructure.com/*`, a module service worker, the Options page, and
`script-src 'self'; object-src 'self'`. The source of those controls is
`wxt.config.ts:12-29`.

## Trust Boundaries and Controls

### Canvas Network and Browser Session

Canvas requests are built from application-owned `/api/v1/` paths or validated
same-origin API continuation URLs. The transport sends credentialed GET requests
only and bounds each fetch wait to 30 seconds (`src/canvas/client.ts:10`,
`src/canvas/client.ts:235`, `src/canvas/client.ts:271-288`). Authentication,
content-type, redirect, pagination-cycle, and JSON-shape failures collapse to
stable error codes rather than response bodies.

The extension does not request the cookie API and does not read, export, store,
or log cookie or token values. The signed-in Canvas session is used by the
browser network stack through `credentials: "include"`
(`src/canvas/client.ts:282-284`).

### Canvas-Controlled HTML, Text, and Links

Announcement markup is parsed in a detached document, executable and invisible
elements are removed, whitespace is normalized, and the result is rendered as
a React text node (`src/security/announcement-text.ts:40-63`,
`entrypoints/options/App.tsx:518`). Remote deep links are accepted only when the
URL has the exact SJSU HTTPS origin and no embedded credentials
(`src/security/canvas-links.ts:13-28`). No `innerHTML`, dynamic code evaluation,
content script, or web-accessible resource path exists.

### Persistence and Data Integrity

Canvas records, local notes, hidden state, preferences, and sync metadata live
in extension-origin IndexedDB (`src/storage/database.ts:22-56`). Complete remote
snapshots and success metadata commit in one Dexie transaction; failed or timed
out requests retain the prior complete snapshot (`src/storage/repository.ts:43-69`).

Agenda and announcement state IDs use typed keys only when Canvas object IDs
collide, preventing cross-type state corruption while preserving ordinary legacy
keys (`src/dashboard/item-state-keys.ts:14-48`). Malformed optional timestamps
normalize to `null` before persistence (`src/domain/normalization.ts:59-72`).

### Runtime Messages and Permissions

The background worker accepts only the explicit diagnostic and manual-sync
message shapes. The manifest does not declare `externally_connectable`, content
scripts, `tabs`, `scripting`, `activeTab`, `cookies`, storage, or wildcard hosts
(`entrypoints/background.ts:23-31`, `entrypoints/background.ts:55-85`,
`wxt.config.ts:9-29`). Runtime messages therefore originate within the
extension boundary under the current manifest.

### Supply Chain and Release Evidence

`package-lock.json` is lockfile version 3 with integrity metadata. The following
commands passed against the reviewed working tree on 2026-08-24:

- `npm run check`: formatting, lint, TypeScript, 18 test files and 80 assertions,
  plus the production MV3 build.
- `npm run test:e2e`: 12 of 12 isolated Chromium extension workflows.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Static scan: no production console logging, cookie API, token storage,
  `innerHTML`, dynamic evaluation, or non-Canvas production URL.
- Artifact scan: exact approved manifest, matching icon files, and 54 tracked
  UTF-8/LF text files.

## Attack-Path Results

1. Canvas announcement script/event markup to extension code execution: blocked
   by detached parsing and React text rendering.
2. Deceptive or credential-bearing Canvas deep link to external navigation:
   blocked by exact-origin URL validation.
3. Malicious pagination `Link` to another origin, non-API path, relative URL, or
   cycle: rejected before the next request.
4. Partial or concurrent refresh to destructive cache replacement: blocked by
   complete-snapshot validation, serialized runs, and one atomic transaction.
5. Same-ID assignment and announcement to shared hidden/note corruption: blocked
   by conditional typed local-state keys and four Phase 4 regression assertions.

## Residual Risks and Compensating Controls

- **LOW: redirect target contact is not browser-regression-tested.** Fetch follows
  redirects before the client rejects `response.redirected`. Exact host
  permission, browser credential scoping, final-origin validation, GET-only
  requests, and no response persistence contain the impact. A future isolated
  browser regression should prove whether an external redirect target is
  contacted; this does not block the local v0.1.0 release.
- **LOW: local profile access exposes cached academic data.** Anyone with access
  to the unlocked Brave profile or local browser data can inspect IndexedDB.
  This is inherent in the approved single-user local-only architecture. The user
  must rely on OS login protection and browser-profile access control.
- **MEDIUM operational: MV3 may interrupt an alarm sync.** The prior snapshot
  remains atomic and intact, and startup/hourly/manual triggers retry. The live
  Brave smoke must verify successful current-session diagnostic and refresh.

## Approval Conditions

1. The user completes the manual signed-in Brave diagnostic and one manual
   refresh without sensitive console output.
2. The final packaged manifest remains byte-equivalent in permissions and CSP to
   the manifest reviewed above.
3. The Phase 4 branch is merged through the user-owned PR workflow, and release
   tag `v0.1.0` points to the resulting `main` commit.

Subject to those conditions, the security gate is approved.
