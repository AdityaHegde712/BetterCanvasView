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
