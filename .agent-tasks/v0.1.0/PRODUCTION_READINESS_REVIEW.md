# Better Canvas View Production Readiness Review

## Review metadata

| Field | Value |
| :-- | :-- |
| System | Better Canvas View, Chrome MV3 extension |
| Scope | Complete tracked extension at `feature/phase-4-hardening`, HEAD `44d1024f830ad5bc88e1df6d43c6103572ad0782` |
| Status | Active local single-user desktop extension. The product has no application server, cloud deployment, token store, or content script (`CODEBASE.md:55-57`). |
| Date | 2026-08-24 |
| Audience | Principal Engineer |
| Execution | Source-first audit of all ten required metrics. Ten adversarial passes per metric, 100 metric passes total, followed by five cross-metric deduplication and fact-check passes. |
| Exclusions | No `.env` file or archived artifact was inspected. No live Canvas account, everyday browser profile, cloud service, or generated build artifact was used. |

## Final Phase 4 Verdict

**CONDITIONALLY READY FOR RELEASE.** The original discovery verdict below is
retained for traceability and is superseded by this remediation result.

- ISSUE-001 is resolved. `CanvasHttpClient` bounds every fetch wait to 30
  seconds and maps expiry to `network_error`; the new never-settling-fetch
  contract passes (`src/canvas/client.ts:10`, `src/canvas/client.ts:235`,
  `src/canvas/client.ts:271-292`, `tests/spec/phase4-hardening.spec.ts`).
- ISSUE-006 is resolved. Cross-type collisions use typed local-state keys while
  ordinary legacy keys remain compatible; state also survives a collision
  disappearing (`src/dashboard/item-state-keys.ts:14-48`,
  `tests/spec/phase4-hardening.spec.ts`,
  `tests/spec/phase4-state-transition.spec.ts`).
- ISSUE-007 is resolved. Invalid optional Canvas timestamps normalize to `null`
  before persistence (`src/domain/normalization.ts:59-72`,
  `tests/spec/phase4-hardening.spec.ts`).
- ISSUE-002 is reclassified from High to Medium. Chrome alarm callbacks have a
  void API contract and do not provide a `waitUntil` completion guarantee.
  Atomic snapshot replacement prevents corruption, while startup, hourly, and
  manual triggers retry interrupted work (`entrypoints/background.ts:50-53`,
  `src/sync/runtime.ts:58-89`, `src/storage/repository.ts:43-69`). Durable
  interruption telemetry remains a future operability improvement.

Current verification: `npm run check` passes formatting, lint, TypeScript, 18
test files with 80 assertions, and the production build; `npm run test:e2e`
passes 12/12 isolated Chromium workflows; `npm audit --audit-level=high` reports
0 vulnerabilities. The remaining release condition is the manual signed-in
Brave diagnostic and refresh.

## Discovery Verdict (Superseded)

**NOT READY FOR RELEASE.** Four High issues are release blockers: an unbounded request can deadlock every later refresh, alarm synchronization is detached from the MV3 event lifetime, assignment and announcement state keys can collide, and a malformed Canvas timestamp can crash the dashboard. These mechanisms are active in production paths (`src/canvas/client.ts:221-246`, `entrypoints/background.ts:50-53`, `src/domain/normalization.ts:164-176`, `src/domain/normalization.ts:206-213`).

There are **0 Critical, 4 High, and 7 Medium issues**, grouped into **5 remediation buckets**. Critical severity was rejected because the extension is read-only, fixed to one Canvas origin, stores data only in extension-local IndexedDB, and has no server-side or multi-user blast radius (`README.md:24-33`, `wxt.config.ts:9-29`).

Release should remain blocked until ISSUE-001, ISSUE-002, ISSUE-006, and ISSUE-007 are fixed and their validation plans pass. The Medium issues may ship only with an explicit Principal Engineer risk acceptance because several amplify the High failure modes.

## Execution and adversarial critique record

Each metric received the same ten passes: active-path check, local-versus-cloud calibration, concrete failure reconstruction, counterexample search, test-coverage challenge, severity calibration, evidence audit, duplicate elimination, remediation cohesion, and final skeptical review. A metric locked only after pass 10 produced no material issue change.

| Metric | Passes | Locked primary issues | Result |
| :-- | --: | :-- | :-- |
| Reliability and Fault-Tolerance | 10 | ISSUE-001, ISSUE-003 | High blocker plus Medium gap |
| Availability and Recovery | 10 | ISSUE-002 | High blocker |
| Performance | 10 | ISSUE-004 | Medium |
| Scalability and Elasticity | 10 | ISSUE-005 | Medium, calibrated for one local user |
| Correctness and Data Integrity | 10 | ISSUE-006, ISSUE-007 | Two High blockers |
| Security and Blast Radius | 10 | None | No evidenced code issue; dependency advisory status is UNVERIFIED |
| Observability and Debuggability | 10 | ISSUE-008 | Medium |
| Operability and Maintainability | 10 | ISSUE-009 | Medium |
| Resource Efficiency and Cost | 10 | ISSUE-010 | Medium, local device cost only |
| Domain-Specific Attributes | 10 | ISSUE-011 | Medium, Pacific-time dashboard invariant |

The audit did not import cloud-only requirements. Multi-zone failover, load balancers, sharding, cluster health checks, distributed tracing, and cloud cost allocation do not apply because the architecture is a modular browser-extension monolith with IndexedDB and the authenticated Canvas browser session as its environment dependencies (`CODEBASE.md:8-10`, `CODEBASE.md:55-57`).

## Issue index

| Metric | ID | Title | Severity | Confidence | Location | Bucket |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Reliability | ISSUE-001 | A pending Canvas request blocks the complete synchronization queue | High | High | `src/canvas/client.ts:221-246`; `src/sync/sync-service.ts:104-112` | B1 |
| Reliability | ISSUE-003 | Transport exceptions are not retried | Medium | High | `src/canvas/client.ts:225-247` | B1 |
| Availability | ISSUE-002 | Alarm synchronization is detached from the MV3 event lifetime | High | High | `entrypoints/background.ts:50-53`; `src/sync/runtime.ts:58-61` | B1 |
| Performance | ISSUE-004 | Full snapshots serialize every per-course resource request | Medium | High | `src/sync/sync-service.ts:164-209` | B3 |
| Scalability | ISSUE-005 | Pagination and accumulated records have no hard bounds | Medium | High | `src/canvas/client.ts:191-212` | B3 |
| Correctness | ISSUE-006 | Assignment and announcement state keys share one collision-prone namespace | High | High | `src/domain/normalization.ts:164-176`; `src/domain/normalization.ts:206-213`; `src/domain/models.ts:43-47` | B2 |
| Correctness | ISSUE-007 | Unvalidated timestamps can crash the dashboard after a successful sync | High | High | `src/domain/normalization.ts:66-69`; `src/domain/agenda.ts:101-117`; `src/dashboard/formatters.ts:18-28` | B2 |
| Observability | ISSUE-008 | Runtime failures collapse to generic or invisible outcomes | Medium | High | `entrypoints/options/App.tsx:276-286`; `entrypoints/background.ts:50-53` | B4 |
| Operability | ISSUE-009 | Release gates are local and omit E2E from the aggregate check | Medium | High | `package.json:6-19`; `CODEBASE.md:222-229` | B5 |
| Resource efficiency | ISSUE-010 | Hourly snapshots retain and refetch data outside the visible horizon | Medium | High | `src/sync/sync-service.ts:70-74`; `src/dashboard/selectors.ts:26-27`; `src/storage/repository.ts:54-64` | B3 |
| Domain-specific | ISSUE-011 | Long-open dashboards do not advance time-dependent views | Medium | High | `entrypoints/options/App.tsx:177-207`; `entrypoints/options/App.tsx:209-219` | B4 |

## Detailed issue records

### ISSUE-001: A pending Canvas request blocks the complete synchronization queue

- **Component and reference:** `CanvasHttpClient` calls `fetch` without an `AbortSignal` or deadline (`src/canvas/client.ts:221-230`). `SyncService` chains every trigger behind the prior run (`src/sync/sync-service.ts:104-112`). The manual dashboard waits for that result before clearing its loading state (`entrypoints/options/App.tsx:276-286`).
- **Failure mode:** One Canvas request remains pending. `#request` never resolves, `#runOnce` never settles, and `#runQueue` remains pending. Every startup, alarm, and manual trigger then waits behind the same promise (`src/sync/sync-service.ts:104-120`). The Refresh control remains loading because its `finally` block cannot execute (`entrypoints/options/App.tsx:276-286`).
- **Affected metrics:** Reliability primary; Availability, Operability, and Domain-Specific secondary.
- **Severity and confidence:** **High, High confidence.** A single network stall disables every refresh path for the lifetime of the worker. Chrome can terminate an extension worker when a fetch response takes more than 30 seconds, so browser termination is not a controlled recovery mechanism [Chrome extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- **Scope:** Active production transport, synchronization service, and dashboard.

### ISSUE-002: Alarm synchronization is detached from the MV3 event lifetime

- **Component and reference:** The browser adapter invokes the async alarm listener with `void`, so the registered Chrome callback returns immediately (`entrypoints/background.ts:50-53`). The listener itself awaits a complete synchronization (`src/sync/runtime.ts:58-61`), which performs one course request and two resource families per course (`src/sync/sync-service.ts:170-203`).
- **Failure mode:** An hourly alarm fires and the callback starts `service.run`, but the callback discards its promise. The browser event has no completion signal for the database commit or failure-metadata write. Worker termination can interrupt the operation before either outcome is durable (`entrypoints/background.ts:50-53`, `src/sync/sync-service.ts:115-160`).
- **Affected metrics:** Availability primary; Reliability and Observability secondary.
- **Severity and confidence:** **High, High confidence.** Hourly refresh is a documented product behavior (`README.md:20-22`), while the production adapter does not preserve the completion contract exercised by the test adapter, which explicitly awaits listener promises (`tests/integration/sync-runtime.test.ts:9-27`). Chrome requires extension service workers to tolerate unexpected termination [Chrome extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- **Scope:** Active production background worker. Manual message synchronization uses a different response channel (`src/sync/runtime.ts:63-69`).

### ISSUE-003: Transport exceptions are not retried

- **Component and reference:** A thrown `fetch` exception immediately becomes `network_error` (`src/canvas/client.ts:225-233`). Only HTTP 429 and 5xx responses enter the bounded retry branch (`src/canvas/client.ts:239-247`).
- **Failure mode:** A transient connection reset, DNS interruption, or offline transition aborts the complete snapshot on its first occurrence. The service retains the old snapshot and records failure (`src/sync/sync-service.ts:140-160`), but recovery waits for a later alarm or user action.
- **Affected metrics:** Reliability primary; Availability secondary.
- **Severity and confidence:** **Medium, High confidence.** Cached-data retention limits the impact (`src/sync/sync-service.ts:115-160`), so this is not a High blocker by itself.
- **Scope:** Active production transport.

### ISSUE-004: Full snapshots serialize every per-course resource request

- **Component and reference:** The service awaits assignments and then announcements inside one loop over courses (`src/sync/sync-service.ts:178-203`). It buffers the whole snapshot before the one database transaction (`src/sync/sync-service.ts:205-209`, `src/storage/repository.ts:43-69`).
- **Failure mode:** For `C` active courses, the base request sequence is one course request plus two resource requests per course, before pagination. Latency is the sum of those request chains, and one late course delays all earlier data from becoming visible (`src/sync/sync-service.ts:170-203`).
- **Affected metrics:** Performance primary; Availability and Resource Efficiency secondary.
- **Severity and confidence:** **Medium, High confidence.** The workload belongs to one student rather than a shared service, but serial latency increases exposure to MV3 lifetime limits (`CODEBASE.md:31-32`, `src/sync/sync-service.ts:178-203`).
- **Scope:** Active production synchronization.

### ISSUE-005: Pagination and accumulated records have no hard bounds

- **Component and reference:** Pagination tracks previously visited URLs but continues for every new same-origin URL (`src/canvas/client.ts:191-210`). Each page is appended to an in-memory array with no page or record limit (`src/canvas/client.ts:192-212`).
- **Failure mode:** A malformed or unexpectedly large Canvas continuation chain can supply unique URLs indefinitely. The client continues issuing requests and growing both `visited` and `items` until the worker is terminated or the device exhausts available memory (`src/canvas/client.ts:191-210`).
- **Affected metrics:** Scalability primary; Reliability, Security Blast Radius, and Resource Efficiency secondary.
- **Severity and confidence:** **Medium, High confidence.** Exact-origin validation contains the network blast radius to SJSU Canvas (`src/canvas/client.ts:81-101`), and this is one local user, so a cloud-scale severity would be inflated.
- **Scope:** Active production pagination utility.

### ISSUE-006: Assignment and announcement state keys share one collision-prone namespace

- **Component and reference:** Assignment IDs and announcement IDs both use `${courseId}:${objectId}` (`src/domain/normalization.ts:160-176`, `src/domain/normalization.ts:200-213`). Both record types store hidden state in the same `item_states` table keyed only by `id` (`src/domain/models.ts:43-47`, `src/storage/database.ts:35-36`, `src/storage/database.ts:49-55`).
- **Failure mode:** If one course has an assignment and an announcement with the same object ID, hiding either writes the same `ItemState`. Both selectors consult that shared ID and hide both records (`src/dashboard/selectors.ts:102-108`, `src/dashboard/selectors.ts:208-225`). A note written for the assignment also occupies the announcement's state record (`entrypoints/options/App.tsx:235-256`).
- **Affected metrics:** Correctness and Data Integrity primary; Operability secondary.
- **Severity and confidence:** **High, High confidence.** The code assumes uniqueness across two separate Canvas object classes but does not encode the object class in the persisted key (`src/domain/normalization.ts:168-176`, `src/domain/normalization.ts:206-213`). The collision silently corrupts user-owned visibility state.
- **Scope:** Active production normalization, persistence, selectors, and dashboard.

### ISSUE-007: Unvalidated timestamps can crash the dashboard after a successful sync

- **Component and reference:** Normalization accepts any string as `due_at` or `posted_at` (`src/domain/normalization.ts:59-69`, `src/domain/normalization.ts:164-176`, `src/domain/normalization.ts:206-213`). Agenda classification throws for an invalid date (`src/domain/agenda.ts:101-117`), and display formatting also throws (`src/dashboard/formatters.ts:18-28`). Both functions execute during rendering (`entrypoints/options/App.tsx:177-207`, `entrypoints/options/App.tsx:117-120`, `entrypoints/options/App.tsx:457-460`).
- **Failure mode:** Canvas returns a non-empty malformed timestamp. Synchronization treats it as valid and atomically commits success metadata with the record (`src/sync/sync-service.ts:119-139`). The next live-query render parses the value, throws, and can replace the entire dashboard with an uncaught React error because this entry point defines no error boundary (`entrypoints/options/main.tsx:28-37`).
- **Affected metrics:** Correctness and Data Integrity primary; Reliability and Availability secondary.
- **Severity and confidence:** **High, High confidence.** One remote field can make every dashboard workflow unavailable after a nominally successful refresh.
- **Scope:** Active production trust boundary, storage, and rendering.

### ISSUE-008: Runtime failures collapse to generic or invisible outcomes

- **Component and reference:** `SyncResult` carries stable status and error codes (`src/sync/sync-service.ts:33-40`), but the dashboard reduces every non-success result to `Refresh failed` (`entrypoints/options/App.tsx:276-283`). Alarm completion is discarded without logging or another observable sink (`entrypoints/background.ts:50-53`).
- **Failure mode:** Authentication loss, throttling, malformed data, storage failure, and worker interruption cannot be distinguished from the UI. A rejected manual message clears loading in `finally` but sets no status because `refresh` has no `catch` (`entrypoints/options/App.tsx:276-286`).
- **Affected metrics:** Observability and Debuggability primary; Operability secondary.
- **Severity and confidence:** **Medium, High confidence.** The extension deliberately avoids sensitive payload logging, which is correct (`src/canvas/client.ts:32-45`), but stable privacy-safe codes already exist and are not presented (`src/domain/models.ts:55-68`).
- **Scope:** Active production background and dashboard.

### ISSUE-009: Release gates are local and omit E2E from the aggregate check

- **Component and reference:** `npm run check` runs formatting, lint, types, unit/integration tests, and a build, but not `test:e2e` (`package.json:6-19`). The repository has no tracked CI workflow and identifies all gates as local release requirements (`CODEBASE.md:222-229`).
- **Failure mode:** A release can pass the aggregate command while the packaged MV3 browser workflows are never exercised. A developer can also push without any remote system enforcing the local gate (`package.json:18-19`, `playwright.config.ts:7-22`).
- **Affected metrics:** Operability and Maintainability primary; Reliability secondary.
- **Severity and confidence:** **Medium, High confidence.** E2E tests exist and cover real extension workflows through an isolated profile (`README.md:68-71`), so the missing control is enforcement rather than test absence.
- **Scope:** Release process and tracked tooling.

### ISSUE-010: Hourly snapshots retain and refetch data outside the visible horizon

- **Component and reference:** Announcement requests specify ordering and page size but no time boundary (`src/sync/sync-service.ts:70-74`). All announcement pages are normalized and stored (`src/sync/sync-service.ts:194-209`, `src/storage/repository.ts:58-64`). The 365-day limit is applied only when selecting UI data (`src/dashboard/selectors.ts:26-27`, `src/dashboard/selectors.ts:183-198`). Local course preferences and item state are preserved across replacement and are not pruned (`src/storage/repository.ts:43-69`).
- **Failure mode:** Every hourly sync can transfer and parse announcements that the UI will never show. Stale course preferences and item-state rows can accumulate after their remote objects disappear because only remote tables are cleared (`src/storage/repository.ts:58-64`).
- **Affected metrics:** Resource Efficiency and Cost primary; Performance and Scalability secondary.
- **Severity and confidence:** **Medium, High confidence.** Cost is local network, CPU, memory, and IndexedDB use for one user, not cloud spend (`README.md:31-33`).
- **Scope:** Active production synchronization and local retention.

### ISSUE-011: Long-open dashboards do not advance time-dependent views

- **Component and reference:** `dashboardNow` is sampled during render and drives due buckets, announcement age, and stale state (`entrypoints/options/App.tsx:177-207`). The only timer triggers removal of a refresh-success alert and does not update time (`entrypoints/options/App.tsx:209-219`).
- **Failure mode:** If the Options tab remains open without another state or database update, an item does not move from Today to Overdue, announcements do not age out, and a fresh snapshot does not become stale after two hours. The selectors are correct for the supplied instant (`src/dashboard/selectors.ts:153-180`, `src/dashboard/selectors.ts:290-307`), but the supplied instant does not advance.
- **Affected metrics:** Domain-Specific Attributes primary; Correctness and Observability secondary.
- **Severity and confidence:** **Medium, High confidence.** Pacific-time categorization is a core product contract (`README.md:12-13`), but reloading the tab recovers immediately.
- **Scope:** Active production dashboard.

## Remediation bucket B1: Bounded, lifecycle-safe synchronization

**Issues:** ISSUE-001, ISSUE-002, ISSUE-003.

**Chosen solution, rating 5/5:** Introduce one synchronization execution budget that propagates an `AbortSignal` through `SyncService` and `CanvasHttpClient`, classifies deadline expiry separately, retries only safe transient failures within the remaining budget using bounded jitter, and makes every trigger own or durably resume its completion. This is a Staff-level fix because it establishes one enforceable lifecycle invariant instead of adding unrelated timeouts (`src/canvas/client.ts:21-30`, `src/sync/sync-service.ts:42-52`, `src/sync/runtime.ts:18-27`).

For alarm execution, checkpoint the attempt before network work and make interruption recoverable on the next worker start. The Chrome alarm callback itself has a void contract, and extension workers must tolerate unexpected termination [Chrome alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms), [Chrome extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

| Issue | Resolution mechanism |
| :-- | :-- |
| ISSUE-001 | A hard end-to-end deadline settles the active run and therefore releases `#runQueue` (`src/sync/sync-service.ts:104-112`). |
| ISSUE-002 | Durable attempt state plus startup recovery makes an interrupted alarm observable and retryable (`src/sync/runtime.ts:74-89`, `src/domain/models.ts:55-68`). |
| ISSUE-003 | A budget-aware transient retry policy covers network exceptions as well as retryable HTTP responses (`src/canvas/client.ts:225-247`). |

**Alternatives rejected:** A UI-only timeout would stop the spinner but leave the queue blocked. Removing trigger serialization would allow stale snapshots to overwrite newer ones, contradicting the existing ordering contract (`tests/integration/sync-concurrency.test.ts:34-66`).

**Effort and risk:** 2 to 3 engineering days. Medium implementation risk because abort propagation changes transport and trigger contracts, but snapshot transactions remain unchanged (`src/storage/repository.ts:43-69`).

**Validation:** Add immutable tests for a never-settling fetch, deadline classification, queue recovery after timeout, transient exception retry limits, interrupted alarm recovery, and manual refresh completion. Run `npm run check` and the packaged MV3 E2E suite defined by `playwright.config.ts:7-22`.

## Remediation bucket B2: Typed persisted identities and boundary validation

**Issues:** ISSUE-006, ISSUE-007.

**Chosen solution, rating 5/5:** Version the domain schema so every persisted remote and local-state key is namespaced by record kind, such as `courseId:assignment:objectId` and `courseId:announcement:objectId`, and validate all Canvas records before commit with explicit nullable ISO-instant parsing. Invalid optional timestamps should normalize to `null`; invalid required identities should reject the snapshot with a stable code (`src/storage/database.ts:41-56`, `src/domain/normalization.ts:34-43`, `src/domain/normalization.ts:59-69`).

Use a Dexie version upgrade to migrate existing assignment state deterministically. Existing untyped announcement state cannot be distinguished from assignment state when IDs collide, so the migration must preserve it in a reviewable quarantine record or choose and document one owner rather than copying it to both (`src/storage/database.ts:49-56`, `src/domain/models.ts:43-47`).

| Issue | Resolution mechanism |
| :-- | :-- |
| ISSUE-006 | Record-kind namespacing makes cross-type collisions impossible in the shared state table (`src/domain/normalization.ts:168-176`, `src/domain/normalization.ts:206-213`). |
| ISSUE-007 | Boundary validation prevents invalid dates from reaching throwing selectors and formatters (`src/domain/agenda.ts:101-117`, `src/dashboard/formatters.ts:18-28`). |

**Alternatives rejected:** Separate ad hoc maps in React would leave persisted corruption intact. Catching render errors would preserve a shell but still commit invalid data as a successful snapshot (`src/sync/sync-service.ts:119-139`).

**Effort and risk:** 3 to 5 engineering days. High migration risk because user notes and hidden state are durable local data (`src/storage/repository.ts:102-115`).

**Validation:** Add collision fixtures with equal assignment and announcement object IDs, migration tests from schema version 1, malformed and out-of-range timestamp contracts, and a component test proving one bad timestamp cannot crash the dashboard. Preserve all existing repository assertions (`tests/spec/storage-repository.spec.ts:25-184`).

## Remediation bucket B3: Bounded snapshot acquisition and retention

**Issues:** ISSUE-004, ISSUE-005, ISSUE-010.

**Chosen solution, rating 4/5:** Keep the atomic complete-snapshot contract, but add explicit maximum pages and records per resource, a small per-course concurrency limit, and retention-aware announcement queries or local pruning. Prune orphaned `item_states` and course preferences only after a successful complete snapshot, while preserving current-course user state (`src/sync/sync-service.ts:164-209`, `src/storage/repository.ts:43-69`).

The rating is 4/5 because this is a strong production pattern for a single-user extension, but exact Canvas API date-filter support must be verified before choosing server-side filtering. A safe fallback is bounded fetch plus post-commit local retention.

| Issue | Resolution mechanism |
| :-- | :-- |
| ISSUE-004 | A small concurrency pool reduces additive latency without unbounded fan-out or partial writes (`src/sync/sync-service.ts:178-203`). |
| ISSUE-005 | Page and record ceilings turn malformed continuation chains into a bounded `invalid_response` failure (`src/canvas/client.ts:191-212`). |
| ISSUE-010 | Successful-snapshot pruning removes data outside product retention while preserving transaction integrity (`src/storage/repository.ts:43-69`). |

**Alternatives rejected:** Streaming partial courses into IndexedDB would violate atomic snapshot semantics and existing failure retention (`src/sync/sync-service.ts:115-160`). Unlimited `Promise.all` would trade serial latency for request bursts against Canvas.

**Effort and risk:** 3 to 4 engineering days. Medium risk because ordering and rate-limit behavior need load-shaped tests.

**Validation:** Add maximum-page, maximum-record, concurrency-cap, 429-under-concurrency, orphan-pruning, and one-year-retention tests. Assert that a failed later course still leaves the prior snapshot unchanged (`tests/integration/sync-service.test.ts:170-216`).

## Remediation bucket B4: Actionable local health and time progression

**Issues:** ISSUE-008, ISSUE-011.

**Chosen solution, rating 4/5:** Define a privacy-safe health presenter over existing stable sync codes and add a low-frequency clock state that updates at the next relevant boundary. Show distinct actions for sign-in, retry-later, offline, malformed-response, storage, and timeout states without displaying Canvas payloads (`src/domain/models.ts:55-68`, `entrypoints/options/App.tsx:276-286`).

| Issue | Resolution mechanism |
| :-- | :-- |
| ISSUE-008 | Stable status-to-action mapping makes manual failures actionable and records interrupted alarm attempts (`src/sync/sync-service.ts:33-40`, `src/domain/models.ts:55-68`). |
| ISSUE-011 | A scheduled state update re-runs pure selectors when a due, age, or stale boundary is crossed (`entrypoints/options/App.tsx:177-207`). |

**Alternatives rejected:** Console-only logging is not durable across MV3 worker termination and is not visible to the normal user. A one-second interval wastes local resources when the next boundary can be computed (`src/domain/agenda.ts:72-90`, `src/dashboard/selectors.ts:290-307`).

**Effort and risk:** 1 to 2 engineering days. Low implementation risk because the selectors already accept an explicit `Date` (`src/dashboard/selectors.ts:154-180`, `src/dashboard/selectors.ts:291-307`).

**Validation:** Add status mapping tests, a rejected-message component test, fake-timer tests at midnight and the two-hour stale boundary, and an E2E assertion that a long-open page advances without reload.

## Remediation bucket B5: Enforced release evidence

**Issues:** ISSUE-009.

**Chosen solution, rating 4/5:** Add a pinned CI workflow that installs with `npm ci`, runs the non-browser gate, builds the exact MV3 artifact, then runs Playwright E2E against that artifact. Make the workflow a required branch check for the release path. The repository already defines deterministic scripts and a lockfile (`package.json:6-24`, `package-lock.json:1-49`).

| Issue | Resolution mechanism |
| :-- | :-- |
| ISSUE-009 | Required CI converts documented local commands into reproducible release evidence and includes the currently separate E2E suite (`package.json:13-19`, `README.md:57-71`). |

**Alternatives rejected:** Updating `npm run check` alone still leaves enforcement on one workstation. A CI job without E2E would not exercise the packaged service worker and IndexedDB workflows covered by the browser suite (`tests/e2e/dashboard.e2e.ts:8-238`).

**Effort and risk:** 0.5 to 1 engineering day. Low product risk and medium CI-flake risk because Playwright uses one worker and no retries (`playwright.config.ts:14-22`).

**Validation:** Require a clean CI run on the release commit, preserve traces and screenshots on failure (`playwright.config.ts:17-22`), and verify branch protection rejects a commit with a deliberately failing temporary test before removing that test.

## Traceability matrix

| Issue | Bucket | Primary metric | Secondary metrics |
| :-- | :-- | :-- | :-- |
| ISSUE-001 | B1 | Reliability | Availability, Operability, Domain-Specific |
| ISSUE-002 | B1 | Availability | Reliability, Observability |
| ISSUE-003 | B1 | Reliability | Availability |
| ISSUE-004 | B3 | Performance | Availability, Resource Efficiency |
| ISSUE-005 | B3 | Scalability | Reliability, Security Blast Radius, Resource Efficiency |
| ISSUE-006 | B2 | Correctness | Operability |
| ISSUE-007 | B2 | Correctness | Reliability, Availability |
| ISSUE-008 | B4 | Observability | Operability |
| ISSUE-009 | B5 | Operability | Reliability |
| ISSUE-010 | B3 | Resource Efficiency | Performance, Scalability |
| ISSUE-011 | B4 | Domain-Specific | Correctness, Observability |

Every issue maps to exactly one primary bucket. Every bucket has one cohesive remediation and an issue-by-issue resolution mechanism.

## Positive controls and rejected false positives

1. **Remote request blast radius is constrained.** Initial and pagination URLs require the exact SJSU HTTPS origin and `/api/v1/` path, and requests are GET-only with credentials scoped to that origin (`src/canvas/client.ts:81-117`, `src/canvas/client.ts:221-230`). No SSRF or write-capability finding survived.
2. **Rendered Canvas content is inert.** Announcement markup is parsed, executable and non-visible nodes are removed, normalized text is rendered by React, and deep links require the exact trusted origin (`src/security/announcement-text.ts:40-63`, `src/security/canvas-links.ts:13-28`, `entrypoints/options/App.tsx:435-475`). No XSS finding survived.
3. **Snapshot integrity is strong.** Remote stores and success metadata commit in one Dexie transaction, while failed synchronization preserves the prior snapshot and success time (`src/storage/repository.ts:36-69`, `src/sync/sync-service.ts:115-160`). No partial-commit finding survived.
4. **Concurrency ordering is deliberate.** Trigger runs serialize through a failure-safe promise tail, and tests verify that later snapshots commit last and the queue continues after classified failure (`src/sync/sync-service.ts:104-112`, `tests/integration/sync-concurrency.test.ts:34-99`). The review does not recommend removing serialization.
5. **Permissions are proportionate.** The manifest requests only `alarms` and the one Canvas host, with a self-only extension-page CSP (`wxt.config.ts:9-29`). Missing cookie, tabs, scripting, or broad-host permissions are not defects for this design (`README.md:24-29`).

## Assumptions and unverified items

| Item | Status | Evidence and validation instruction |
| :-- | :-- | :-- |
| Runtime target is current Brave/Chromium MV3 on one desktop profile | Assumed | The product declares Brave, local-only, single-user scope (`README.md:5-8`, `README.md:31-38`). Record the minimum supported Brave version before release and test that version. |
| Canvas workload size and worst-case latency | UNVERIFIED | No production account, traffic capture, or latency data was used. Run a privacy-safe diagnostic that records only counts, page counts, and duration, consistent with the metadata-only diagnostic contract (`src/diagnostic/contracts.ts:18-24`, `src/diagnostic/run-canvas-diagnostic.ts:41-52`). |
| Production dependency advisory status | VERIFIED after remediation | `npm audit --audit-level=high` reports 0 vulnerabilities against the current lockfile. |
| Production build and packaged E2E result at this HEAD | VERIFIED after remediation | `npm run check` passes 18 files / 80 assertions and the production build; `npm run test:e2e` passes 12/12 isolated Chromium workflows. |
| Static and Vitest baseline | VERIFIED in this review | `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test` completed successfully. Vitest reported 16 files and 76 tests passed. The commands are defined in `package.json:6-18`. |

## References

### Repository references

- Architecture and environment boundary: `CODEBASE.md:12-21`, `CODEBASE.md:42-57`.
- MV3 composition and lifecycle: `entrypoints/background.ts:34-90`, `src/sync/runtime.ts:39-90`.
- Transport and pagination: `src/canvas/client.ts:81-117`, `src/canvas/client.ts:177-263`.
- Persistence and synchronization: `src/storage/repository.ts:28-84`, `src/sync/sync-service.ts:104-210`.
- Domain trust boundary and rendering: `src/domain/normalization.ts:34-69`, `entrypoints/options/App.tsx:135-292`.

### Upstream references

- [Chrome extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle): worker termination, fetch response limit, and interruption resilience.
- [Chrome alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms): alarm callback contract, scheduling behavior, persistence, and delayed firing.
- [Chrome extension message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging): asynchronous response channels and multiple-listener behavior.
- [MDN AbortSignal.timeout](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static): bounded fetch cancellation primitive.

## Release blocker checklist

| Blocker | Required closure evidence |
| :-- | :-- |
| ISSUE-001 | Never-settling fetch test proves deadline settlement and subsequent queue recovery. |
| ISSUE-002 | Packaged MV3 test proves an interrupted alarm attempt is durably detected and recovered. |
| ISSUE-006 | Schema migration and equal-object-ID test prove assignment and announcement state isolation. |
| ISSUE-007 | Malformed timestamp integration and component tests prove no successful sync can brick rendering. |

The release verdict changes to READY only after all four rows pass, all existing assertions remain unchanged, and the complete release gate in B5 is green.
