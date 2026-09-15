import { describe, expect, it } from "vitest";

import type {
  IsaAssignmentRecord,
  CourseRecord,
} from "../../src/domain/models";
import {
  selectIsaGradingBuckets,
  selectAnnouncementsByCourse,
} from "../../src/dashboard/selectors";

describe("ISA Dashboard Selectors", () => {
  const sampleAssignments: IsaAssignmentRecord[] = [
    {
      id: "1632798:1",
      course_id: "1632798",
      object_id: "1",
      title: "Lab 3: Logistic Regression",
      due_at: "2026-09-18T23:59:00Z",
      points_possible: 100,
      needs_grading_count: 14,
      html_url: "https://sjsu.instructure.com/courses/1632798/assignments/1",
      speedgrader_url:
        "https://sjsu.instructure.com/courses/1632798/gradebook/speed_grader?assignment_id=1",
    },
    {
      id: "1635708:2",
      course_id: "1635708",
      object_id: "2",
      title: "Homework 2: Neural Networks",
      due_at: "2026-09-19T23:59:00Z",
      points_possible: 50,
      needs_grading_count: 21,
      html_url: "https://sjsu.instructure.com/courses/1635708/assignments/2",
      speedgrader_url:
        "https://sjsu.instructure.com/courses/1635708/gradebook/speed_grader?assignment_id=2",
    },
    {
      id: "1632798:3",
      course_id: "1632798",
      object_id: "3",
      title: "Lab 2: Linear Regression",
      due_at: "2026-09-10T23:59:00Z",
      points_possible: 100,
      needs_grading_count: 0,
      html_url: "https://sjsu.instructure.com/courses/1632798/assignments/3",
      speedgrader_url:
        "https://sjsu.instructure.com/courses/1632798/gradebook/speed_grader?assignment_id=3",
    },
  ];

  it("partitions assignments into toBeGraded and completedGrading with aggregate counts", () => {
    const buckets = selectIsaGradingBuckets(sampleAssignments);

    expect(buckets.totalToGradeCount).toBe(2);
    expect(buckets.totalSubmissionsPending).toBe(35); // 14 + 21
    expect(buckets.toBeGraded).toHaveLength(2);
    expect(buckets.completedGrading).toHaveLength(1);

    expect(buckets.toBeGraded[0]?.id).toBe("1632798:1");
    expect(buckets.toBeGraded[1]?.id).toBe("1635708:2");
    expect(buckets.completedGrading[0]?.id).toBe("1632798:3");
  });

  it("filters ISA assignments by course ID and title search", () => {
    const courseFiltered = selectIsaGradingBuckets(sampleAssignments, {
      course_ids: ["1635708"],
      title_query: "",
    });
    expect(courseFiltered.toBeGraded).toHaveLength(1);
    expect(courseFiltered.toBeGraded[0]?.id).toBe("1635708:2");

    const searchFiltered = selectIsaGradingBuckets(sampleAssignments, {
      course_ids: [],
      title_query: "logistic",
    });
    expect(searchFiltered.toBeGraded).toHaveLength(1);
    expect(searchFiltered.toBeGraded[0]?.title).toBe(
      "Lab 3: Logistic Regression",
    );
  });

  it("excludes TA courses from student announcements", () => {
    const courses: CourseRecord[] = [
      {
        id: "101:101",
        course_id: "101",
        object_id: "101",
        name: "Software Design",
        course_code: "CMPE 100",
        html_url: "https://sjsu.instructure.com/courses/101",
        enrollment_type: "student",
      },
      {
        id: "1632798:1632798",
        course_id: "1632798",
        object_id: "1632798",
        name: "ML TA",
        course_code: "CMPE 257",
        html_url: "https://sjsu.instructure.com/courses/1632798",
        enrollment_type: "ta",
      },
    ];

    const preferences = [
      { id: "101:101", enabled: true },
      { id: "1632798:1632798", enabled: true },
    ];

    const announcements = [
      {
        id: "101:a1",
        course_id: "101",
        object_id: "a1",
        title: "Student Announcement",
        message: "<p>Hello students</p>",
        posted_at: new Date().toISOString(),
        html_url:
          "https://sjsu.instructure.com/courses/101/discussion_topics/a1",
      },
      {
        id: "1632798:a2",
        course_id: "1632798",
        object_id: "a2",
        title: "TA Announcement",
        message: "<p>Hello TA</p>",
        posted_at: new Date().toISOString(),
        html_url:
          "https://sjsu.instructure.com/courses/1632798/discussion_topics/a2",
      },
    ];

    const groups = selectAnnouncementsByCourse(
      courses,
      preferences,
      announcements,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.course.course_id).toBe("101");
  });
});
