/**
 * @fileoverview Locks synchronization ordering across overlapping triggers.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasClientError } from "../../src/canvas/client";
import { CanvasDatabase } from "../../src/storage/database";
import { SyncService } from "../../src/sync/sync-service";

function course(id: number, name: string): Record<string, unknown> {
  return {
    course_code: `CMPE ${id}`,
    html_url: `https://sjsu.instructure.com/courses/${id}`,
    id,
    name,
  };
}

describe("SyncService concurrency", () => {
  const databases: CanvasDatabase[] = [];

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.delete()));
    databases.length = 0;
  });

  function createDatabase(): CanvasDatabase {
    const database = new CanvasDatabase(`sync-queue-${crypto.randomUUID()}`);
    databases.push(database);
    return database;
  }

  it("serializes overlapping triggers so a later snapshot commits last", async () => {
    let releaseFirst: (courses: unknown[]) => void = () => undefined;
    const firstCourses = new Promise<unknown[]>((resolve) => {
      releaseFirst = resolve;
    });
    let courseRequests = 0;
    const client = {
      getAll: vi.fn((path: string): Promise<unknown[]> => {
        if (path === "/api/v1/courses") {
          courseRequests += 1;
          return courseRequests === 1
            ? firstCourses
            : Promise.resolve([course(102, "Later snapshot")]);
        }

        return Promise.resolve([]);
      }),
    };
    const database = createDatabase();
    const service = new SyncService(client, database);

    const firstRun = service.run("alarm");
    const secondRun = service.run("manual");
    await Promise.resolve();
    const requestsBeforeRelease = courseRequests;
    releaseFirst([course(101, "Earlier snapshot")]);

    await expect(firstRun).resolves.toMatchObject({ trigger: "alarm" });
    await expect(secondRun).resolves.toMatchObject({ trigger: "manual" });
    expect(requestsBeforeRelease).toBe(1);
    await expect(database.courses.toArray()).resolves.toEqual([
      expect.objectContaining({ name: "Later snapshot", object_id: "102" }),
    ]);
  });

  it("continues the queue after a failed synchronization", async () => {
    let courseRequests = 0;
    const client = {
      getAll: vi.fn((path: string): Promise<unknown[]> => {
        if (path !== "/api/v1/courses") {
          return Promise.resolve([]);
        }

        courseRequests += 1;
        return courseRequests === 1
          ? Promise.reject(new CanvasClientError("network_error"))
          : Promise.resolve([course(102, "Recovered snapshot")]);
      }),
    };
    const database = createDatabase();
    const service = new SyncService(client, database);

    const failedRun = service.run("alarm");
    const recoveredRun = service.run("manual");

    await expect(failedRun).resolves.toMatchObject({
      status: "network_error",
      trigger: "alarm",
    });
    await expect(recoveredRun).resolves.toMatchObject({
      status: "success",
      trigger: "manual",
    });
    await expect(database.courses.toArray()).resolves.toEqual([
      expect.objectContaining({ name: "Recovered snapshot", object_id: "102" }),
    ]);
  });
});
