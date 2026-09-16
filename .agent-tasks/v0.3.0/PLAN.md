# Assignment Deliverables Exporter Plan (v0.3.0)

## Active Phase

Phase 2: Transport Robustness & Attachment Resolution Hardening (In Progress)

### Diagnostic Analysis (from tests/sample_download/canvas_assignments_2026-09-16.zip)

Inspection of `export_report.txt` from the user's sample download revealed 100% failure across all attachment downloads despite successful main deliverable HTML generation:

1. **Fatal Fetch Context Crash**: `TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation` triggered on every file fetch because `this.#fetchFn` was invoked as an unbound method reference.
2. **Preview Wrapper Trap**: Canvas file URLs (`/files/:id`, `/files/:id?wrap=1`) served HTML preview shells instead of binary octet streams.
3. **Loss of Filenames/Extensions**: Anchor links with generic text (e.g., `<a href="...">here</a>`) resulted in extensionless files named `here`.

### Phase 2 Execution Plan

1. **Fetch Binding Guard**: Wrap default fetch handler in `CanvasDeliverableDownloader` with `(input, init) => globalThis.fetch(input, init)` to guarantee global execution context.
2. **URL Canonicalization**: Transform Canvas file URLs into canonical binary download endpoints (`${canvasOrigin}/files/${fileId}/download?download_frd=1`).
3. **Content-Disposition Parsing**: Implement RFC 5987 / standard `Content-Disposition` filename extractor to resolve true server-side filenames and extensions.
4. **HTML-Archive Filename Synchronization**: Ensure `instructions.html` relative links accurately match final sanitized archive attachment paths.
5. **Spec Verification**: Unit tests for header parsing, URL rewriting, and mocked multi-file attachment pipelines.

## Dependency Chains & Affected Modules

1. **Dependencies**: Add `jszip` and `@types/jszip` to `package.json` [Completed].
2. `src/export/models.ts`: Define `DeliverableExportItem`, `AttachmentResource`, `ExportProgress`, `ExportResult` [Completed].
3. `src/export/html-localizer.ts`: Pure parser/transformer that extracts Canvas file links, canonicalizes download URLs, extracts embedded images, rewrites relative paths, and wraps content with readable offline CSS.
4. `src/export/canvas-downloader.ts`: Service coordinating Canvas assignment/quiz/discussion description fetching and attachment file downloads with concurrency limits (2 concurrent requests), bound fetch context, `Content-Disposition` header parsing, and retry/skip tolerance.
5. `src/export/zip-packager.ts`: Pure packaging module using JSZip that creates the structured directory tree and triggers browser file download.
6. `entrypoints/options/App.tsx`: State management for selection mode, action bar, progress feedback, and checkbox rendering on agenda cards.
7. `tests/spec/`: TDD test specifications for HTML localization, link extraction, zip creation, header parsing, and UI component behavior.

## Exit Criteria

- `npm run check` passes with 0 lint errors, 0 type errors, 0 test failures.
- Single master zip extracts into clean per-assignment folders with readable `instructions.html` and `attachments/`.
- All Canvas file attachments download as valid binary files with correct filenames and extensions.
- Embedded images render completely offline.
- In-toolbar progress updates cleanly and gracefully handles network errors.
