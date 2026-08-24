# Canvas Aggregator v1 Implementation Plan

Status: Functional v1 release candidate complete; owner merge pending  
Last updated: 2026-08-24

## 0. Zero-Context Handoff

- Repository: `C:\Users\hifia\Projects\CanvasAggregator`.
- Remote: `https://github.com/AdityaHegde712/BetterCanvasView.git`.
- Current branch: `feature/phase-4-hardening`, created from current
  `dev`/`origin/dev` at `44d1024` after the final dashboard tweaks were
  squash-merged as `a8db847`.
- Final handoff commit: `37e2a92` (`fix(release): finalize v1 dashboard
  hardening`), pushed to `origin/feature/phase-4-hardening`.
- Git synchronization verified 2026-08-24: local/remote `dev` match at
  `44d1024`; remote `main` is `8cf27d1`; both remotes and tested commit
  `f761659` have identical tree `22ac7205`.
- Phase 3 is committed and pushed: pure selectors/formatters, Options dashboard,
  component tests, Playwright extension harness, E2E suite, branding, regression
  coverage, README, and `CODEBASE.md`.
- Quality gates passed:
  - `npm run check`: passes Prettier formatting, ESLint (`--max-warnings=0`), TypeScript (`tsc --noEmit`), 16 unit/component test files (76 assertions), and production Chrome MV3 build.
  - `npm run test:e2e`: passes all 12 isolated-profile Playwright browser workflows against `.output/chrome-mv3`.
  - `npm audit --audit-level=high`: reports 0 vulnerabilities.
  - Manifest inspection: only `alarms` permission, exact SJSU host permission, action and manifest icons, and self-only CSP.
  - `git diff --check`: passes with 0 whitespace/encoding issues.
  - Documentation audit: README local links resolve; `CODEBASE.md` is 274
    lines with a bounded Mermaid topology; 56 project text files pass strict
    UTF-8/LF validation.
  - Production package: 700.64 KB with only 16/48/128 icon derivatives.
- Final Phase 3 tweak exit order:
  1. Full code/build, E2E, audit, manifest, encoding, and diff gates passed.
  2. Commit `f761659` is pushed as `feature/dashboard-tweaks`.
  3. User opens and merges the feature PR into `dev`; then Phase 4 begins.
- Git rules: never merge locally and never open the PR. Commit/push the stable
  feature branch; the user owns the PR into `dev`.
- Phase 4 baseline checkpoint:
  - `origin/main`, `origin/dev`, and tested commit `f761659` have the same tree;
    the user-resolved merge retained the complete tested implementation.
  - `npm run check` passes 16 files / 76 assertions and the production build.
  - `npm run test:e2e` passes 12/12 isolated Chromium workflows.
  - Coverage is 84.24% statements, 74.83% branches, 90.56% functions, and
    84.05% lines; the live diagnostic remains the intentional manual gap.
  - Generated manifest, icon hashes, dependency tree, 54 tracked UTF-8/LF text
    files, and static secret/logging/dynamic-code scans pass.
  - A fresh `npm audit` is pending because approval quota blocks registry access
    until 05:00; the identical pre-merge tree previously reported 0 findings.
- Phase 4 review checkpoint:
  - Production readiness found valid High blockers for unbounded fetch waits,
    cross-type local-state ID collisions, and malformed timestamp persistence.
  - The claimed High alarm-listener lifetime defect is reclassified Medium:
    Chrome alarm callbacks are void and cannot promise event lifetime; atomic
    snapshot commits plus startup/hourly retry prevent corruption and recover.
  - Security adversary found no demonstrated production exploit. Its procedural
    High remains open until a primary security report exists and is rechecked.
  - New immutable `tests/spec/phase4-hardening.spec.ts` is RED 3/3 for exactly
    the three accepted implementation blockers.
- Phase 4 remediation checkpoint:
  - Request deadline, collision-safe local-state keys, malformed timestamp
    normalization, and collision-disappearance continuity are GREEN in 4/4 new
    immutable assertions; all 18 files / 80 assertions pass.
  - `npm run test:e2e` passes 12/12; fresh high-severity npm audit reports 0
    vulnerabilities.
  - WXT release ZIP `.output/better-canvas-view-0.1.0-chrome.zip` contains the
    current nine runtime files, is 200964 bytes, and has SHA-256
    `4D2FC6B87488F0D4932A39CF339B14DA3686210BF7C6B7CA8509B2D6617F09C8`.
  - Primary security review approves with manual-smoke controls. Two independent
    adversary recheck attempts failed to execute and left the old procedural
    critique unchanged; do not call P4-001 complete until a fresh recheck runs.
  - Commit `0208b86` (`fix(core): harden release boundaries`) is pushed as the
    one-commit `origin/feature/phase-4-hardening` branch from `origin/dev`.
- Phase 4 live/UX checkpoint:
  - The owner confirmed exact-host access in signed-in Brave on 2026-08-24:
    `hostPermission: true`; diagnostic status `success`; elapsed time 245 ms;
    one course sampled. The earlier HTTP 401 was caused by Canvas being signed
    out, not by the extension architecture or permissions.
  - A new narrow-width Playwright contract reproduced the header defect at
    420px: the title occupied three lines and Mantine stretched the icon to
    192.95x48px. Responsive header styles now preserve a 48x48 icon, one-line
    title, visible Refresh action, and zero horizontal overflow.
  - Dated agenda and hidden-assignment views now apply the same inclusive
    365-day presentation window as announcements. Undated work remains visible;
    old records remain cached and Canvas synchronization is unchanged.
  - `npm run check` passes 18 test files / 82 assertions plus the production
    build; `npm run test:e2e` passes 13/13 isolated Chromium workflows.
- Owner manual smoke confirmation:
  - On 2026-08-24, the owner reloaded the corrected unpacked extension in the
    signed-in Brave profile, verified the header and agenda behavior, and
    confirmed that everything required for this version is present.
  - Functional v1 release work is complete. The independent adversary
    recheck remains a documented procedural follow-up because prior delegated
    attempts produced no report; it does not change the verified code state.
- Manual Brave exit procedure:
  1. Reload `.output/chrome-mv3` from `brave://extensions` in the signed-in
     Brave profile and open Better Canvas View from the toolbar.
  2. Confirm the corrected square icon/title layout at the owner's normal
     desktop width and click Refresh.
  3. Verify live assignments/announcements, no stale warning, the one-year
     agenda cutoff, and no sensitive console output. The authenticated
     diagnostic step is already complete.

## Historical Execution Checkpoints

- Final-tweak RED checkpoint: 3/3 selector assertions and 2/2 Playwright
  workflows fail only on the four requested presentation behaviors.
- Final-tweak focused GREEN checkpoint: 8/8 selector assertions, strict
  TypeScript, production build, and 2/2 Playwright workflows pass.

- Working branch: `feature/canvas-sync`, based on `origin/dev` merge commit
  `4788547`.
- Completed foundation: WXT diagnostic, 36 frozen domain/storage assertions,
  one mutable exact-origin regression, Dexie schema, and normalized models.
- Uncommitted Phase 2 files: `tests/integration/canvas-client.test.ts`,
  `tests/integration/sync-service.test.ts`, and
  `tests/integration/sync-runtime.test.ts`.
- Frozen Phase 2 RED state: all three corrected integration suites fail only
  because `src/canvas/client.ts`, `src/sync/sync-service.ts`, and
  `src/sync/runtime.ts` do not exist. The 36 frozen Phase 1 assertions remain
  green.
- Completed corrections: official query parameters, same-origin non-API and
  pagination-cycle rejection, hourly alarm period verification, and returning
  manual sync results to the dashboard.
- The Phase 2 integration assertions are now implementation contracts.
  Production or refactoring work must not modify them without explicit user
  permission.
- Historical dependency order: implement and pass
  `tests/integration/canvas-client.test.ts`, then implement storage metadata
  support plus `src/sync/sync-service.ts`, then implement
  `src/sync/runtime.ts` and background wiring.
- Canvas transport checkpoint: `src/canvas/client.ts` is implemented and passes
  11/11 focused integration assertions. It enforces GET-only fixed-origin API
  paths, deterministic queries, cycle-safe pagination, bounded retry, JSON/auth
  validation, and code-only errors. The source file passes Prettier and ESLint.
- Synchronization checkpoint: `src/sync/sync-service.ts` now fetches course
  resources serially, normalizes a complete in-memory snapshot, commits remote
  records plus success metadata atomically, and updates only failure metadata
  when a request fails. Its focused integration suite passes 3/3 assertions.
- Runtime checkpoint: `src/sync/runtime.ts` now registers listeners
  idempotently, verifies the 60-minute alarm, dispatches startup and matching
  alarm triggers, and returns manual synchronization results. Its focused
  integration suite passes 3/3 assertions.
- Background checkpoint: `entrypoints/background.ts` now composes Dexie,
  `CanvasHttpClient`, `SyncService`, and `SyncRuntime`; the existing toolbar and
  diagnostic handlers remain registered. Startup and hourly/manual dispatch are
  wired through WXT browser events, and runtime/security integration tests pass.
- Current next dependency: resolve only the recorded non-behavioral test fake
  typings, then run the complete Phase 2 quality gate.
- Static-analysis checkpoint: integration fake typings are corrected without
  changing assertions. Test-only `require-await` is disabled because resolved
  async fakes intentionally model Promise APIs; production remains under the
  strict rule. Repository ESLint and TypeScript now pass.
- Full-code checkpoint: `npm run check` passes formatting, ESLint, TypeScript,
  all 11 test files/54 assertions, and the Chrome MV3 production build.
- Supply-chain checkpoint: `npm audit --audit-level=high` reports zero known
  vulnerabilities.
- Release-artifact checkpoint: the generated MV3 manifest contains only the
  `alarms` permission and exact SJSU host permission; 42 project text files are
  valid UTF-8 with LF-only endings; the one-course golden fixture pipeline
  passes.
- Pre-commit review checkpoint: Git scope and whitespace are clean, but an
  independent developer review found one HIGH race: overlapping alarm/manual
  runs can commit out of order and let an older snapshot replace a newer one.
- Concurrency RED checkpoint: the new isolated contract observes two course
  requests before the deferred first response is released (`2` versus expected
  `1`). The queue-recovery case already passes.
- Concurrency GREEN checkpoint: `SyncService.run()` now uses a failure-safe
  promise tail. Both ordering/later-snapshot and post-failure recovery assertions
  pass (2/2).
- Hardened full-code checkpoint: formatting, lint, TypeScript, all 12 test
  files/56 assertions, and the production build pass after serialization.
- Final artifact checkpoint: the rebuilt manifest retains only approved
  permissions/CSP, 43 project text files pass strict UTF-8/LF validation, and
  `git diff --check` passes.
- Staging checkpoint: the index contains exactly 11 intended Phase 2 files
  (1,294 insertions), with no unrelated path or whitespace error.
- Commit checkpoint: `bdf4229` (`feat(sync): add atomic Canvas synchronization`)
  contains the validated Phase 2 scope.
- Merge checkpoint: fetch/prune updated `origin/dev` to `e5e39d9` and
  `origin/main` to merge commit `b0d4bb6`; the deleted remote feature ref was
  pruned.
- Conflict-resolution checkpoint: `src/domain/models.ts` and
  `src/storage/repository.ts` are byte-identical between `origin/dev` and
  `origin/main`. Required count fields and the `SyncMetadata` import/usages are
  intact with no conflict markers or duplicate code.
- Local integration checkpoint: local `dev` was fast-forwarded from `4788547`
  to `origin/dev` at `e5e39d9`; the Phase 2 commit is present.
- Branch checkpoint: `feature/dashboard-workflows` was created from updated
  `dev`. Safe deletion of the obsolete local Phase 2 ref was refused because its
  configured remote upstream is gone; exact ancestry was reverified before
  force-deleting that one local ref.
- Cleanup checkpoint: the exact obsolete local `feature/canvas-sync` ref was
  deleted; its commit remains reachable from merged long-lived branches.
- Phase 3 inventory checkpoint: the Options page is still the isolated Phase 0
  diagnostic; Dexie already exposes all six required durable stores; no
  dashboard selector/component layer exists. Mantine, React Testing Library,
  Dexie live-query support, and the Pacific bucket classifier are installed.
- Phase 3 interaction path: Dexie live queries -> pure dashboard selectors ->
  Mantine section components -> repository mutations/background manual sync ->
  Dexie live-query rerender.
- Planned affected paths: `src/dashboard/**`, `entrypoints/options/**`, targeted
  repository helpers, and isolated `tests/spec` plus `tests/component` files.
- Production dependency map: `src/dashboard/selectors.ts` owns pure joins and
  ordering; `src/dashboard/formatters.ts` owns Pacific display strings;
  `entrypoints/options/App.tsx` owns live-query composition and transient UI;
  proposed future section components may live under the currently uncreated
  `entrypoints/options/components/`; `entrypoints/options/main.tsx` constructs
  the database and browser message adapter.
- No new runtime dependency is needed: existing Mantine controls,
  `useLiveQuery`, `announcementHtmlToText`, and repository mutations cover the
  dashboard. The approved Playwright dev dependency is absent and must be added
  for isolated-profile extension E2E.
- Requirements recheck: the current owner-authored `REQUIREMENTS.md` matches the
  delegated Phase 3 contract exactly; no new design ambiguity or scope change
  was found.
- Contract checkpoint: `tests/spec/dashboard-selectors.spec.ts` and
  `tests/component/dashboard.test.tsx` are reviewed and frozen. One pre-freeze
  Hide-button assertion was corrected to the explicitly required checkbox.
  RED is confirmed: selector module missing and 10 UI workflows absent.
- Selector checkpoint: `src/dashboard/selectors.ts` and `formatters.ts` are
  implemented; formatting, focused ESLint, and all 5 frozen selector assertions
  pass. Full TypeScript is expected to remain RED only until the injectable
  Phase 3 `App` lands.
- Current dependency split: primary implements `src/dashboard/**`; a frontend
  worker implements only `entrypoints/options/**` against the frozen contracts.
  Integration begins after both disjoint slices are ready.
- UI integration checkpoint: Mendel implemented `entrypoints/options/**`; the
  primary review replaced duplicate sanitization/link validation with existing
  security utilities, added bucket labels, and removed modal transition timing.
  Both frozen suites pass 15/15; focused formatting, ESLint, and TypeScript pass
  after clean-code cleanup.
- Repository gate checkpoint: `npm run check` passes 14 test files/71
  assertions, formatting, ESLint, TypeScript, and the production Chrome MV3
  build after dashboard integration.
- Current next dependency: determine the locally available Playwright runtime,
  then implement/run isolated-profile extension E2E and visual accessibility
  checks without using the everyday Brave profile.
- Playwright inventory checkpoint: no local package, executable, config, or E2E
  test exists. Add the approved dev dependency and isolated Chromium runtime
  before authoring the extension harness.
- Playwright package checkpoint: `@playwright/test@1.62.1` is installed as a
  development-only dependency with matching local shims; npm reports zero
  vulnerabilities. Chromium runtime installation is next.
- Chromium checkpoint: the detached install completed successfully with
  Playwright Chromium v1234 and its headless shell. No everyday Brave profile
  was opened or modified.
- E2E interaction path: Playwright launches bundled Chromium headlessly with an
  empty temporary persistent profile and the built MV3 extension; discovers the
  extension ID from its service worker; routes exact-host Canvas requests to a
  deterministic fake transport; opens the Options page through the extension
  API; and exercises refresh/cache/navigation/local-state workflows.
- Current E2E affected paths: `playwright.config.ts`, `tests/e2e/**`, package
  scripts/dev dependency, and ignored Playwright report directories. No
  production test hook or everyday-profile automation is permitted.

### Phase 2 Interaction Flow

`SyncRuntime` receives startup, alarm, or manual events and calls
`SyncService.run(trigger)`. `SyncService` uses `CanvasHttpClient.getAll()` to
fetch every opaque page serially, normalizes a complete in-memory snapshot, and
commits remote data plus success metadata in one Dexie transaction. A failed
request updates only failure metadata and preserves the previous remote snapshot
and `last_success_at`.

## Phase 0: Repository Baseline and Feasibility Spike

1. Establish `main` and `dev` with an essential root README and ignore rules.
2. Scaffold WXT, React, TypeScript, and Mantine on a feature branch from `dev`.
3. Configure a Manifest V3 options-page dashboard, action click, `alarms`
   permission, exact SJSU host permission, and self-only CSP.
4. Add a diagnostic that performs a read-only Canvas profile request and reports
   only status, elapsed time, and aggregate counts.
5. Build the unpacked extension and manually validate it in signed-in Brave.

Exit criterion: valid Canvas JSON is received without reading or logging
credentials. Failure stops implementation and triggers architecture redesign.

Result: Passed on 2026-08-23 using the installed extension in the user's
signed-in Brave profile. No response payload or identifying fields are retained
in project artifacts.

## Phase 1: Frozen Contracts and Persistence Foundation

1. Write failing immutable specifications in `tests/spec/` and a shared sanitized
   Canvas fixture before implementation.
2. Define snake_case normalized records and stable Canvas-ID keys.
3. Implement and test Pacific-time buckets, submission classification,
   pagination parsing, announcement excerpts, and trusted Canvas links.
4. Implement the Dexie schema and atomic snapshot repository.

Exit criterion: frozen domain contracts and reduced-size storage pipeline pass.

Result: Passed on 2026-08-23 with 36 frozen contract assertions and one mutable
exact-origin security regression assertion. Formatting, lint, TypeScript, npm
audit, and the WXT production build also pass.

## Phase 2: Synchronization Service

1. Freeze corrected integration contracts in
   `tests/integration/{canvas-client,sync-service,sync-runtime}.test.ts`.
2. Implement `src/canvas/client.ts`: GET-only fixed-origin requests, query
   serialization, serial opaque pagination, cycle detection, three-attempt
   429/5xx retry, response validation, and privacy-safe error codes.
3. Implement `src/sync/sync-service.ts`: active student courses, assignment
   submission/effective override queries, announcement-only topics, complete
   normalization, atomic success commits, and stale-cache failure metadata.
4. Implement `src/sync/runtime.ts` and update `entrypoints/background.ts`:
   startup, verified hourly alarm, manual request/response, and existing
   diagnostic coexistence.

Exit criterion: transport and synchronization integration suites pass without
partial cache replacement or sensitive logging.

Result: Automated Phase 2 exit checks and the concurrency hardening recheck
passed on 2026-08-23. The user still owns the feature-to-`dev` PR and merge.

## Phase 3: Dashboard

1. Build the dark Mantine shell and Agenda, Announcements, Hidden Items, and
   Settings sections.
2. Connect Dexie live queries, title/course filters, exact due-time display,
   notes, Hide/Restore, course toggles, stale state, and Clear Data.
3. Add component and isolated-profile extension E2E coverage.

Exit criterion: all approved workflows pass automated tests and accessibility
checks at desktop dimensions.

Strict selector exit criterion: completed or disabled-course records never
enter Agenda/Hidden selectors; every remaining dated item enters exactly one
ordered Pacific bucket; announcements group by enabled course newest-first;
stale state is deterministic from metadata plus current time.

## Phase 4: Hardening and Release Candidate

1. Run the staged security-adversary review and resolve blocking findings.
2. Run `production-readiness-review` across reliability, availability,
   performance, scalability, correctness/data integrity, security,
   observability, operability, resource efficiency, and extension-specific
   constraints. Write the cited result to
   `.agent-tasks/PRODUCTION_READINESS_REVIEW.md` and resolve all Critical/High
   findings before release.
3. Run formatting, linting, type checking, unit, integration, E2E, dependency
   audit, and production build checks.
4. Perform final manual Brave smoke validation and prepare the feature branch
   for a user-owned pull request into `dev`.

Exit criterion: no critical/high security findings, all automated checks pass,
and the live diagnostic reports success without sensitive output.

## Ownership and Git Discipline

The primary agent owns interfaces, integration, and final review. Test,
integration, frontend, and security slices may be delegated with disjoint write
sets. Frozen specifications cannot be changed by implementation agents.

Branches originate from `dev` and use `feature/<2-5-word-slug>`. Commits are
phase-end conventional commits with agent-prefixed bodies. The agent never
merges locally or opens pull requests. Stable feature branches are squashed only
immediately before the user creates a pull request.
