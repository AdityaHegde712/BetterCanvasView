# Better Canvas View

![Better Canvas View dashboard concept](README_Hero_Image.png)

Better Canvas View is a local, read-only Brave extension that combines upcoming
SJSU Canvas assignments, quizzes, announcements, ISA grading tasks, and assignment
deliverable exports into one desktop agenda. It uses the Canvas session already
active in Brave and stores its cache and organization preferences only in the
extension's IndexedDB database.

## Current Features

- **Pacific-Time Agenda Groups**: Overdue, today, tomorrow, days 2-7,
  days 8-14, day 15 onward, and undated.
- **Comprehensive Coursework Tracking**: Standard assignments, Classic Quizzes,
  New Quizzes, external tools, and due-dated graded discussions, including work
  omitted from the Canvas final grade.
- **Assignment Deliverables Batch Downloader (v0.3.0)**:
  - Download assignment, quiz, and discussion instructions into clean, offline-readable
    HTML with styled typography and embedded images rewritten to relative local paths.
  - Automatically fetches and bundles attached files, datasets, rubrics, and starter code.
  - Automatically resolves true server filenames from `Content-Disposition` response headers.
  - Packages deliverables into structured `canvas_assignments_<YYYY-MM-DD>.zip` archives.
- **ISA Tasks Grading Dashboard (v0.2.0)**:
  - Separate 2-column workspace for Instructional Student Assistants (ISAs) and TAs.
  - Aggregates submissions awaiting grading with submission counts and deep links.
  - Persistent, course-specific TODO checklist surviving synchronization refreshes.
- **Announcements View**: Inert plain-text excerpts with a 365-day cutoff to keep the
  dashboard compact.
- **Customizable Filters & Notes**: Search, multi-course filtering, per-course enablement,
  personal assignment notes, and reversible hiding.
- **Resilient Offline Sync**: Cached data with manual, startup, and hourly refresh;
  timed-out Canvas requests retain the prior complete snapshot.

## Privacy and Scope

The extension requests only the `alarms` permission and host access to
`https://sjsu.instructure.com/*`. It does not request cookie access, read or
store Canvas credentials, inject content scripts, scrape Canvas pages, submit
coursework, or edit Canvas data.

This is a desktop, single-user, local-only viewer and offline assistant. Cloud
hosting, mobile apps, token storage, and automated assignment completion are
strictly out of scope.

## Install in Brave

Requirements: Node.js 20 or newer, npm, and Brave signed in to
`https://sjsu.instructure.com/`.

1. Run `npm ci`.
2. Run `npm run check` to test and build the extension.
3. Open `brave://extensions` and enable Developer mode.
4. Select **Load unpacked** and choose `.output/chrome-mv3`.
5. Pin Better Canvas View and select its toolbar icon to open the dashboard.
6. Select **Refresh** to load the current Canvas snapshot.

After source changes, rerun `npm run build` and select **Reload** on the
extension card in `brave://extensions`.

## Development & Quality Gates

```powershell
npm ci
npm run dev
```

Run quality gates before committing:

```powershell
npm run format:check   # Prettier code style
npm run lint           # ESLint with zero warnings
npm run typecheck      # Strict TypeScript check
npm run test           # Vitest contract and component suites (111 tests)
npm run build          # WXT production Chrome MV3 build
npm run test:e2e       # Isolated Playwright extension tests
npm run check          # Runs format:check + lint + typecheck + test + build
```

To create a distributable `.zip` archive for GitHub releases:

```powershell
npx wxt zip
```

The output package is saved to `.output/better-canvas-view-<version>-chrome.zip`.

## Architecture and Contributing

- See [CODEBASE.md](CODEBASE.md) for architecture, module responsibilities, storage
  schemas, request lifecycles, and change hazards.
- See [docs/AGENT_ONBOARDING.md](docs/AGENT_ONBOARDING.md) for an onboarding guide
  designed for AI agents and new contributors to quickly build and test features.

Development uses `main` as stable, `dev` as integration, and feature branches
created from `dev`. Pull requests target `dev`; `dev` reaches `main` through a
release pull request.
