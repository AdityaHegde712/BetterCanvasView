import { afterEach, describe, expect, it } from "vitest";

import { CanvasDatabase } from "../../src/storage/database";
import {
  addIsaTodo,
  clearAllData,
  clearCompletedIsaTodos,
  deleteIsaTodo,
  replaceRemoteSnapshot,
  toggleIsaTodo,
} from "../../src/storage/repository";
import type { IsaAssignmentRecord } from "../../src/domain/models";

describe("ISA Storage & Repository", () => {
  const databases: CanvasDatabase[] = [];

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.delete()));
    databases.length = 0;
  });

  function createDatabase(): CanvasDatabase {
    const database = new CanvasDatabase(`isa-spec-${crypto.randomUUID()}`);
    databases.push(database);
    return database;
  }

  const sampleIsaAssignment: IsaAssignmentRecord = {
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
  };

  it("persists and replaces isa_assignments in remote snapshot", async () => {
    const database = createDatabase();

    await replaceRemoteSnapshot(database, {
      courses: [],
      agenda_items: [],
      announcements: [],
      isa_assignments: [sampleIsaAssignment],
    });

    const stored = await database.isa_assignments.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(sampleIsaAssignment);

    // Second snapshot replaces previous items
    const updatedAssignment: IsaAssignmentRecord = {
      ...sampleIsaAssignment,
      needs_grading_count: 0,
    };

    await replaceRemoteSnapshot(database, {
      courses: [],
      agenda_items: [],
      announcements: [],
      isa_assignments: [updatedAssignment],
    });

    const refreshed = await database.isa_assignments.toArray();
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]?.needs_grading_count).toBe(0);
  });

  it("manages persistent ISA quick todos (add, toggle, delete, clearCompleted)", async () => {
    const database = createDatabase();

    const todo1 = await addIsaTodo(database, "Grade late submissions");
    const todo2 = await addIsaTodo(database, "Prepare rubrics");

    expect(todo1.text).toBe("Grade late submissions");
    expect(todo1.completed).toBe(false);

    let allTodos = await database.isa_todos.toArray();
    expect(allTodos).toHaveLength(2);

    await toggleIsaTodo(database, todo1.id, true);
    const updated1 = await database.isa_todos.get(todo1.id);
    expect(updated1?.completed).toBe(true);

    await deleteIsaTodo(database, todo2.id);
    allTodos = await database.isa_todos.toArray();
    expect(allTodos).toHaveLength(1);
    expect(allTodos[0]?.id).toBe(todo1.id);

    await addIsaTodo(database, "Another task");
    await clearCompletedIsaTodos(database);
    allTodos = await database.isa_todos.toArray();
    expect(allTodos).toHaveLength(1);
    expect(allTodos[0]?.text).toBe("Another task");
  });

  it("clears isa_assignments and isa_todos on clearAllData", async () => {
    const database = createDatabase();

    await replaceRemoteSnapshot(database, {
      courses: [],
      agenda_items: [],
      announcements: [],
      isa_assignments: [sampleIsaAssignment],
    });
    await addIsaTodo(database, "Temporary task");

    expect(await database.isa_assignments.count()).toBe(1);
    expect(await database.isa_todos.count()).toBe(1);

    await clearAllData(database);

    expect(await database.isa_assignments.count()).toBe(0);
    expect(await database.isa_todos.count()).toBe(0);
  });
});
