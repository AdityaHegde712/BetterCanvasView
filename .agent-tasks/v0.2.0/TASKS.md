# Atomic Task Ledger: ISA Tasks Integration

## Status Key

- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed

## Task Checklist

- [x] **Task 1: Domain Contracts & Normalization**
  - Path: `src/domain/models.ts`, `src/domain/normalization.ts`, `tests/spec/isa-normalization.spec.ts`
  - Scope: Add `CourseEnrollmentType`, `IsaAssignmentRecord`, `IsaTodoRecord`, extend `RemoteSnapshot`. Update `normalizeCourse` to detect `"ta"` vs `"student"` from `enrollments`. Add `normalizeIsaAssignment` with `needs_grading_count` and `speedgrader_url`.
  - Acceptance Criteria: Spec tests pass asserting proper enrollment classification and SpeedGrader URL construction.

- [x] **Task 2: Dexie Schema Versioning & Storage Layer**
  - Path: `src/storage/database.ts`, `src/storage/repository.ts`, `tests/spec/isa-storage.spec.ts`
  - Scope: Register `isa_assignments` and `isa_todos` in Dexie schema version 2. Implement `replaceRemoteSnapshot` support for ISA assignments and CRUD helper methods for `isa_todos`.
  - Acceptance Criteria: Database migrations succeed without data loss; snapshot replace and TODO CRUD methods verified by unit tests.

- [x] **Task 3: Synchronization Service Branching**
  - Path: `src/sync/sync-service.ts`, `tests/spec/isa-sync.spec.ts`, `tests/integration/sync-service.test.ts`
  - Scope: Update `COURSE_QUERY` to omit hardcoded `enrollment_type: "student"` and add `include[]=enrollments`. Branch assignment fetching for TA courses with `include[]=needs_grading_count`.
  - Acceptance Criteria: Sync tests assert snapshot contains segregated student items and ISA assignments.

- [x] **Task 4: ISA Pure Selectors & Agenda Filtering**
  - Path: `src/dashboard/selectors.ts`, `tests/spec/isa-selectors.spec.ts`
  - Scope: Filter `selectAgendaBuckets` and `selectAnnouncementsByCourse` to student courses only. Implement `selectIsaGradingBuckets` partitioning into `toBeGraded` and `completedGrading`.
  - Acceptance Criteria: 100% test coverage on grading bucket classification and cross-contamination prevention.

- [x] **Task 5: Dashboard UI Components & Navigation**
  - Path: `entrypoints/options/App.tsx`, `tests/component/isa-dashboard.test.tsx`
  - Scope: Mount "ISA Tasks" tab with urgent count badge. Render 2-column layout with search/course filter, "To Be Graded" cards, "Grading Completed" accordion, and persistent TODO sidebar checklist.
  - Acceptance Criteria: Component tests verify tab switching, SpeedGrader deep links, course filtering, and TODO interactions.

- [x] **Task 6: Full Verification Gate**
  - Path: Entire workspace
  - Scope: Run `npm run check` (formatter, linter, typecheck, tests, build).
  - Acceptance Criteria: 0 errors across all verification gates.

## Immediate Next Action

All tasks completed cleanly. Prepare walkthrough and commit changes to `dev`.
