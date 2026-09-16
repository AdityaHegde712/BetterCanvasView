# Canvas Aggregator Requirements

Status: Approved for v1 implementation  
Last updated: 2026-08-24

## 1. Purpose

Create a personal, local-only aggregator and viewer for one SJSU Canvas account
at `sjsu.instructure.com`. The extension must make upcoming academic work easy
to scan while preserving Canvas as the authority for due and submission state.

This document contains product requirements. Implementation sequencing belongs
in `PLAN.md`, architectural rationale in `DECISIONS.md`, and status in
`TASKS.md`.

## 2. v1 Functional Requirements

### 2.1 Platform and Navigation

1. Run as an unpacked Manifest V3 Brave extension on desktop.
2. Open a full-page dashboard in a normal browser tab from the extension action.
3. Provide Agenda, Announcements, Hidden Items, and Settings sections.
4. Operate only while Brave is running and use the signed-in Canvas session.
5. Display the Better Canvas View icon beside the dashboard title.

### 2.2 Agenda

1. Load assignments and quizzes from all active student courses; new courses
   are enabled by default and can be toggled locally in Settings.
2. Include due-dated graded discussion assignments. Exclude undated discussion
   topics and calendar events.
3. Show every unsubmitted item in exactly one Pacific-time bucket: Overdue,
   Today, Tomorrow, Days 2-7, Days 8-14, Day 15+, or Undated.
4. Treat work due earlier today as Overdue and show Canvas's exact due time.
5. Display course, title, due date/time, points and type when available, and a
   trusted deep link to Canvas.
6. Support title search and enabled-course multi-select filtering.
7. Remove submitted, graded, pending-review, and excused work after a successful
   refresh. Missing and late-but-unsubmitted work remains visible.
8. Render only agenda buckets containing at least one visible item.

### 2.3 Local Organization

1. Allow an assignment or announcement to be hidden as locally non-actionable.
2. Provide a Hidden Items section with a Restore action.
3. Support one optional plain-text note per assignment with explicit Save.
4. Key all local state by stable Canvas identifiers, never display names.
5. Retain cached and local state until Clear Data is explicitly confirmed.

### 2.4 Announcements

1. Show announcements separately, grouped by enabled active course and newest
   first within each group.
2. Show title, posted time, escaped plain-text excerpt, and a Canvas deep link.
3. Never execute or directly render Canvas-provided HTML.
4. Allow an announcement to be hidden locally and restored from Hidden Items.
5. Exclude announcements whose posted time is strictly more than 365 days old
   from both Announcements and Hidden Items. Include the exact cutoff; retain
   announcements with an unknown posted time.

### 2.5 Refresh and Failure Behavior

1. Refresh manually, at Brave/extension startup, and hourly while Brave runs.
2. Fetch each paginated Canvas collection completely before replacing a cached
   remote snapshot.
3. Retain the previous complete snapshot after any authentication, network,
   rate-limit, pagination, or response-validation failure.
4. Show last successful sync, a stale warning after a failure or two hours
   without success, and an Open Canvas to Sign In action when required.
5. Clear Data removes the extension database and local preferences but never
   modifies Canvas or browser cookies.
6. Show successful manual-refresh feedback as an accessible alert for four
   seconds. Keep failed-refresh feedback visible.

## 3. Security and Privacy Requirements

1. Permit only GET requests to `https://sjsu.instructure.com/*`.
2. Request only the `alarms` extension permission and the exact SJSU host
   permission unless a separately approved requirement proves another necessary.
3. Never read, export, store, or log Canvas cookie values, tokens, raw payloads,
   or login-page HTML.
4. Bundle every script locally and enforce a self-only extension CSP.
5. Validate Canvas deep links against the exact approved origin.
6. Store data only within the user's Brave profile boundary.

## 4. v1 Non-Goals

1. Canvas writes, coursework submission, or assignment completion.
2. Cloud hosting, multi-user operation, native desktop UI, or phone support.
3. Calendar views, undated discussions, calendar events, priority, snooze, or
   tags.
4. DOM scraping or automation of the user's everyday Brave profile.
5. AI-generated prioritization or autonomous actions.

## 5. v2 Direction

AI prioritization and user-approved completion of selected code assignments are
future goals requiring new requirements, permissions, architecture, and safety
review. They must not influence v1 permissions or interfaces.

## 6. Approval and Feasibility Gate

These requirements were approved by the user. Phase 1 implementation is gated
on a Phase 0 diagnostic proving that an exact-host extension can receive Canvas
JSON through the existing signed-in Brave session. Failure requires redesign;
DOM scraping is not an accepted fallback.
