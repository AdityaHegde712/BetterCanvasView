/**
 * @fileoverview Determines whether a Canvas assignment submission is complete.
 */

type CanvasSubmission = Record<string, unknown>;

const COMPLETE_WORKFLOW_STATES = new Set([
  "submitted",
  "graded",
  "pending_review",
]);

/**
 * Checks whether a value is a non-null Canvas-shaped object.
 *
 * @param value - Unknown value to inspect.
 * @returns Whether the value can contain Canvas submission fields.
 */
function isCanvasSubmission(value: unknown): value is CanvasSubmission {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Determines whether Canvas considers a submission complete.
 *
 * @param submission - Optional Canvas submission payload.
 * @returns True for excused, submitted, graded, or pending-review work.
 */
export function isSubmissionComplete(submission: unknown): boolean {
  if (!isCanvasSubmission(submission)) {
    return false;
  }

  const hasSubmissionTimestamp =
    typeof submission.submitted_at === "string" &&
    submission.submitted_at.trim() !== "";

  if (submission.excused === true || hasSubmissionTimestamp) {
    return true;
  }

  return (
    typeof submission.workflow_state === "string" &&
    COMPLETE_WORKFLOW_STATES.has(submission.workflow_state)
  );
}
