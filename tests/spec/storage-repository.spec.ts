import { afterEach, describe, expect, it } from "vitest";

import { CanvasDatabase } from "../../src/storage/database";
import {
  clearAllData,
  replaceRemoteSnapshot,
  saveCoursePreference,
  saveItemState,
} from "../../src/storage/repository";

describe("Canvas repository", () => {
  const databases: CanvasDatabase[] = [];

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.delete()));
    databases.length = 0;
  });

  function createDatabase(): CanvasDatabase {
    const database = new CanvasDatabase(`canvas-spec-${crypto.randomUUID()}`);
    databases.push(database);
    return database;
  }

  it("replaces remote records while preserving notes and hidden state", async () => {
    const database = createDatabase();
    await replaceRemoteSnapshot(database, {
      courses: [
        {
          id: "101:101",
          course_id: "101",
          object_id: "101",
          name: "Software Design",
          course_code: "CMPE 100",
          html_url: "https://sjsu.instructure.com/courses/101",
        },
      ],
      agenda_items: [
        {
          id: "101:201",
          course_id: "101",
          object_id: "201",
          title: "Module exercise",
          due_at: null,
          points_possible: null,
          item_type: "assignment",
          html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
        },
      ],
      announcements: [],
    });
    await saveItemState(database, "101:201", {
      hidden: true,
      note: "Start with the outline.",
    });

    await replaceRemoteSnapshot(database, {
      courses: [
        {
          id: "101:101",
          course_id: "101",
          object_id: "101",
          name: "Software Design",
          course_code: "CMPE 100",
          html_url: "https://sjsu.instructure.com/courses/101",
        },
      ],
      agenda_items: [
        {
          id: "101:201",
          course_id: "101",
          object_id: "201",
          title: "Updated exercise",
          due_at: "2026-02-20T18:00:00Z",
          points_possible: 25,
          item_type: "assignment",
          html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
        },
      ],
      announcements: [],
    });

    await expect(database.agenda_items.get("101:201")).resolves.toMatchObject({
      title: "Updated exercise",
      points_possible: 25,
    });
    await expect(database.item_states.get("101:201")).resolves.toMatchObject({
      hidden: true,
      note: "Start with the outline.",
    });
  });

  it("enables new courses by default and retains an explicit course preference", async () => {
    const database = createDatabase();
    await replaceRemoteSnapshot(database, {
      courses: [
        {
          id: "101:101",
          course_id: "101",
          object_id: "101",
          name: "Software Design",
          course_code: "CMPE 100",
          html_url: "https://sjsu.instructure.com/courses/101",
        },
      ],
      agenda_items: [],
      announcements: [],
    });

    await expect(
      database.course_preferences.get("101:101"),
    ).resolves.toMatchObject({ enabled: true });
    await saveCoursePreference(database, "101:101", false);
    await replaceRemoteSnapshot(database, {
      courses: [
        {
          id: "101:101",
          course_id: "101",
          object_id: "101",
          name: "Software Design",
          course_code: "CMPE 100",
          html_url: "https://sjsu.instructure.com/courses/101",
        },
      ],
      agenda_items: [],
      announcements: [],
    });
    await expect(
      database.course_preferences.get("101:101"),
    ).resolves.toMatchObject({ enabled: false });
  });

  it("removes stale remote records on replacement and clears every local store", async () => {
    const database = createDatabase();
    await replaceRemoteSnapshot(database, {
      courses: [
        {
          id: "101:101",
          course_id: "101",
          object_id: "101",
          name: "Software Design",
          course_code: "CMPE 100",
          html_url: "https://sjsu.instructure.com/courses/101",
        },
      ],
      agenda_items: [
        {
          id: "101:201",
          course_id: "101",
          object_id: "201",
          title: "Module exercise",
          due_at: null,
          points_possible: null,
          item_type: "assignment",
          html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
        },
      ],
      announcements: [
        {
          id: "101:401",
          course_id: "101",
          object_id: "401",
          title: "Project update",
          message: "Milestone posted.",
          posted_at: "2026-02-18T18:00:00Z",
          html_url:
            "https://sjsu.instructure.com/courses/101/discussion_topics/401",
        },
      ],
    });
    await saveItemState(database, "101:201", {
      hidden: true,
      note: "Start with the outline.",
    });
    await replaceRemoteSnapshot(database, {
      courses: [],
      agenda_items: [],
      announcements: [],
    });

    await expect(database.courses.count()).resolves.toBe(0);
    await expect(database.agenda_items.count()).resolves.toBe(0);
    await expect(database.announcements.count()).resolves.toBe(0);
    await clearAllData(database);
    await expect(database.item_states.count()).resolves.toBe(0);
    await expect(database.course_preferences.count()).resolves.toBe(0);
  });
});
