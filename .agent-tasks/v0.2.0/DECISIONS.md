# Immutable Technical Decisions: ISA Tasks

## 1. Enrollment Type Classification

- **Decision**: Ingest courses with `include[]=enrollments` and determine `enrollment_type: "student" | "ta"` based on active enrollment records returned by Canvas LMS.
- **Rationale**: The user has verified that ISA courses (CMPE-257 Sec 01, Sec 02) contain `type: "ta"` with `role: "TaEnrollment"`. Omitting `enrollment_type: "student"` from the Canvas query unlocks these courses while preserving classification.
- **Rejected Alternative**: Hardcoding course IDs (e.g. 1632798, 1635708) or filtering by course name prefix. Rejected because course offerings and section IDs change every term.

## 2. ISA Tasks Data Source & Classification

- **Decision**: Fetch assignments for TA courses with `include[]=needs_grading_count`. Classify into "To Be Graded" (`needs_grading_count > 0`) and "Grading Completed" (`needs_grading_count === 0`).
- **Rationale**: Directly provides accurate submission counts waiting for evaluation and enables direct deep-linking into Canvas SpeedGrader.
- **Rejected Alternative**: Relying solely on `/api/v1/users/self/todo` (Canvas To-Do API). Rejected because it drops completed assignment history.

## 3. Strict Tab Isolation

- **Decision**: "Agenda" and "Announcements" display strictly Student courses. "ISA Tasks" displays strictly TA courses.
- **Rationale**: Eliminates alert fatigue and prevents student completion flags (`has_submitted_submission`) from falsely affecting courses the user is grading.

## 4. UI Layout & Density

- **Decision**: 2-Column Mantine layout (Main area ~70%, Sidebar ~30%).
- **Rationale**: Maximizes viewport density while keeping the persistent task list immediately accessible without modal or drawer clicks.

## 5. Storage Architecture for ISA TODOs

- **Decision**: Dedicated `isa_todos` Dexie IndexedDB table with schema `&id, completed, created_at`.
- **Rationale**: Ensures atomic persistence, reactive updates via `useLiveQuery`, and seamless offline support.
