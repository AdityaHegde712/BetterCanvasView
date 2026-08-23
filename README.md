# Canvas Aggregator

Canvas Aggregator is a local, read-only Brave extension for viewing upcoming
SJSU Canvas assignments, quizzes, and announcements in one desktop dashboard.

## Status

Phase 0 validates that an exact-host Manifest V3 extension can use an existing
signed-in Brave session for read-only Canvas JSON requests. Implementation past
the diagnostic is intentionally gated on that validation.

## v1 Boundaries

- Local and single-user; no cloud service.
- Read-only; no Canvas writes or coursework submission.
- Desktop agenda and announcements; no calendar or phone interface.
- No DOM scraping, stored Canvas credentials, or daily-profile automation.

## Phase 0 Diagnostic

Requirements: Node.js 20 or newer, npm, and Brave signed in to
`https://sjsu.instructure.com/`.

1. Run `npm install` and `npm run check`.
2. Open `brave://extensions`, enable Developer mode, and choose Load unpacked.
3. Select the repository's `.output/chrome-mv3` directory.
4. Click the Better Canvas View toolbar action to open its full-page dashboard.
5. Select Test Canvas connection.

A `success` result proves the tokenless extension architecture is feasible. Any
other result blocks later implementation until the cause is understood. The
diagnostic displays only status, elapsed time, check time, and a sample count.

## Development Commands

- `npm run dev`: start the WXT development build.
- `npm run format`: format tracked source and configuration files.
- `npm run check`: verify formatting, lint, TypeScript, and production build.
