# Canvas Aggregator Architecture Decisions

Last updated: 2026-08-24

## ADR-001: Local-Only Deployment

Status: Accepted

### Context

The application is a personal tool for managing one semester's workload.

### Decision

v1 will be locally hosted. Cloud hosting is excluded.

### Consequences

The design does not need cloud infrastructure or multi-tenant isolation. Local
startup, secret storage, data paths, and backup behavior still require explicit
requirements.

## ADR-002: Read-Only Canvas Integration for v1

Status: Accepted

### Context

The product is intended to improve Canvas aggregation and viewing, not replace
Canvas coursework workflows.

### Decision

v1 will not submit coursework or edit Canvas data or state.

### Consequences

The v1 Canvas integration can be constrained to read operations. Any future
write capability requires a new ADR, permission model, and safety review.

## ADR-003: Separate Requirements and Implementation Planning

Status: Accepted

### Context

Requirements describe desired behavior; implementation planning describes how
approved behavior will be built.

### Decision

Requirements are maintained in `REQUIREMENTS.md`. `PLAN.md` contains only the
implementation plan.

### Consequences

Requirement changes must be approved before corresponding plan changes are
finalized.

## ADR-004: Mutually Exclusive Agenda Groups

Status: Accepted

### Context

Relative date ranges naturally overlap. Duplicate display would make the agenda
noisy and could distort workload perception.

### Decision

Each item will be assigned to exactly one date group. Required groups are
overdue, today, tomorrow, days 2-7, days 8-14, and day 15 onward. The handling
of items due earlier today remains a requirements decision.

### Consequences

Date classification requires centralized, explicitly tested boundary rules and
a defined local timezone.

## ADR-005: Defer Intelligent and Agentic Actions to v2

Status: Accepted

### Context

AI prioritization and user-approved assignment completion are desired future
capabilities but are outside the read-only viewer scope.

### Decision

AI-generated prioritization and user-approved assignment completion are v2
goals, not v1 implementation work.

### Consequences

v1 must not silently introduce Canvas write permissions or autonomous execution.
v2 will require separate requirements and safety decisions.

## ADR-006: Limit the Main Agenda to Assignments and Quizzes

Status: Accepted

### Context

The main workflow is tracking coursework that may require submission. Canvas
discussions and calendar events would add noise to this view.

### Decision

The main v1 agenda will include assignments and quizzes from course Assignment
areas. Discussions and calendar events are excluded.

### Consequences

The ingestion layer needs explicit type filtering and test coverage for Canvas
items whose API representations differ from their Canvas UI labels.

## ADR-007: Use a Separate Announcements Page

Status: Accepted

### Context

Announcements generally do not have due dates and do not fit the agenda's date
groups.

### Decision

Announcements will appear on a separate page and be grouped or sorted by course
subject.

### Consequences

Announcement ingestion and presentation remain isolated from deadline
classification.

## ADR-008: Remove Canvas-Submitted Items After Refresh

Status: Accepted

### Context

The active agenda should represent remaining work. Canvas is authoritative for
submission state.

### Decision

An item will disappear from the active agenda after a successful refresh reports
it as submitted in Canvas.

### Consequences

The interface may show stale submission state until refresh completes. Partial
or failed refreshes must not remove cached items.

## ADR-009: Support Manual and Periodic Refresh

Status: Accepted

### Context

Manual refresh provides immediate control, while periodic refresh limits the
chance of missed Canvas changes.

### Decision

v1 will support both manual and automatic periodic refresh. Cached data remains
visible with a stale-data warning when Canvas is unavailable.

### Consequences

The refresh interval, runtime model, retry behavior, and authentication-expiry
experience still require decisions.

## ADR-010: Desktop Agenda-Only Experience

Status: Accepted

### Context

The tool is intended for the user's desktop. Phone support and calendar views
are not needed.

### Decision

v1 will provide a desktop agenda-list experience. Responsive phone support and
calendar views are excluded.

### Consequences

Neither a mobile interface nor a calendar visualization is needed.

## ADR-011: Use a Tokenless Exact-Host Browser Extension

Status: Accepted

### Context

SJSU Canvas does not expose personal token creation for this account. The user
already has an authenticated Brave session and does not want credential storage,
DOM scraping, cloud hosting, or daily-profile automation.

### Decision

Build a local Manifest V3 extension with host access limited to
`https://sjsu.instructure.com/*`. Use only read-only Canvas JSON requests made
from the extension background context. A live diagnostic is a hard feasibility
gate; failed session access triggers redesign with no scraping fallback.

### Consequences

The extension stores no Canvas token or cookie. Runtime behavior depends on the
user remaining signed in to Canvas in the same Brave profile.

## ADR-012: Use WXT, React, Mantine, and Dexie

Status: Accepted

### Context

The application requires an extension service worker, a multi-section desktop
interface, durable structured state, and automated tests. Expected code size is
well above the user's threshold for framework use.

### Decision

Use WXT with React and TypeScript, Mantine for the token-based dark interface,
and Dexie over IndexedDB as the single durable data source.

### Consequences

The application avoids a local server and duplicated query caches. UI state is
kept transient while Canvas snapshots and local organization survive restarts.

## ADR-013: Atomic Read-Only Synchronization

Status: Accepted

### Context

Partial Canvas responses could incorrectly hide outstanding work.

### Decision

Fetch and validate a full remote snapshot before replacing cached remote data in
one Dexie transaction. Canvas submission state controls active visibility;
local notes and hidden state are maintained separately by stable Canvas IDs.

### Consequences

Any failed page or course request keeps the previous complete snapshot and
produces an explicit stale/error state.

## ADR-014: Lock Official Phase 2 Canvas Query Shapes

Status: Accepted

### Decision

Course synchronization uses active student courses with term inclusion and
`per_page=100`. Assignment requests use `include[]=submission`,
`order_by=due_at`, `override_assignment_dates=true`, and `per_page=100`.
Announcement requests use `only_announcements=true`,
`order_by=recent_activity`, and `per_page=100`.

### Consequences

The rejected `effective_due_dates` include is not sent. Effective assignment
override dates come from Canvas's `override_assignment_dates` behavior.

## ADR-015: Treat Pagination Links as Trusted Opaque API Continuations

Status: Accepted

### Decision

Follow `rel=next` URLs only when they are absolute HTTPS URLs on the exact SJSU
Canvas origin and under `/api/v1/`. Track visited URLs and fail with
`invalid_response` on cycles, relative URLs, external origins, or non-API paths.

### Consequences

Canvas controls page tokens and ordering without allowing redirect or SSRF-style
escape from the approved API boundary.

## ADR-016: Return Manual Synchronization Results

Status: Accepted

### Decision

The background runtime returns the `SyncResult` for the explicit
`RUN_CANVAS_SYNC` message. Startup and alarm triggers remain fire-and-observe
background operations.

### Consequences

The dashboard can show immediate success/auth/network state without querying a
second transient store. Durable sync metadata remains the source after reload.

## ADR-017: Add Production-Readiness Review Release Gate

Status: Accepted

### Decision

Phase 4 invokes the `production-readiness-review` skill and writes one cited,
metric-by-metric report to `.agent-tasks/PRODUCTION_READINESS_REVIEW.md`.
Critical and High findings block the release candidate until resolved or
explicitly accepted by the user.

### Consequences

Security review remains a separate adversarial gate. The readiness report must
cover all ten required metrics, trace every finding to file lines, and record
unverified live-browser assumptions with manual validation instructions.

## ADR-018: Commit Success Metadata With the Remote Snapshot

Status: Accepted

### Decision

Successful synchronization writes the complete remote snapshot and its counts,
attempt time, and success time in one Dexie transaction. Failed synchronization
writes only attempt/error metadata and preserves both the prior remote snapshot
and prior successful-sync time.

### Consequences

The dashboard cannot observe a new snapshot paired with stale success metadata.
A failed refresh remains visible as an error while cached course data stays
internally consistent and usable.

## ADR-019: Isolate Browser Events Behind a Runtime Adapter

Status: Accepted

### Decision

`SyncRuntime` depends on a narrow alarm/message adapter and a synchronization
runner rather than importing WXT browser globals. Listener registration is
idempotent, and alarm configuration is verified before startup synchronization.

### Consequences

Scheduling and dispatch behavior can be tested without an extension profile.
`entrypoints/background.ts` remains the only composition boundary translating
WXT browser events into these internal interfaces.

## ADR-020: Permit Await-Free Async Fakes Only in Tests

Status: Accepted

### Decision

Disable `@typescript-eslint/require-await` only for `tests/**/*.{ts,tsx}`.
Production files retain the strict rule. Test doubles may return immediately
resolved Promises when modeling asynchronous browser and transport contracts.

### Consequences

Tests avoid artificial awaits and remain readable without weakening production
linting. Assertions and runtime semantics are unchanged.

## ADR-021: Serialize Concurrent Synchronization Triggers

Status: Accepted for implementation

### Context

Manual and alarm events can overlap. Atomic transactions prevent partial
snapshots but do not prevent an older request from committing after a newer one.

### Decision

Queue each `SyncService.run(trigger)` invocation and execute complete runs one at
a time. Each caller receives the result for its own trigger. A rejected
alternative is coalescing concurrent calls because a manual caller could receive
an alarm-triggered result and no fresh post-alarm read.

### Consequences

Snapshots commit in trigger arrival order and cannot overwrite newer data with
an older in-flight response. A failed run must release the queue so the next
trigger still executes.

## ADR-022: Keep Dashboard Selection Pure and React Composition Thin

Status: Accepted

### Decision

Dexie live queries provide durable records to pure `src/dashboard` selectors.
Selectors own enabled-course filtering, completed/hidden exclusion, exclusive
agenda grouping, announcement grouping/sorting, and stale-state derivation.
React components own only transient filters, navigation, rendering, and calls
to repository/background actions.

### Consequences

Critical organization behavior is deterministic and frozen independently of
Mantine or IndexedDB timing. The rejected alternative is embedding joins and
date rules directly in React components, which would couple correctness to
render lifecycle and make boundary testing brittle.

## ADR-023: Reuse Existing Runtime UI, Live-Query, and Sanitization Dependencies

Status: Accepted

### Decision

Phase 3 adds no runtime package. Use Mantine controls, `dexie-react-hooks`,
native `Intl`, and the existing inert announcement-text conversion. Add the
already approved `@playwright/test` development dependency because the repository
does not yet contain the required isolated-profile E2E runner. Production
browser message and database dependencies are passed into `App` from `main.tsx`
so component tests can use isolated deterministic adapters.

### Consequences

The dashboard remains independently testable without mocking an everyday Brave
profile. Runtime supply-chain surface does not expand; development tooling does.

## ADR-024: Route Fake Canvas Responses at the Isolated Browser Boundary

Status: Accepted

### Decision

Use Playwright's bundled Chromium, `launchPersistentContext("")`,
`channel: "chromium"`, and extension load flags. Discover the MV3 extension ID
from the service worker. Intercept exact SJSU Canvas requests through the
Chromium context and return deterministic JSON fixtures.

### Consequences

E2E exercises the production background/client/storage/dashboard path without a
production-only fake hook, real Canvas credentials, or the everyday Brave
profile. This follows current official Playwright extension guidance.

## ADR-025: Delegate Default Fetch Dynamically in CanvasHttpClient

Status: Accepted

### Context

When running in an extension service worker, `CanvasHttpClient` instantiated during background startup captures the global `fetch`. In Playwright E2E testing with isolated browser contexts, tests configure network mocks via worker context evaluation. Statically capturing `fetch` at construction time bypasses worker evaluation mocks.

### Decision

In `CanvasHttpClient`, if `options.fetch_fn` is not provided, delegate to `(input, init) => globalThis.fetch(input, init)` rather than capturing a static `fetch` function pointer at construction time.

### Consequences

Ensures test environments can route network traffic via `serviceWorker.evaluate` or global fetch patching without modifying production wiring or introducing test-only backdoor hooks.

## ADR-026: Include Graded Discussion Assignments with Due Dates in Agenda

Status: Accepted

### Context

Canvas assignments can have `submission_types: ["discussion_topic"]`. When these items have explicit `due_at` timestamps, they represent graded deliverables and milestone coursework (common in capstone and project courses). Blanket exclusion caused active coursework to be missed in the student agenda.

### Decision

In `normalizeAssignment`, allow assignments with `submission_types: ["discussion_topic"]` as long as `due_at` is non-null and defined. Continue to return `null` for purely undated discussion topics.

### Consequences

Ensures graded project discussions with deadlines are captured in the Pacific-time agenda buckets while preventing undated general forum topics from cluttering coursework.

## ADR-027: Persist Announcement Hidden State in item_states with Stable Keys

Status: Accepted

### Context

Users need the ability to hide announcements they deem irrelevant while retaining the ability to view and restore them later under "Hidden Items".

### Decision

Reuse the existing `item_states` Dexie table to store `{ id: announcement.id, hidden: true, note: "" }` keyed by the stable `${courseId}:${announcementId}` format. `selectAnnouncementsByCourse` filters hidden announcements, and `selectHiddenAnnouncements` provides the list for the "Hidden Announcements" section in the Hidden Items tab.

### Consequences

Avoids adding new schema versions or tables to Dexie; maintains atomic persistence and local durability across Canvas snapshot refreshes.

## ADR-028: Keep Final Dashboard Refinements in the Presentation Layer

Status: Accepted

### Context

Old announcements and empty agenda headings add visual noise, while branding and
refresh confirmation need clearer dashboard treatment. These refinements do not
change Canvas synchronization or durable data ownership.

### Decision

Retain complete Canvas snapshots and apply an inclusive 365-day announcement
window only in dashboard selectors. Unknown announcement timestamps remain
visible; invalid timestamps do not. Derive non-empty agenda groups from the
canonical bucket selector. Display the bundled 48px icon beside the title and
auto-dismiss successful refresh feedback after four seconds while keeping
failure feedback visible.

### Consequences

No Dexie migration, Canvas query, permission, or background change is required.
Old announcements remain cached and can reappear only if the presentation rule
changes. Existing canonical bucket and sync contracts remain intact.

## ADR-029: Harden Release Boundaries Without Breaking v1 State Contracts

Status: Accepted for Phase 4 implementation

### Context

The production-readiness audit found three active release blockers: an
unbounded Canvas request can hold the serialized refresh queue, assignment and
announcement IDs can collide in the shared local-state namespace, and malformed
Canvas timestamps can reach throwing date formatters. Existing frozen contracts
require unchanged fetch options and legacy state keys for non-colliding items.

### Decision

1. Bound each Canvas fetch wait to 30 seconds with a privacy-safe
   `network_error`, while preserving the existing GET request shape.
2. Preserve legacy state IDs for ordinary records. When an agenda item and an
   announcement share the same stable ID, use `agenda:<id>` and
   `announcement:<id>` and ignore ambiguous legacy state for that collision.
3. Normalize invalid optional Canvas timestamps to `null` before persistence.
4. Treat MV3 alarm interruption as a documented Medium residual risk, not a
   High defect. Chrome alarm callbacks are void; atomic snapshots, startup sync,
   hourly retry, and stale-cache retention provide recovery without claiming a
   promise-based service-worker lifetime guarantee.

### Consequences

No database schema migration or existing test modification is required.
Existing local state remains readable except an inherently ambiguous legacy
record whose ID currently collides across Canvas object classes. A timed-out GET
may still finish at the browser network layer, but its result is ignored and the
application queue is released; requests remain read-only and fixed-origin.

## ADR-030: Apply Shared Presentation Recency and Responsive Branding

Status: Accepted

### Context

Historical due-dated coursework can remain unsubmitted in Canvas indefinitely
and add no value to a current semester agenda. At narrow desktop widths,
Mantine's image default width stretched the 48px icon while the adjacent title
was compressed to one word per line.

### Decision

Apply the existing inclusive 365-day presentation cutoff to dated agenda items
and hidden assignments. Preserve undated items because the normalized v1 schema
has no reliable age field for them. Keep all remote records cached. Give the
dashboard icon an explicit 48x48 flex basis, keep the title on one line, and
allow the Refresh action to wrap below the brand at narrow widths.

### Consequences

No Canvas query, Dexie schema, permission, or synchronization behavior changes.
Exactly-one-year-old work remains visible; older due-dated work is omitted from
Agenda and Hidden Items. The production header remains readable at 420px with
no horizontal overflow.
