import { describe, expect, it } from "vitest";

import { isSubmissionComplete } from "../../src/domain/submissions";

describe("isSubmissionComplete", () => {
  it("treats absent submission data as incomplete", () => {
    expect(isSubmissionComplete(null)).toBe(false);
    expect(isSubmissionComplete(undefined)).toBe(false);
  });

  it.each([
    [{ workflow_state: "unsubmitted" }, false, "unsubmitted work"],
    [
      { submitted_at: "2026-02-18T20:30:00.000Z" },
      true,
      "a submission timestamp",
    ],
    [{ workflow_state: "submitted" }, true, "submitted workflow state"],
    [{ workflow_state: "graded" }, true, "graded workflow state"],
    [
      { workflow_state: "pending_review" },
      true,
      "pending-review workflow state",
    ],
    [{ excused: true, workflow_state: "unsubmitted" }, true, "excused work"],
    [
      { missing: true, workflow_state: "unsubmitted" },
      false,
      "missing unsubmitted work",
    ],
    [
      { late: true, workflow_state: "unsubmitted" },
      false,
      "late unsubmitted work",
    ],
  ])("returns %s for %s", (submission, expected, _description) => {
    void _description;
    expect(isSubmissionComplete(submission)).toBe(expected);
  });
});
