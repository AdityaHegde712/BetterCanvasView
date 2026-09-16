/**
 * @fileoverview Locks agenda inclusion for due-dated non-final-grade work.
 */

import { describe, expect, it } from "vitest";

import { normalizeAssignment } from "../../src/domain/normalization";

describe("non-final-grade assignment normalization", () => {
  it("keeps an unsubmitted due-dated discussion in the agenda", () => {
    const course = { id: 101 };
    const assignment = {
      due_at: "2026-08-24T07:00:00Z",
      html_url: "https://sjsu.instructure.com/courses/101/assignments/901",
      id: 901,
      name: "Master Project milestone",
      omit_from_final_grade: true,
      points_possible: 0,
      submission: {
        workflow_state: "unsubmitted",
      },
      submission_types: ["discussion_topic"],
    };

    expect(normalizeAssignment(course, assignment)).toMatchObject({
      due_at: "2026-08-24T07:00:00Z",
      id: "101:901",
      is_complete: false,
      title: "Master Project milestone",
    });
  });
});
