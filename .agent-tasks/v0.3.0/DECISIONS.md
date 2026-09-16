# Architecture Decisions: Assignment Deliverables Exporter (v0.3.0)

## Context

Students need an efficient way to download assignment instructions, rubrics, datasets, and starter code for offline coursework without manually navigating dozens of individual Canvas tabs.

## Resolved Decisions (from /grill-me Interview)

1. **Target Course Scope**:
   - Exclusively applies to **student enrollments** (`course.enrollment_type === 'student'`).
   - Completely isolated from ISA grading tasks.

2. **Trigger & Layout**:
   - Placed directly beneath the "Search Agenda" searchbar and course filter checkboxes on the Agenda tab.
   - Inactive: A dedicated `[ 📥 Download Assignment Deliverables ]` button.
   - Active: Toggles "Selection Mode", unfolding an action toolbar (`[N Selected]`, `[Select All]`, `[Deselect All]`, `[Exit]`, `[Download Materials (.zip)]`) and mounting checkboxes to each agenda deliverable card.

3. **Archive Packaging Structure**:
   - Single master zip: `canvas_assignments_<YYYY-MM-DD>.zip`.
   - Structured subfolders per assignment: `<CourseCode>_<SanitizedTitle>/`.
   - Each subfolder contains:
     - `instructions.html`: Offline-readable HTML instructions with embedded CSS.
     - `attachments/`: Folder housing downloaded files, datasets, rubrics, and notebooks.
     - `attachments/images/`: Embedded images from the instructions HTML with rewritten relative paths.

4. **Attachment & Content Scope**:
   - Includes both official Canvas assignment attachments AND Canvas files/datasets linked in the description HTML.
   - Includes all Agenda deliverable types: standard assignments, quizzes, and graded discussion topics.

5. **Embedded Image Handling**:
   - Scrapes `<img src="...">` pointing to Canvas user/course files.
   - Downloads image binaries into `attachments/images/` and rewrites `<img src>` to relative paths for complete offline fidelity.

6. **Error & Failure Resiliency**:
   - Resilient partial export: if any individual file fails (e.g. 404, rate limit, deleted file), the process logs a warning to `export_report.txt` and continues packaging the rest.

7. **Progress Feedback**:
   - In-toolbar progress indicator with real-time status (`Fetching instructions...`, `Downloading attachment 2/5...`, `Building zip...`) and a `Cancel` button.

8. **Third-Party Dependencies**:
   - `jszip` (and `@types/jszip`) for client-side in-memory zip compression.

9. **Unbound Fetch Execution Prevention**:
   - `CanvasDeliverableDownloader` must wrap `options.fetchFn ?? ((input, init) => globalThis.fetch(input, init))` to guarantee `globalThis`/`window` context. Calling unbound `fetch` method references throws `Illegal invocation`.

10. **Canonical Direct File Download Endpoints**:

- Links in HTML matching `/files/:id` must be normalized to `${canvasOrigin}/files/${fileId}/download?download_frd=1` to ensure direct binary file streaming rather than Canvas HTML preview wrappers.

11. **Dynamic Filename Resolution from Response Headers**:

- Generic anchor text (`"here"`, `"link"`) must be resolved from the `Content-Disposition` response header (`filename="..."` or RFC 5987 `filename*=UTF-8''...`) to ensure proper extensions in both the archive and `instructions.html`.

12. **Filename Resolution Precedence & Fallback**:

- When determining the target filename for an attachment:
  1.  RFC 5987 encoded header: `filename*=UTF-8''<encoded>`
  2.  Standard header: `filename="<name>"`
  3.  Anchor text (if it contains a recognized file extension and is not generic)
  4.  Fallback: `file_${id}` with extension inferred from `Content-Type` header (e.g. `application/pdf` -> `.pdf`).
