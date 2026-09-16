import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasDatabase } from "../../src/storage/database";
import { SyncService } from "../../src/sync/sync-service";

describe("ISA Sync Integration", () => {
  const databases: CanvasDatabase[] = [];

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.delete()));
    databases.length = 0;
  });

  function createDatabase(): CanvasDatabase {
    const database = new CanvasDatabase(`isa-sync-spec-${crypto.randomUUID()}`);
    databases.push(database);
    return database;
  }

  it("branches synchronization for TA courses vs student courses", async () => {
    const calls: Array<{ path: string; query?: Record<string, unknown> }> = [];

    const rawCourses = [
      {
        id: 101,
        name: "Software Design",
        course_code: "CMPE 100",
        html_url: "https://sjsu.instructure.com/courses/101",
        enrollments: [{ enrollment_state: "active", type: "student" }],
      },
      {
        id: 1632798,
        name: "Machine Learning Sec 01",
        course_code: "CMPE 257",
        html_url: "https://sjsu.instructure.com/courses/1632798",
        enrollments: [{ enrollment_state: "active", type: "ta" }],
      },
    ];

    const studentAssignments = [
      {
        id: 201,
        name: "Student Homework 1",
        due_at: "2026-09-20T18:00:00Z",
        points_possible: 25,
        html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
        submission: { workflow_state: "unsubmitted" },
      },
    ];

    const taAssignments = [
      {
        id: 501,
        name: "Lab 3: Logistic Regression",
        due_at: "2026-09-18T23:59:00Z",
        points_possible: 100,
        needs_grading_count: 14,
        html_url:
          "https://sjsu.instructure.com/courses/1632798/assignments/501",
      },
    ];

    const client = {
      getAll: vi.fn(async (path: string, query?: Record<string, unknown>) => {
        calls.push({ path, query });
        if (path === "/api/v1/courses") {
          return rawCourses;
        }
        if (path === "/api/v1/courses/101/assignments") {
          return studentAssignments;
        }
        if (path === "/api/v1/courses/101/discussion_topics") {
          return [];
        }
        if (path === "/api/v1/courses/1632798/assignments") {
          return taAssignments;
        }
        return [];
      }),
    };

    const database = createDatabase();
    const service = new SyncService(client, database);

    const result = await service.run("manual");

    expect(result.status).toBe("success");
    expect(result.counts?.courses).toBe(2);
    expect(result.counts?.agenda_items).toBe(1);
    expect(result.counts?.isa_assignments).toBe(1);

    // TA course queries assignments with needs_grading_count and does NOT query student discussion topics
    expect(calls).toContainEqual({
      path: "/api/v1/courses/1632798/assignments",
      query: {
        "include[]": "needs_grading_count",
        order_by: "due_at",
        override_assignment_dates: true,
        per_page: 100,
      },
    });

    const taDiscussionCall = calls.find(
      (call) => call.path === "/api/v1/courses/1632798/discussion_topics",
    );
    expect(taDiscussionCall).toBeUndefined();

    // Verify persisted records in IndexedDB
    const storedIsaAssignments = await database.isa_assignments.toArray();
    expect(storedIsaAssignments).toHaveLength(1);
    expect(storedIsaAssignments[0]).toMatchObject({
      id: "1632798:501",
      course_id: "1632798",
      needs_grading_count: 14,
      title: "Lab 3: Logistic Regression",
      speedgrader_url:
        "https://sjsu.instructure.com/courses/1632798/gradebook/speed_grader?assignment_id=501",
    });

    const storedAgendaItems = await database.agenda_items.toArray();
    expect(storedAgendaItems).toHaveLength(1);
    expect(storedAgendaItems[0]?.id).toBe("101:201");
  });
});
