# Canvas Aggregator Architecture Decisions (v0.1.0 Legacy)

Last updated: 2026-08-24

- **ADR-001: Local-Only Deployment**: Accepted. v1 will be locally hosted, and cloud hosting is excluded.
- **ADR-002: Read-Only Canvas Integration for v1**: Accepted. v1 Canvas integration is constrained to read-only operations, and coursework submission/state editing is excluded.
- **ADR-003: Separate Requirements and Implementation Planning**: Accepted. Requirements are maintained in `REQUIREMENTS.md`, and `PLAN.md` contains only the implementation plan.
- **ADR-004: Mutually Exclusive Agenda Groups**: Accepted. Each item in the agenda is assigned to exactly one date group (overdue, today, tomorrow, days 2-7, days 8-14, or day 15 onward).
- **ADR-005: Defer Intelligent and Agentic Actions to v2**: Accepted. AI prioritization and assignment completion are deferred to v2 and excluded from v1.
- **ADR-006: Limit the Main Agenda to Assignments and Quizzes**: Accepted. The main v1 agenda is limited to assignments and quizzes, excluding discussions and calendar events.
- **ADR-007: Use a Separate Announcements Page**: Accepted. Announcements appear on a separate page grouped or sorted by course subject.
- **ADR-008: Remove Canvas-Submitted Items After Refresh**: Accepted. An item is removed from the active agenda once a successful refresh reports it as submitted.
- **ADR-009: Support Manual and Periodic Refresh**: Accepted. v1 supports both manual and automatic periodic refresh, showing stale-data warnings if Canvas is offline.
- **ADR-010: Desktop Agenda-Only Experience**: Accepted. v1 provides a desktop agenda-list experience, excluding mobile support and calendar views.
- **ADR-011: Use a Tokenless Exact-Host Browser Extension**: Accepted. Build a local Manifest V3 extension with host access limited to `https://sjsu.instructure.com/*` using the user's authenticated Brave session.
- **ADR-012: Use WXT, React, Mantine, and Dexie**: Accepted. Use WXT with React/TypeScript, Mantine for dark styling, and Dexie over IndexedDB as the durable store.
- **ADR-013: Atomic Read-Only Synchronization**: Accepted. Fetch and validate a full remote snapshot before replacing cached data in a single Dexie transaction.
- **ADR-014: Lock Official Phase 2 Canvas Query Shapes**: Accepted. Course sync queries active student courses, while assignment/announcement queries use locked query parameter shapes.
- **ADR-015: Treat Pagination Links as Trusted Opaque API Continuations**: Accepted. Follow `rel=next` pagination URLs only when they are absolute HTTPS URLs on the exact SJSU Canvas origin under `/api/v1/`.
- **ADR-016: Return Manual Synchronization Results**: Accepted. The background runtime returns a structured sync result for manual refresh requests.
- **ADR-017: Add Production-Readiness Review Release Gate**: Accepted. Phase 4 requires a Cited Production-Readiness Review report, blocking release on Critical or High findings.
- **ADR-018: Commit Success Metadata With the Remote Snapshot**: Accepted. Successful sync writes the remote snapshot and its counts/times in one transaction, while failures write only error metadata.
- **ADR-019: Isolate Browser Events Behind a Runtime Adapter**: Accepted. `SyncRuntime` interacts with browser features via a narrow adapter interface to remain testable without WXT globals.
- **ADR-020: Permit Await-Free Async Fakes Only in Tests**: Accepted. Disable async-require-await lint checks only in test directories, keeping production under the strict check.
- **ADR-021: Serialize Concurrent Synchronization Triggers**: Accepted. Queue each sync run and execute them serially to prevent older in-flight requests from committing after newer ones.
- **ADR-022: Keep Dashboard Selection Pure and React Composition Thin**: Accepted. Dexie live queries feed pure selectors that own filtering/exclusion/bucketing logic, keeping React components thin and presentation-only.
- **ADR-023: Reuse Existing Runtime UI, Live-Query, and Sanitization Dependencies**: Accepted. Use existing Mantine, Dexie live query, and sanitization packages rather than adding new runtime dependencies.
- **ADR-024: Route Fake Canvas Responses at the Isolated Browser Boundary**: Accepted. Intercept exact SJSU Canvas API requests within Playwright's headless Chromium test runner to return local JSON fixtures.
- **ADR-025: Delegate Default Fetch Dynamically in CanvasHttpClient**: Accepted. Delegate dynamic fetch calls to `globalThis.fetch` in `CanvasHttpClient` rather than capturing a static pointer at construction time.
- **ADR-026: Include Graded Discussion Assignments with Due Dates in Agenda**: Accepted. Graded discussions with explicit due dates are included in the agenda, while undated discussion topics remain excluded.
- **ADR-027: Persist Announcement Hidden State in item_states with Stable Keys**: Accepted. Store the hidden state of announcements in the existing `item_states` Dexie table using a stable key.
- **ADR-028: Keep Final Dashboard Refinements in the Presentation Layer**: Accepted. Apply visual rules (empty agenda headings, 365-day announcement window, brand layout, refresh feedback auto-dismiss) in selectors and styling.
- **ADR-029: Harden Release Boundaries Without Breaking v1 State Contracts**: Accepted. Bound fetch calls to 30 seconds, resolve ID collisions with namespaces, normalize invalid timestamps, and treat alarm limits as accepted risk.
- **ADR-030: Apply Shared Presentation Recency and Responsive Branding**: Accepted. Apply 365-day presentation cutoff to dated agenda items and hidden items, and ensure layout responsiveness at narrow desktop sizes.
