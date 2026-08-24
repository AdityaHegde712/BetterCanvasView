/**
 * @fileoverview Defines atomic synchronization contracts over Canvas and IndexedDB.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import fixture from "../fixtures/canvas-golden.json";
import { CanvasClientError } from "../../src/canvas/client";
import { CanvasDatabase } from "../../src/storage/database";
import { replaceRemoteSnapshot } from "../../src/storage/repository";
import { SyncService } from "../../src/sync/sync-service";

type CanvasClientFake = {
  getAll: (path: string, query?: Record<string, unknown>) => Promise<unknown[]>;
};

const NOW = new Date("2026-02-21T18:00:00.000Z");

function activeCourse(id: number, name: string): Record<string, unknown> {
  return {
    ...fixture.course,
    course_code: `CMPE ${id}`,
    id,
    name,
    enrollments: [{ enrollment_state: "active", type: "student" }],
  };
}

function createClient(
  handler: (
    path: string,
    query?: Record<string, unknown>,
  ) => Promise<unknown[]>,
): CanvasClientFake {
  return { getAll: vi.fn(handler) };
}

describe("SyncService", () => {
  const databases: CanvasDatabase[] = [];

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.delete()));
    databases.length = 0;
  });

  function createDatabase(): CanvasDatabase {
    const database = new CanvasDatabase(`sync-service-${crypto.randomUUID()}`);
    databases.push(database);
    return database;
  }

  it("fetches active student courses and each course's Canvas resources serially before one success commit", async () => {
    const calls: Array<{ path: string; query?: Record<string, unknown> }> = [];
    const courses = [
      activeCourse(101, "Software Design"),
      activeCourse(102, "Networks"),
    ];
    const client = createClient(async (path, query) => {
      calls.push({ path, query });

      if (path === "/api/v1/courses") {
        return courses;
      }

      return [];
    });
    const database = createDatabase();
    const service = new SyncService(client, database, { now_fn: () => NOW });

    await expect(service.run("manual")).resolves.toMatchObject({
      counts: { agenda_items: 0, announcements: 0, courses: 2 },
      status: "success",
    });
    expect(calls).toEqual([
      {
        path: "/api/v1/courses",
        query: {
          enrollment_state: "active",
          enrollment_type: "student",
          "include[]": "term",
          per_page: 100,
        },
      },
      {
        path: "/api/v1/courses/101/assignments",
        query: {
          "include[]": "submission",
          order_by: "due_at",
          override_assignment_dates: true,
          per_page: 100,
        },
      },
      {
        path: "/api/v1/courses/101/discussion_topics",
        query: {
          only_announcements: true,
          order_by: "recent_activity",
          per_page: 100,
        },
      },
      {
        path: "/api/v1/courses/102/assignments",
        query: {
          "include[]": "submission",
          order_by: "due_at",
          override_assignment_dates: true,
          per_page: 100,
        },
      },
      {
        path: "/api/v1/courses/102/discussion_topics",
        query: {
          only_announcements: true,
          order_by: "recent_activity",
          per_page: 100,
        },
      },
    ]);
    await expect(database.courses.count()).resolves.toBe(2);
  });

  it("normalizes supported Canvas records, filters discussions, and persists success metadata with counts", async () => {
    const client = createClient(async (path) => {
      if (path === "/api/v1/courses") {
        return [activeCourse(101, fixture.course.name)];
      }
      if (path.endsWith("/assignments")) {
        return [
          {
            ...fixture.assignments.assignment,
            submission: { workflow_state: "submitted" },
          },
          { ...fixture.assignments.discussion },
        ];
      }

      return [
        { ...fixture.announcement, is_announcement: true },
        {
          ...fixture.announcement,
          id: 402,
          is_announcement: false,
          title: "Ordinary discussion",
        },
      ];
    });
    const database = createDatabase();
    const service = new SyncService(client, database, { now_fn: () => NOW });

    await expect(service.run("startup")).resolves.toMatchObject({
      counts: { agenda_items: 1, announcements: 1, courses: 1 },
      status: "success",
    });
    await expect(database.agenda_items.toArray()).resolves.toEqual([
      expect.objectContaining({ id: "101:201", is_complete: true }),
    ]);
    await expect(database.announcements.toArray()).resolves.toEqual([
      expect.objectContaining({ id: "101:401", title: "Project update" }),
    ]);
    await expect(database.sync_metadata.get("current")).resolves.toMatchObject({
      announcement_count: 1,
      agenda_item_count: 1,
      course_count: 1,
      last_attempt_at: NOW.toISOString(),
      last_status: "success",
      last_success_at: NOW.toISOString(),
    });
  });

  it("retains the prior complete remote snapshot and success time when a later course fails", async () => {
    const database = createDatabase();
    await replaceRemoteSnapshot(database, {
      agenda_items: [],
      announcements: [],
      courses: [
        {
          course_code: "CMPE 100",
          course_id: "999",
          html_url: "https://sjsu.instructure.com/courses/999",
          id: "999:999",
          name: "Previous snapshot",
          object_id: "999",
        },
      ],
    });
    await database.sync_metadata.put({
      id: "current",
      last_attempt_at: "2026-02-20T18:00:00.000Z",
      last_status: "success",
      last_success_at: "2026-02-20T18:00:00.000Z",
    });
    const client = createClient(async (path) => {
      if (path === "/api/v1/courses") {
        return [activeCourse(101, "First"), activeCourse(102, "Fails later")];
      }
      if (path.includes("/102/")) {
        throw new CanvasClientError("network_error");
      }

      return [];
    });
    const service = new SyncService(client, database, { now_fn: () => NOW });

    await expect(service.run("alarm")).resolves.toMatchObject({
      error_code: "network_error",
      status: "network_error",
    });
    await expect(database.courses.toArray()).resolves.toEqual([
      expect.objectContaining({ id: "999:999", name: "Previous snapshot" }),
    ]);
    await expect(database.sync_metadata.get("current")).resolves.toMatchObject({
      error_code: "network_error",
      last_attempt_at: NOW.toISOString(),
      last_status: "network_error",
      last_success_at: "2026-02-20T18:00:00.000Z",
    });
  });
});
