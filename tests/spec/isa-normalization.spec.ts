import { describe, expect, it } from "vitest";

import {
  normalizeCourse,
  normalizeIsaAssignment,
} from "../../src/domain/normalization";

describe("ISA Domain Normalization", () => {
  const taCoursePayload = {
    id: 1632798,
    name: "FA26: CMPE-257 Sec 01 - Machine Learning",
    course_code: "FA26: CMPE-257 Sec 01 - Machine Learning",
    html_url: "https://sjsu.instructure.com/courses/1632798",
    enrollments: [
      {
        type: "ta",
        role: "TaEnrollment",
        enrollment_state: "active",
      },
    ],
  };

  const studentCoursePayload = {
    id: 101,
    name: "Software Design",
    course_code: "CMPE 100",
    html_url: "https://sjsu.instructure.com/courses/101",
    enrollments: [
      {
        type: "student",
        role: "StudentEnrollment",
        enrollment_state: "active",
      },
    ],
  };

  it("normalizes a TA course with enrollment_type 'ta'", () => {
    const normalized = normalizeCourse(taCoursePayload);
    expect(normalized).toEqual({
      id: "1632798:1632798",
      course_id: "1632798",
      object_id: "1632798",
      name: "FA26: CMPE-257 Sec 01 - Machine Learning",
      course_code: "FA26: CMPE-257 Sec 01 - Machine Learning",
      html_url: "https://sjsu.instructure.com/courses/1632798",
      enrollment_type: "ta",
    });
  });

  it("normalizes a student course with enrollment_type 'student'", () => {
    const normalized = normalizeCourse(studentCoursePayload);
    expect(normalized).toEqual({
      id: "101:101",
      course_id: "101",
      object_id: "101",
      name: "Software Design",
      course_code: "CMPE 100",
      html_url: "https://sjsu.instructure.com/courses/101",
      enrollment_type: "student",
    });
  });

  it("normalizes an assignment for an ISA course with needs_grading_count and SpeedGrader URL", () => {
    const rawAssignment = {
      id: 501,
      name: "Lab 3: Logistic Regression",
      due_at: "2026-09-18T23:59:00Z",
      points_possible: 100,
      needs_grading_count: 14,
      html_url: "https://sjsu.instructure.com/courses/1632798/assignments/501",
    };

    const normalized = normalizeIsaAssignment(taCoursePayload, rawAssignment);
    expect(normalized).toEqual({
      id: "1632798:501",
      course_id: "1632798",
      object_id: "501",
      title: "Lab 3: Logistic Regression",
      due_at: "2026-09-18T23:59:00Z",
      points_possible: 100,
      needs_grading_count: 14,
      html_url: "https://sjsu.instructure.com/courses/1632798/assignments/501",
      speedgrader_url:
        "https://sjsu.instructure.com/courses/1632798/gradebook/speed_grader?assignment_id=501",
    });
  });

  it("defaults needs_grading_count to 0 when absent or non-numeric", () => {
    const rawAssignment = {
      id: 502,
      name: "Lab 1: Setup",
      due_at: null,
      points_possible: null,
      html_url: "https://sjsu.instructure.com/courses/1632798/assignments/502",
    };

    const normalized = normalizeIsaAssignment(taCoursePayload, rawAssignment);
    expect(normalized?.needs_grading_count).toBe(0);
    expect(normalized?.points_possible).toBeNull();
  });
});
