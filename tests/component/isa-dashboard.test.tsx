import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../entrypoints/options/App";
import { CanvasDatabase } from "../../src/storage/database";

const NOW = new Date("2026-09-15T18:00:00.000Z");

const databases: CanvasDatabase[] = [];

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

afterEach(async () => {
  cleanup();
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

function createDatabase(): CanvasDatabase {
  const database = new CanvasDatabase(`isa-component-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

async function seedDatabase(database: CanvasDatabase): Promise<void> {
  await database.courses.bulkPut([
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
      name: "FA26: CMPE-257 Sec 01 - Machine Learning",
      course_code: "CMPE 257",
      html_url: "https://sjsu.instructure.com/courses/1632798",
      enrollment_type: "ta",
    },
  ]);

  await database.course_preferences.bulkPut([
    { id: "101:101", enabled: true },
    { id: "1632798:1632798", enabled: true },
  ]);

  await database.isa_assignments.bulkPut([
    {
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
    },
  ]);

  await database.isa_todos.bulkPut([
    {
      id: "todo-1",
      text: "Grade late submissions for Lab 2",
      completed: false,
      created_at: "2026-09-15T12:00:00.000Z",
    },
  ]);
}

describe("ISA Dashboard Component", () => {
  it("renders ISA Tasks tab with badge and switches into 2-column ISA view", async () => {
    const user = userEvent.setup();
    const database = createDatabase();
    await seedDatabase(database);

    render(
      <MantineProvider>
        <App
          database={database}
          now_fn={() => NOW}
          send_message={vi.fn().mockResolvedValue({ status: "success" })}
        />
      </MantineProvider>,
    );

    // ISA Tasks tab with badge '1'
    const isaTab = await screen.findByRole("tab", { name: /ISA Tasks/i });
    expect(isaTab).toBeInTheDocument();

    await user.click(isaTab);

    // Check header and grading card
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /To Be Graded/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Lab 3: Logistic Regression")).toBeInTheDocument();
    expect(screen.getByText(/14 to grade/i)).toBeInTheDocument();

    // Verify SpeedGrader link
    const speedGraderLink = screen.getByRole("link", { name: /SpeedGrader/i });
    expect(speedGraderLink).toHaveAttribute(
      "href",
      "https://sjsu.instructure.com/courses/1632798/gradebook/speed_grader?assignment_id=501",
    );

    // Verify existing todo item
    expect(
      screen.getByText("Grade late submissions for Lab 2"),
    ).toBeInTheDocument();

    // Add a new todo item
    const input = screen.getByPlaceholderText(/Add an ISA task/i);
    await user.type(input, "Prepare quiz rubrics{enter}");

    await waitFor(() => {
      expect(screen.getByText("Prepare quiz rubrics")).toBeInTheDocument();
    });
  });
});
