# Canvas Aggregator Atomic Task Ledger

Last updated: 2026-08-24

## Resume Header

- Branch: `feature/phase-4-hardening`
- Base: current `origin/dev` at `44d1024`; final tweaks merged as `a8db847`.
- Active phase: Phase 4 security and production-readiness hardening.
- Blocker: None.
- Subagent status: Phase 4 security and production-readiness reviewers pending.
- Immediate next action: run independent cited audits, triage findings, and
  resolve every Critical/High issue before release validation.
- Worktree: announcement recency, non-empty agenda buckets, title icon, and
  transient success alert implemented with new locked tests.
- Phase 4 baseline: merge trees are identical; 76/76 code tests, 12/12 isolated
  browser workflows, production build, manifest, dependency-tree, icon,
  encoding, and static security checks pass.
- Coverage: 84.24% statements, 74.83% branches, 90.56% functions, 84.05% lines.
- Pending external gate: rerun `npm audit --audit-level=high` after 05:00 because
  the approval service quota blocked a fresh registry request.
- Last full gate: `npm run check` passed (16 test files / 76 assertions, lint,
  tsc, build); `npm run test:e2e` passed 12/12 browser workflows in an isolated
  persistent context; `npm audit --audit-level=high` reports 0 vulnerabilities.
- 2026-08-24 synchronization: fetched/pruned `origin`; local/remote `dev` match
  at `e5e39d9`; local/remote `main` match at `b0d4bb6`; local/remote
  `feature/dashboard-workflows` match at `920e301`.
- 2026-08-24 verification: `npm run check` passes 15 files / 73 assertions plus
  the production build; E2E passes 10/10; the manifest retains only `alarms`,
  the exact SJSU host, approved icons, and self-only CSP.
- 2026-08-24 artifact audit: production package is 700.64 KB; README local
  links resolve; `CODEBASE.md` is 274 lines; 56 text files pass strict UTF-8/LF;
  `git diff --check` passes.
- Tooling: `@playwright/test@1.62.1`, `@types/node`, Chromium v1234.
- Required completion order:
  1. Run full code/build, E2E, supply-chain, manifest, documentation, encoding,
     and diff gates.
  2. Commit/push `feature/dashboard-tweaks`; user opens/merges PR into `dev`.
  3. Begin Phase 4 security and production-readiness reviews after the merge.

## Completed

- [x] P0-001 Synchronize approved requirements, plan, decisions, and tasks.
- [x] P0-002 Establish and push `main` and `dev`.
- [x] P0-003 Build and push the exact-host WXT diagnostic.
- [x] P0-004 Confirm authenticated Canvas JSON from signed-in Brave.
- [x] P1-001 Write and freeze seven domain/storage specification suites.
- [x] P1-002 Implement Pacific bucketing, submissions, normalization,
  pagination, trusted links, and safe announcement text.
- [x] P1-003 Implement Dexie schema and atomic remote snapshot replacement.
- [x] P1-004 Pass 36 frozen assertions plus exact-origin regression.
- [x] P1-005 Merge Phase 1 into `dev`; prune merged feature branches.
- [x] P2-001a Author initial client/service/runtime integration tests.
- [x] P2-001b Review tests and identify four pre-freeze corrections.
- [x] DOC-001 Adopt continuous zero-context state synchronization.
- [x] DOC-002 Add the Phase 4 production-readiness review gate.

## Completed: Phase 2

- [x] P2-001 Correct Phase 2 integration contracts.
  - Acceptance: official query parameters, API-only/cycle-safe pagination,
    hourly period verification, and returned manual result are asserted.
- [x] P2-002 Confirm RED without touching `tests/spec/`.
  - Acceptance: three Phase 2 suites fail only on missing implementation
    modules; all 36 frozen assertions remain green.
- [x] P2-003 Implement `src/canvas/client.ts`.
  - Acceptance: GET-only transport tests pass; retries are bounded; error
    objects expose only stable codes; no payload is logged or retained.
- [x] P2-004 Implement `src/sync/sync-service.ts` and extend atomic metadata
  persistence.
  - Acceptance: complete success snapshot commits once; later-course failure
    preserves prior remote data and prior `last_success_at`.
- [x] P2-005 Implement `src/sync/runtime.ts` and background wiring.
  - Acceptance: startup, one verified hourly alarm, and manual result behavior
    pass; existing diagnostic still works.
  - [x] P2-005a Implement and test browser-independent `SyncRuntime`.
  - [x] P2-005b Wire runtime dependencies and WXT event adapters in the
    background entrypoint.
- [x] P2-006 Run Phase 2 quality gate and reduced-size smoke.
  - Acceptance: format, lint, typecheck, all tests, npm audit, build, manifest
    permission check, UTF-8/LF scan, and one-course fixture pipeline pass.
  - [x] P2-006b Pass formatting, lint, TypeScript, 54 tests, and production
    build through `npm run check`.
  - [x] P2-006c Run audit, manifest, encoding, and reduced smoke checks.
    - [x] Dependency audit reports zero vulnerabilities.
- [x] P2-006d Serialize overlapping sync triggers.
  - Acceptance: a second run does not start Canvas reads until the first run
    settles; final cached data comes from the later queued trigger; failures do
    not poison the queue.
  - [x] Add the isolated contract and confirm RED (`2` early requests versus
    expected `1`).
  - [x] Implement queue and confirm GREEN (2/2 assertions).
  - [x] Rerun the full code/build gate (12 files, 56 assertions).
- [x] P2-006a Clean integration fake typings without changing assertions.
  - Acceptance: repository ESLint and TypeScript pass after all Phase 2 modules
    exist.
- [x] P2-007 Commit and push one `feature/canvas-sync` commit.
  - Acceptance: clean working tree and user-ready PR link targeting `dev`.
  - [x] Stage and inspect exactly 11 intended files; no whitespace errors.
  - [x] Create commit `bdf4229`.
  - [x] Push and verify identical local/remote commit; worktree clean.
  - [x] Verify the user-owned merges and conflict resolutions after fetch/prune.
  - [x] Fast-forward local `dev` to `origin/dev` at `e5e39d9`.

## Completed: Phase 3

- [x] P3-001 Prepare `feature/dashboard-workflows` from merged `dev`.
  - [x] Create and switch to the Phase 3 feature branch.
  - [x] Delete the obsolete local Phase 2 branch after exact ancestry proof.
- [x] P3-002 Write and freeze dashboard selector/component contracts.
  - Acceptance: tests lock enabled/completed/hidden filtering, exclusive bucket
    order, exact due display, filters, note Save, Hide/Restore, announcements,
    settings toggles, stale/auth/manual refresh, and confirmed Clear Data.
  - [x] Godel owns only new Phase 3 test/helper files; production code remains
    untouched until RED review.
  - [x] Reverify current owner-authored Phase 3 requirements; no ambiguity.
  - [x] Review tests, correct Hide to checkbox pre-freeze, and confirm RED.
- [x] P3-003 Implement pure dashboard selectors and formatters.
- [x] P3-003a Pass all 5 frozen selector assertions.
  - [x] Pass focused Prettier and ESLint.
- [x] P3-004 Implement Dexie live-query dashboard shell and workflows.
  - [x] Integrate Mendel's Options UI and pass 15/15 frozen Phase 3 assertions.
  - [x] Complete clean-code/static-analysis cleanup.
- [x] P3-005 Run component accessibility and extension E2E checks.
  - [x] Pass repository-wide gate (14 files, 71 assertions, production build).
  - [x] Confirm Playwright is absent locally and correct the dependency plan.
  - [x] Install `@playwright/test@1.62.1`; audit remains clean.
  - [x] Install isolated Chromium runtime using detached logging.
  - [x] Verify official persistent-context/service-worker extension pattern.
  - [x] Add `playwright.config.ts` and temporary-profile extension fixture.
  - [x] Add exact-host fake Canvas transport in E2E code only.
  - [x] Verify successful refresh and complete cached dashboard workflow.
  - [x] Verify auth failure retains cache and shows stale/sign-in state.
  - [x] Verify confirmed Clear Data and extension Options opening.
  - [x] Run Playwright E2E headlessly and capture failure artifacts only (10/10 pass).
  - [x] Rerun `npm run check`, audit, manifest, encoding, and diff gates.

## Future Gates: Phase 4

- [x] P3-TWEAK-001 Filter visible and hidden announcements to an inclusive
  365-day window without deleting cached records.
- [x] P3-TWEAK-002 Render only non-empty agenda buckets.
- [x] P3-TWEAK-003 Display the bundled 48px icon beside the dashboard title.
- [x] P3-TWEAK-004 Auto-dismiss successful refresh feedback after four seconds.
- [x] P3-TWEAK-005 Confirm focused RED then GREEN in 3 selector and 2 browser
  contracts without modifying existing assertions.
- [x] P3-TWEAK-006 Run full gates, commit `f761659`, and push the one-commit
  `feature/dashboard-tweaks` branch.

- [x] P3-STAB-001 Lock and verify due-dated `omit_from_final_grade` discussion
  assignment inclusion without modifying existing assertions.
- [x] P3-STAB-002 Install the owner-provided README hero and extension/tab icon
  assets without bundling the 2048px source image.
- [x] DOC-003 Generate `CODEBASE.md`, update README, reconcile requirements with
  ADR-026/027, remove volatile ADR execution logs, and audit paths.

- [/] P4-001 Run the three-stage security-adversary review and resolve blockers.
  - [x] Submit `.agent-tasks/SECURITY_REVIEW.md` with explicit conditional
    approval and current release evidence.
  - [ ] Re-run independent adversary critique; two subagent attempts produced no
    output, so the stale pre-report critique cannot close this gate.
- [x] P4-002 Run the ten-metric production-readiness review and resolve
  Critical/High issues; final verdict is conditionally ready.
- [x] P4-003 Run live Brave smoke and hand off the release PR.
  - Acceptance: owner confirms the signed-in extension renders the corrected
    header and agenda and Refresh returns live data.
  - Evidence: owner confirmed the final version looks good on 2026-08-24.
- [x] P4-004 Resolve valid production-readiness blockers without changing
  frozen assertions.
  - [x] P4-004a Lock request-deadline queue recovery in a new Phase 4 spec.
  - [x] P4-004b Lock cross-type local-state collision isolation.
  - [x] P4-004c Lock malformed optional timestamp normalization.
  - [x] P4-004d Implement minimal production changes and pass all gates.
- [x] P4-005 Build and inspect the v0.1.0 Chrome MV3 ZIP; record its exact hash.
  - Final artifact: 200964 bytes;
    SHA-256 `4D2FC6B87488F0D4932A39CF339B14DA3686210BF7C6B7CA8509B2D6617F09C8`.
- [x] P4-006 Commit and push one verified hardening commit `0208b86` on
  `feature/phase-4-hardening`.
- [x] P4-007 Confirm the live Canvas feasibility gate in signed-in Brave.
  - Acceptance: exact host permission is present and diagnostic returns only
    success metadata without credentials or Canvas payload logging.
  - Evidence: `hostPermission: true`, status `success`, 245 ms, one sampled
    course on 2026-08-24.
- [x] P4-008 Correct narrow-width dashboard branding through TDD.
  - Acceptance: at 420px the icon is square, title uses one line, Refresh is
    visible, and the document has no horizontal overflow.
  - Evidence: focused RED measured three title lines; final Playwright contract
    passes and the screenshot was visually inspected.
- [x] P4-009 Extend the inclusive one-year presentation cutoff to agenda work.
  - Acceptance: dated items older than 365 days are excluded from Agenda and
    Hidden Items; exact-boundary and undated items remain visible; cache is not
    modified.
  - Evidence: 5/5 focused selector assertions, 82/82 full code assertions, and
    13/13 isolated extension E2E workflows pass.
- [x] P4-010 Record owner confirmation and prepare the single-commit feature
  branch for handoff.
  - Acceptance: final production build and release ZIP include the confirmed
    UI and agenda fixes; branch is pushed and clean after final commit.
  - Evidence: commit `37e2a92` is pushed and matches the remote feature tip;
    release ZIP SHA-256 is
    `4D2FC6B87488F0D4932A39CF339B14DA3686210BF7C6B7CA8509B2D6617F09C8`.

Exact immediate next action: owner merges the pushed feature branch into `dev`
and performs the planned branch cleanup.

## Immutable Constraints

- Never inspect `.env` files.
- Never modify frozen `tests/spec/` assertions without explicit user approval.
- Never add Canvas write methods, token/cookie access, DOM scraping, content
  scripts, cloud hosting, or everyday-profile automation.
- Never merge locally or open PRs; the user owns GitHub merges.
- Update PLAN, DECISIONS, and TASKS after every completed step.
