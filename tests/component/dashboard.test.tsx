/**
 * @fileoverview Defines frozen Phase 3 dashboard interaction and accessibility behavior.
 */

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import fixture from "../fixtures/canvas-golden.json";
import { App } from "../../entrypoints/options/App";
import type { SyncResult } from "../../src/sync/sync-service";
import { CanvasDatabase } from "../../src/storage/database";

const NOW = new Date("2026-02-18T20:30:00.000Z");

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
  const database = new CanvasDatabase(
    `dashboard-component-${crypto.randomUUID()}`,
  );
  databases.push(database);
  return database;
}

async function seedDatabase(database: CanvasDatabase): Promise<void> {
  await database.courses.bulkPut([
    {
      id: "101:101",
      course_id: "101",
      object_id: "101",
      name: fixture.course.name,
      course_code: fixture.course.course_code,
      html_url: fixture.course.html_url,
    },
    {
      id: "102:102",
      course_id: "102",
      object_id: "102",
      name: "Computer Networks",
      course_code: "CMPE 102",
      html_url: "https://sjsu.instructure.com/courses/102",
    },
  ]);
  await database.course_preferences.bulkPut([
    { id: "101:101", enabled: true },
    { id: "102:102", enabled: true },
  ]);
  await database.agenda_items.bulkPut([
    {
      id: "101:201",
      course_id: "101",
      object_id: "201",
      title: fixture.assignments.assignment.name,
      due_at: fixture.assignments.assignment.due_at,
      points_possible: fixture.assignments.assignment.points_possible,
      item_type: "assignment",
      is_complete: false,
      html_url: fixture.assignments.assignment.html_url,
    },
    {
      id: "102:202",
      course_id: "102",
      object_id: "202",
      title: "Network exercise",
      due_at: "2026-02-19T18:00:00.000Z",
      points_possible: 10,
      item_type: "assignment",
      is_complete: false,
      html_url: "https://sjsu.instructure.com/courses/102/assignments/202",
    },
  ]);
  await database.announcements.bulkPut([
    {
      id: "101:401",
      course_id: "101",
      object_id: "401",
      title: fixture.announcement.title,
      message:
        "<p>Milestone posted.</p><script>window.executed = true;</script>",
      posted_at: fixture.announcement.posted_at,
      html_url: fixture.announcement.html_url,
    },
    {
      id: "102:402",
      course_id: "102",
      object_id: "402",
      title: "Network update",
      message: "<p>Read chapter four.</p>",
      posted_at: "2026-02-19T18:00:00.000Z",
      html_url:
        "https://sjsu.instructure.com/courses/102/discussion_topics/402",
    },
  ]);
  await database.sync_metadata.put({
    id: "current",
    last_attempt_at: NOW.toISOString(),
    last_success_at: NOW.toISOString(),
    last_status: "success",
  });
}

async function renderDashboard(
  options: {
    metadata?: {
      last_status: "auth_required" | "network_error";
      last_success_at: string | null;
    };
    sendMessage?: (message: { type: "RUN_CANVAS_SYNC" }) => Promise<SyncResult>;
  } = {},
): Promise<{
  database: CanvasDatabase;
  user: ReturnType<typeof userEvent.setup>;
}> {
  const database = createDatabase();
  await seedDatabase(database);
  if (options.metadata !== undefined) {
    await database.sync_metadata.put({
      id: "current",
      last_attempt_at: NOW.toISOString(),
      last_success_at: options.metadata.last_success_at,
      last_status: options.metadata.last_status,
    });
  }
  const user = userEvent.setup();

  render(
    <MantineProvider>
      <App
        database={database}
        now_fn={() => NOW}
        send_message={options.sendMessage ?? vi.fn()}
      />
    </MantineProvider>,
  );
  await screen.findByRole("tab", { name: "Agenda" });

  return { database, user };
}

describe("dashboard workflows", () => {
  it("exposes the four dashboard sections through accessible navigation", async () => {
    await renderDashboard();

    expect(screen.getByRole("tab", { name: "Agenda" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Announcements" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Hidden Items" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeVisible();
  });

  it("renders the exact Pacific due time for agenda work", async () => {
    await renderDashboard();

    expect(await screen.findByText("Module exercise")).toBeVisible();
    expect(screen.getByText("Due Feb 20, 2026, 10:00 AM PST")).toBeVisible();
  });

  it("sends a manual refresh request and exposes its success status", async () => {
    const sendMessage = vi.fn(async (): Promise<SyncResult> => ({
      status: "success",
      trigger: "manual",
      startedAt: NOW.toISOString(),
      completedAt: NOW.toISOString(),
      counts: { courses: 2, agenda_items: 2, announcements: 2 },
    }));
    const { user } = await renderDashboard({ sendMessage });

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({ type: "RUN_CANVAS_SYNC" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Refresh complete",
    );
  });

  it("filters agenda items by title and an inclusive course multi-select", async () => {
    const { user } = await renderDashboard();

    await user.type(
      screen.getByRole("searchbox", { name: "Search agenda" }),
      "exercise",
    );
    expect(await screen.findByText("Module exercise")).toBeVisible();
    expect(screen.getByText("Network exercise")).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: "Software Design" }));
    expect(screen.queryByText("Module exercise")).not.toBeInTheDocument();
    expect(screen.getByText("Network exercise")).toBeVisible();
  });

  it("requires an explicit Save action before persisting an assignment note", async () => {
    const { database, user } = await renderDashboard();

    await user.type(
      await screen.findByRole("textbox", { name: "Note for Module exercise" }),
      "Start with the outline.",
    );
    expect(await database.item_states.get("101:201")).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () =>
      expect(await database.item_states.get("101:201")).toMatchObject({
        hidden: false,
        note: "Start with the outline.",
      }),
    );
  });

  it("moves an item to Hidden Items and restores it to the active agenda", async () => {
    const { database, user } = await renderDashboard();

    await user.click(
      await screen.findByRole("checkbox", { name: "Hide Module exercise" }),
    );
    await user.click(screen.getByRole("tab", { name: "Hidden Items" }));
    expect(await screen.findByText("Module exercise")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Restore Module exercise" }),
    );

    await waitFor(async () =>
      expect(await database.item_states.get("101:201")).toMatchObject({
        hidden: false,
      }),
    );
    await user.click(screen.getByRole("tab", { name: "Agenda" }));
    expect(await screen.findByText("Module exercise")).toBeVisible();
  });

  it("renders inert announcement text grouped by course", async () => {
    const { user } = await renderDashboard();

    await user.click(screen.getByRole("tab", { name: "Announcements" }));

    const softwareGroup = await screen.findByRole("region", {
      name: "Software Design announcements",
    });
    expect(within(softwareGroup).getByText("Project update")).toBeVisible();
    expect(within(softwareGroup).getByText("Milestone posted.")).toBeVisible();
    expect(
      within(softwareGroup).queryByText("window.executed = true;"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Computer Networks announcements" }),
    ).toBeVisible();
  });

  it("hides an announcement and restores it in the Hidden Items tab", async () => {
    const { database, user } = await renderDashboard();

    await user.click(screen.getByRole("tab", { name: "Announcements" }));
    await user.click(
      await screen.findByRole("checkbox", { name: "Hide Project update" }),
    );

    await waitFor(async () => {
      expect(screen.queryByText("Project update")).not.toBeInTheDocument();
      expect(await database.item_states.get("101:401")).toMatchObject({
        hidden: true,
      });
    });

    await user.click(screen.getByRole("tab", { name: "Hidden Items" }));
    expect(await screen.findByText("Project update")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Restore Project update" }),
    );

    await waitFor(async () =>
      expect(await database.item_states.get("101:401")).toMatchObject({
        hidden: false,
      }),
    );

    await user.click(screen.getByRole("tab", { name: "Announcements" }));
    expect(await screen.findByText("Project update")).toBeVisible();
  });

  it("persists a Settings course toggle by stable course key", async () => {
    const { database, user } = await renderDashboard();

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const toggle = await screen.findByRole("checkbox", {
      name: "Software Design",
    });
    expect(toggle).toBeChecked();
    await user.click(toggle);

    await waitFor(async () =>
      expect(await database.course_preferences.get("101:101")).toEqual({
        id: "101:101",
        enabled: false,
      }),
    );
  });

  it("shows a stale authentication warning and a Canvas sign-in action", async () => {
    await renderDashboard({
      metadata: {
        last_status: "auth_required",
        last_success_at: "2026-02-18T18:30:00.000Z",
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data may be stale",
    );
    expect(
      screen.getByRole("link", { name: "Open Canvas to Sign In" }),
    ).toHaveAttribute("href", "https://sjsu.instructure.com/");
  });

  it("requires confirmation before Clear Data deletes the local profile", async () => {
    const { database, user } = await renderDashboard();

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(await screen.findByRole("button", { name: "Clear Data" }));
    expect(
      screen.getByRole("dialog", { name: "Clear all data?" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Confirm Clear Data" }),
    );

    await waitFor(async () => {
      expect(await database.courses.count()).toBe(0);
      expect(await database.agenda_items.count()).toBe(0);
      expect(await database.item_states.count()).toBe(0);
    });
  });
});
