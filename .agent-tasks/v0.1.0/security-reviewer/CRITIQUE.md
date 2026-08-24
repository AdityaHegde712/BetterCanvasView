# Security Critique: Better Canvas View MV3 Release Approval

## Verdict: REVISE & RESUBMIT

## Summary

No production-code attack path from Canvas-controlled announcement HTML, deep
links, pagination, or a normal extension message reached script execution,
cross-origin credential disclosure, or snapshot corruption. The approval cannot
be accepted because the security-reviewer approval/report that this adversarial
review must challenge has not been submitted: the task ledger still marks both
reviewers pending and P4-001 incomplete. This is a release blocker, independent
of the otherwise favorable targeted test evidence.

## Stage 0 - Exploitability Sweep

- [HIGH] The claimed release approval is not reproducible because no
  `security-reviewer` report or approval exists to map to code, test evidence,
  residual risks, or an accountable sign-off. `TASKS.md:11-13` explicitly says
  the security and production-readiness reviewers are pending, and
  `TASKS.md:151-154` leaves P4-001 through P4-003 incomplete. Failure scenario:
  a release proceeds on the basis of the historical check summary alone; a later
  reader cannot establish whether session, redirect, IndexedDB, or dependency
  risks were reviewed, which invalidates the separate security release gate.
  -> Target approval section: absent (no report submitted).
- [LOW] Redirect handling is rejected only after Fetch has used its default
  `follow` behavior: `src/canvas/client.ts:226-230` omits a redirect mode and
  detects `response.redirected` only at `src/canvas/client.ts:254-257`.
  `src/diagnostic/run-canvas-diagnostic.ts:60-76` likewise follows redirects
  before validating the final response. The exact-host permission in
  `wxt.config.ts:11-14` constrains ordinary extension fetches, and the client
  then rejects the result, so no credential-exfiltration path was demonstrated.
  However, the regression suite tests malicious `Link` targets
  (`tests/integration/canvas-client.test.ts:85-103`), not a 3xx response;
  therefore it cannot prove that an unpermitted redirect was never contacted
  before rejection. -> Target approval section: absent (redirect control claim
  cannot be attributed).

## Stage 1 - Scenario-Based Checklist

- [LOW] Applicable input paths resisted the exercised attacks. Canvas HTML is
  parsed to bounded text and rendered as React text, not HTML
  (`src/security/announcement-text.ts:40-63`, `entrypoints/options/App.tsx:474`);
  same-origin deep links reject `javascript:`, lookalike, HTTP, relative, and
  nonstandard-port inputs (`src/security/canvas-links.ts:13-28`,
  `tests/spec/canvas-links.spec.ts:14-22`,
  `tests/integration/security-boundaries.test.ts:10-16`); and pagination rejects
  external, relative, non-API, and cyclic continuations before another request
  (`src/canvas/client.ts:191-210`, `tests/integration/canvas-client.test.ts:85-125`).
  This supports the code controls but cannot replace the missing reviewer
  approval. -> Target approval section: absent.
- [LOW] Session, permission, CSP, logging, and local-data boundaries have no
  demonstrated bypass. Requests are fixed-origin JSON GETs with the browser
  session (`src/canvas/client.ts:177-183`, `src/canvas/client.ts:220-257`), the
  manifest requests only `alarms`, the exact Canvas host, and a self-only
  extension CSP (`wxt.config.ts:11-31`), and IndexedDB holds records only in the
  extension database (`src/storage/database.ts:22-56`). Stable error codes avoid
  response payload disclosure (`src/canvas/client.ts:32-44`,
  `src/sync/sync-service.ts:81-84`). The focused boundary suite passed 22/22 on
  2026-08-24; the offline production dependency audit reported 0 vulnerabilities
  across 28 production dependencies, and `package-lock.json` is lockfile v3 with
  package integrity metadata. -> Target approval section: absent.
- [LOW] Concurrent refresh ordering and destructive-cache attacks were not
  reproduced. Sync runs queue in arrival order (`src/sync/sync-service.ts:91-112`)
  and atomically replace only remote stores (`src/storage/repository.ts:36-69`);
  the concurrency contract proves the second request waits and the later snapshot
  commits last (`tests/integration/sync-concurrency.test.ts:34-67`). -> Target
  approval section: absent.
- [LOW] Non-applicable categories are explicitly excluded: there is no cloud
  deployment, IAM role, server API, LLM, agent, model, prompt, or shared
  credential surface in the tracked extension. The approved non-goals exclude
  cloud and multi-user operation (`.agent-tasks/REQUIREMENTS.md:86-93`) and defer
  AI capabilities (`.agent-tasks/REQUIREMENTS.md:95-99`). OWASP GenAI prompt
  injection, model extraction, memory poisoning, cloud IAM escalation, and
  lateral service movement are therefore not applicable to this release. ->
  Target approval section: absent.

## Stage 2 - Socratic Dialectic

- [HIGH] Who independently attests that the release candidate, rather than an
  earlier branch or generated artifact, has the minimal manifest, evaluated
  session/redirect behavior, and accepted the remaining local-profile risk?
  There is no reviewer report, evidence index, or sign-off to answer this.
  `TASKS.md:11-13` and `TASKS.md:151-154` contradict any assertion that the
  separate security gate is complete. -> Target approval section: absent.
- [LOW] If Canvas returns a 302 to a non-Canvas target, does Chromium block it
  at the host-permission boundary before a network request, or does the client
  reject it only after navigation? The current unit contract does not exercise
  a 3xx or establish the browser-network assertion. -> Target approval section:
  absent.

## Required Compensating Controls / Revisions

1. [HIGH] The security reviewer must submit a release report before P4-001 can
   close. It must identify the reviewed commit, quote the generated MV3 manifest
   permissions/CSP, enumerate every Canvas-controlled input and runtime message
   boundary, attach commands and results, state the IndexedDB/local-profile
   residual risk, and contain an explicit approval or rejection. Re-run this
   adversarial review against that report; do not treat the task ledger or an old
   check summary as approval.
2. [LOW] Add a browser-level regression that intercepts a Canvas 3xx response
   whose `Location` is outside the granted host and proves the target is not
   contacted and no data is persisted. Prefer an explicit Fetch redirect policy
   that fails closed, with a deliberate `auth_required` mapping for Canvas login
   redirects, if the browser test shows a request can escape before the existing
   `response.redirected` check.
