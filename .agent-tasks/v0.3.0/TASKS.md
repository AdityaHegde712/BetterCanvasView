# Atomic Task Ledger: Assignment Deliverables Exporter (v0.3.0)

## Status Key

- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed

## Task Checklist

- [x] **Task 1: Project Dependencies & Export Domain Models**
  - Path: `package.json`, `src/export/models.ts`
  - Scope: Install `jszip` and `@types/jszip`. Define `DeliverableExportItem`, `AttachmentResource`, `ExportProgressState`, `ExportReport`.
  - Acceptance Criteria: `package.json` resolves dependencies; clean model interfaces with strict type coverage.

- [x] **Task 2: HTML Localization & Link Extraction Engine**
  - Path: `src/export/html-localizer.ts`, `tests/spec/export-html-localizer.spec.ts`
  - Scope: Parse HTML to detect Canvas file downloads and embedded images. Rewrite image paths to relative `attachments/images/`. Inject clean typography, dark/light theme CSS, and deliverable metadata headers.
  - Acceptance Criteria: Spec tests pass verifying path rewriting, metadata rendering, and offline readability.

- [x] **Task 3: Canvas Deliverable & Attachment Downloader**
  - Path: `src/export/canvas-downloader.ts`, `tests/spec/export-canvas-downloader.spec.ts`
  - Scope: Fetch assignment/quiz/discussion description from Canvas API. Extract attachment links and stream binary blobs with concurrency pacing (concurrency = 2). Resilient failure tolerance with warning logging.
  - Acceptance Criteria: Spec tests pass mocking Canvas endpoints, verifying concurrency throttling and partial success behavior.

- [x] **Task 4: ZIP Packaging & Browser Trigger**
  - Path: `src/export/zip-packager.ts`, `tests/spec/export-zip-packager.spec.ts`
  - Scope: Assemble structured ZIP archive (`canvas_assignments_<date>.zip`) with folders per deliverable, `instructions.html`, `attachments/`, and optional `export_report.txt`. Trigger DOM anchor blob download.
  - Acceptance Criteria: Spec tests assert ZIP structure, filenames, and correct directory nesting.

- [x] **Task 5: Dashboard UI Integration & Toolbar Interaction**
  - Path: `entrypoints/options/App.tsx`, `tests/component/export-dashboard.test.tsx`
  - Scope: Add "Download Assignment Deliverables" action bar beneath search/filter card. Add selection mode toggle, counter, "Select All", "Deselect All", checkboxes on agenda cards, and in-toolbar progress indicator with cancel support.
  - Acceptance Criteria: Component tests verify selection state, checkbox toggling, progress bar rendering, and download triggering.

- [x] **Task 6: Full Verification Gate**
  - Path: Entire workspace
  - Scope: Run `npm run check` (formatter, linter, typecheck, tests, build).
  - Acceptance Criteria: 0 errors across all verification gates; clean build artifact ready.

- [x] **Task 7: Fetch Invocation Binding Fix**
  - Path: `src/export/canvas-downloader.ts`
  - Scope: Bind default `fetchFn` to `globalThis` (`((input, init) => globalThis.fetch(input, init))`) preventing `Illegal invocation` browser DOM exceptions.
  - Acceptance Criteria: `CanvasDeliverableDownloader` invokes fetch without `Illegal invocation` DOM error; passes when tested in browser-like environments.

- [x] **Task 8: Canonical Direct Download Endpoints**
  - Path: `src/export/html-localizer.ts`, `tests/spec/export-html-localizer.spec.ts`
  - Scope: Canonicalize Canvas file URLs matching `/files/:id` to `${canvasOrigin}/files/${fileId}/download?download_frd=1` to bypass HTML preview wrappers.
  - Acceptance Criteria: Spec tests pass verifying canonical download URL generation.

- [x] **Task 9: Dynamic Content-Disposition Filename Resolution**
  - Path: `src/export/canvas-downloader.ts`, `tests/spec/export-canvas-downloader.spec.ts`
  - Scope: Parse `Content-Disposition` response header (`filename="..."` and RFC 5987 `filename*=UTF-8''...`) to replace generic anchor text (e.g. `"here"`) with actual server filenames.
  - Acceptance Criteria: Unit tests assert header parsing across standard and encoded formats, overriding generic anchor display names.

- [x] **Task 10: Regression Verification & Production Build Gate**
  - Path: Entire workspace
  - Scope: Run `npm run check` (Prettier, ESLint, TypeScript, Vitest, WXT build).
  - Acceptance Criteria: 0 errors; extension package ready.

## Immediate Next Action

All Phase 2 transport and resolution hardening tasks are completed and committed in `89af885`. Ready for user live testing with the updated build in `.output/chrome-mv3`.
