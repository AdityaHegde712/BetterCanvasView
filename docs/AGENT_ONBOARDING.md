# Agent Onboarding & System Blueprint

> **Target Audience:** Incoming zero-context AI coding agents and human contributors.
> **Mission:** Read this document once to fully grasp system boundaries, invariants,
> data flows, and the exact development recipe for implementing new features.

---

## 1. System Architecture & Boundaries

Better Canvas View is an unprivileged, client-side Chrome Manifest V3 extension.

```text
               ┌────────────────────────────────────────────────────────┐
               │              SJSU Canvas REST API                      │
               │       https://sjsu.instructure.com/api/v1/*           │
               └──────────────────────▲─────────────────────────────────┘
                                      │ (GET only, active browser session)
               ┌──────────────────────┴─────────────────────────────────┐
               │             WXT Background Service Worker              │
               │  [entrypoints/background.ts] ── [src/sync/runtime.ts]   │
               │              │                                         │
               │              ▼                                         │
               │     [src/sync/sync-service.ts]                         │
               │       - Serialized trigger execution                   │
               │       - Multi-page continuation validation             │
               └──────────────────────┬─────────────────────────────────┘
                                      │ (Atomic Dexie transaction)
                                      ▼
               ┌────────────────────────────────────────────────────────┐
               │           Dexie IndexedDB Database (Schema v2)         │
               │  Remote stores: courses, agenda_items, announcements,  │
               │                 isa_assignments, sync_metadata         │
               │  Local stores:  course_preferences, item_states,       │
               │                 isa_todos                              │
               └──────────────────────▲─────────────────────────────────┘
                                      │ (Dexie useLiveQuery hooks)
               ┌──────────────────────┴─────────────────────────────────┐
               │            React 19 + Mantine 9.5 Options Page         │
               │  [entrypoints/options/App.tsx]                         │
               │    ├── Student Agenda & Course Filters                 │
               │    ├── ISA Tasks Grading Workspace                     │
               │    ├── Announcements & Hidden Items                    │
               │    └── Deliverables Batch Downloader (JSZip)           │
               └────────────────────────────────────────────────────────┘
```

### Immutable Security & Platform Constraints

1. **No Tokens, No Credentials**: The extension never prompts for, reads, or stores Canvas API tokens. Requests rely entirely on the user's active Canvas session in the browser.
2. **GET-Only Trust Boundary**: Canvas network operations are strictly `GET` requests to `https://sjsu.instructure.com/api/v1/*`. No submissions, mutations, or content-script DOM injections.
3. **Dexie as Single Source of Truth**: All persistent UI state originates from IndexedDB (`canvas` database). Never duplicate persistent data into React state.
4. **All Time in Pacific Time**: All agenda bucketing, day-boundary checks, and display formatting must use `America/Los_Angeles` via native `Intl` utilities.

---

## 2. Core Subsystems Blueprint

### Subsystem A: Sync & Ingestion (`src/sync/`, `src/canvas/`)

- **`CanvasHttpClient`** (`src/canvas/client.ts`): Wraps `fetch` with retries (up to 3 on 429/5xx), bounds requests to 30s timeouts, follows `rel=next` Link headers, and validates HTTPS host origin.
- **`SyncService`** (`src/sync/sync-service.ts`): Orchestrates snapshot retrieval. Reads all paginated resources across all enrolled courses first. If successful, executes a **single atomic Dexie transaction** replacing the remote tables. If any request fails, preserves the previous complete snapshot.
- **`SyncRuntime`** (`src/sync/runtime.ts`): Serializes triggers using an internal Promise tail (`triggerTail`), preventing concurrent Canvas requests from corrupting state or thrashing browser network limits.

### Subsystem B: Domain Normalization & Agenda (`src/domain/`)

- **`normalization.ts`**: Converts raw Canvas course, assignment, quiz, and discussion payloads into uniform snake_case models (`CourseRecord`, `AgendaItemRecord`, `IsaAssignmentRecord`).
- **`agenda.ts`**: Evaluates due dates against the current instant in `America/Los_Angeles` and assigns items to one ordered bucket:
  `overdue` → `today` → `tomorrow` → `days_2_7` → `days_8_14` → `day_15_plus` → `undated`.
- **`submissions.ts`**: Classifies whether an item is complete (submitted, graded, pending review, excused) or actionable.

### Subsystem C: ISA Tasks Grading Workspace (`src/dashboard/isa-*.ts`)

- Isolates courses where `enrollment_type` indicates teaching assistant or instructor status (`ta`, `teacher`, `designer`).
- Aggregates assignments needing grading with `needs_grading_count` and direct Canvas SpeedGrader links.
- Maintains a persistent, local TODO checklist stored in `isa_todos` that survives sync refreshes.

### Subsystem D: Assignment Deliverables Exporter (`src/export/`)

- **`canvas-downloader.ts`**:
  - Fetches deliverable descriptions for selected items from Canvas API.
  - Paces attachment downloads with concurrency limits (2 concurrent requests).
  - **Critical Guard**: Wraps `fetchFn` in `(input, init) => globalThis.fetch(input, init)` to guarantee execution in `window` context and prevent browser `Illegal invocation` errors.
  - **Header Parsing**: Uses `parseContentDispositionFilename` to read `Content-Disposition` headers (supporting standard `filename="..."` and RFC 5987 `filename*=UTF-8''...`), resolving true server filenames for links with generic anchor text like `"here"`.
- **`html-localizer.ts`**:
  - Extracts Canvas file links and canonicalizes them to `${canvasOrigin}/files/${fileId}/download?download_frd=1` to avoid Canvas web preview wrappers.
  - Extracts embedded `<img>` tags, saves binaries into `attachments/images/image_N.ext`, and rewrites HTML `<img src>` tags to relative local paths.
  - Injects clean responsive CSS (supporting system dark mode) into standalone `instructions.html`.
- **`zip-packager.ts`**:
  - Compresses deliverables into `canvas_assignments_<YYYY-MM-DD>.zip` with clean per-assignment directories and an optional `export_report.txt` for network warnings.

---

## 3. Storage Schema Reference (Dexie Schema v2)

Defined in [src/storage/database.ts](file:///C:/Users/hifia/Projects/CanvasAggregator/src/storage/database.ts):

| Store Name           | Primary Key & Indexes                                | Record Type           | Description                                       |
| :------------------- | :--------------------------------------------------- | :-------------------- | :------------------------------------------------ |
| `courses`            | `&id, course_id, name, course_code, enrollment_type` | `CourseRecord`        | Canvas courses (remote snapshot)                  |
| `agenda_items`       | `&id, course_id, due_at, item_type, is_complete`     | `AgendaItemRecord`    | Deliverables for student agenda (remote snapshot) |
| `announcements`      | `&id, course_id, posted_at`                          | `AnnouncementRecord`  | Course announcements (remote snapshot)            |
| `course_preferences` | `&id, enabled`                                       | `CoursePreference`    | User course visibility toggle (local state)       |
| `item_states`        | `&id, hidden`                                        | `ItemState`           | User hidden status and notes (local state)        |
| `sync_metadata`      | `&id, last_status, last_success_at`                  | `SyncMetadata`        | Singleton sync outcome tracking                   |
| `isa_assignments`    | `&id, course_id, due_at, needs_grading_count`        | `IsaAssignmentRecord` | ISA grading queue (remote snapshot)               |
| `isa_todos`          | `&id, completed, created_at`                         | `IsaTodoRecord`       | ISA persistent TODO items (local state)           |

_Key Convention:_ Compound IDs use `${courseId}:${objectId}`.

---

## 4. How to Add a New Feature (6-Step Recipe)

When asked to extend Better Canvas View, follow this exact sequence:

### Step 1: Define Domain Models & Types

- Add new models or extend existing ones in `src/domain/models.ts` (or `src/export/models.ts`).
- Avoid `any` or loose type bypasses.

### Step 2: Database Changes (If Local Persistence Needed)

- If introducing a new table or index, increment the version in `src/storage/database.ts`:
  ```typescript
  this.version(3).stores({
    // Preserve existing v2 tables...
    new_store: "&id, indexed_field",
  });
  ```
- Add repository methods in `src/storage/repository.ts`.

### Step 3: Business Logic & Pure Selectors

- Implement domain logic as pure functions in `src/domain/` or selectors in `src/dashboard/selectors.ts`.
- Pure functions must never make network requests or read globals directly.

### Step 4: Write Contract Unit Tests FIRST (TDD)

- Author unit tests in `tests/spec/<feature>.spec.ts`.
- **Test Immutability Contract**: You must **never** modify or weaken existing assertions in `tests/spec/`.
- Verify the new test passes with:
  ```powershell
  npx vitest run tests/spec/<feature>.spec.ts
  ```

### Step 5: Mount UI Components

- Update `entrypoints/options/App.tsx` or create dedicated feature components.
- Style using Mantine theme tokens and CSS variables in `entrypoints/options/styles.css`.
- Ensure buttons have `type="button"` and interactive elements have descriptive `aria-label` or test IDs.

### Step 6: Full Quality Gate & Build

Run the mandatory check before finalizing:

```powershell
npm run check
```

This verifies Prettier formatting, ESLint (`--max-warnings=0`), TypeScript compilation, the entire Vitest suite (111+ tests), and builds `.output/chrome-mv3`.

---

## 5. Critical Tripwires & Gotchas

1. **Unbound Fetch Exception**:
   - Calling `const fn = options.fetchFn ?? fetch; await fn(...)` detaches `fetch` from `globalThis` and triggers `TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation` in Chromium extensions.
   - Always bind: `options.fetchFn ?? ((input, init) => globalThis.fetch(input, init))`.
2. **ESLint Control Character Regex**:
   - Do NOT use regex character ranges with ASCII control codes like `/[<>\x00-\x1f]/g`. ESLint will fail with `no-control-regex`.
   - Instead, filter using character codes: `char.charCodeAt(0) < 32 || /[/\\:*?"<>|]/.test(char)`.
3. **Canvas File URLs**:
   - Links in Canvas HTML matching `/files/:id` serve HTML web preview wrappers. To stream binary files directly, always rewrite them to `/files/:id/download?download_frd=1`.
4. **Content-Disposition Headers**:
   - Canvas download URLs often redirect to Amazon S3 buckets. Always inspect `response.headers.get("content-disposition")` to extract the true server filename and extension, rather than relying on anchor text.
5. **Windows Powershell Command Execution**:
   - When running background commands or build tools via automation on Windows, use `BypassSandbox: true` if encountering sandbox environment configuration issues.
6. **Packaging for Release**:
   - To build the `.zip` archive for a GitHub release, run `npx wxt zip`. The output is saved to `.output/better-canvas-view-<version>-chrome.zip`.
