import { describe, expect, it } from "vitest";

import fixture from "../fixtures/canvas-golden.json";
import {
  normalizeAnnouncement,
  normalizeAssignment,
  normalizeCourse,
} from "../../src/domain/normalization";

describe("Canvas normalization", () => {
  it("normalizes a course to a snake_case record with its Canvas ID key", () => {
    expect(normalizeCourse(fixture.course)).toEqual({
      id: "101:101",
      course_id: "101",
      object_id: "101",
      name: "Software Design",
      course_code: "CMPE 100",
      html_url: "https://sjsu.instructure.com/courses/101",
    });
  });

  it("normalizes ordinary assignments with a stable course_id:object_id key", () => {
    expect(
      normalizeAssignment(fixture.course, fixture.assignments.assignment),
    ).toMatchObject({
      id: "101:201",
      course_id: "101",
      object_id: "201",
      title: "Module exercise",
      due_at: "2026-02-20T18:00:00Z",
      points_possible: 25,
      item_type: "assignment",
      is_complete: false,
      html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
    });
  });

  it("normalizes submitted Canvas states as complete", () => {
    expect(
      normalizeAssignment(fixture.course, {
        ...fixture.assignments.assignment,
        submission: { workflow_state: "submitted" },
      }),
    ).toMatchObject({ is_complete: true });
    expect(
      normalizeAssignment(fixture.course, {
        ...fixture.assignments.assignment,
        submission: { submitted_at: "2026-02-18T20:30:00.000Z" },
      }),
    ).toMatchObject({ is_complete: true });
  });

  it("excludes discussion assignments while retaining supported quiz and tool types", () => {
    expect(
      normalizeAssignment(fixture.course, fixture.assignments.discussion),
    ).toBeNull();

    for (const assignment of [
      fixture.assignments.assignment,
      fixture.assignments.classic_quiz,
      fixture.assignments.new_quiz,
      fixture.assignments.external_tool,
    ]) {
      expect(normalizeAssignment(fixture.course, assignment)).not.toBeNull();
    }

    expect(
      normalizeAssignment(fixture.course, fixture.assignments.classic_quiz),
    ).toMatchObject({ item_type: "quiz" });
    expect(
      normalizeAssignment(fixture.course, fixture.assignments.new_quiz),
    ).toMatchObject({ item_type: "quiz" });
    expect(
      normalizeAssignment(fixture.course, fixture.assignments.external_tool),
    ).toMatchObject({ item_type: "external_tool" });
  });

  it("normalizes announcements to snake_case records keyed by Canvas IDs", () => {
    expect(normalizeAnnouncement(fixture.course, fixture.announcement)).toEqual(
      {
        id: "101:401",
        course_id: "101",
        object_id: "401",
        title: "Project update",
        message: "<p>Milestone posted.</p>",
        posted_at: "2026-02-18T18:00:00Z",
        html_url:
          "https://sjsu.instructure.com/courses/101/discussion_topics/401",
      },
    );
  });
});
