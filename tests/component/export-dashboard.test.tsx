import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../entrypoints/options/App";
import { CanvasDatabase } from "../../src/storage/database";
import type { CanvasDeliverableDownloader } from "../../src/export/canvas-downloader";

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
  const database = new CanvasDatabase(
    `export-component-${crypto.randomUUID()}`,
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
      name: "Data Mining",
      course_code: "CMPE-255",
      html_url: "https://sjsu.instructure.com/courses/101",
      enrollment_type: "student",
    },
  ]);

  await database.course_preferences.bulkPut([{ id: "101:101", enabled: true }]);

  await database.agenda_items.bulkPut([
    {
      id: "101:201",
      course_id: "101",
      object_id: "201",
      title: "Homework 1: Clustering",
      due_at: "2026-09-20T23:59:00Z",
      points_possible: 100,
      item_type: "assignment",
      is_complete: false,
      html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
    },
    {
      id: "101:202",
      course_id: "101",
      object_id: "202",
      title: "Homework 2: Decision Trees",
      due_at: "2026-09-27T23:59:00Z",
      points_possible: 50,
      item_type: "assignment",
      is_complete: false,
      html_url: "https://sjsu.instructure.com/courses/101/assignments/202",
    },
  ]);
}

describe("Dashboard Deliverables Export UI", () => {
  it("toggles selection mode, checks deliverables, and triggers batch download", async () => {
    const user = userEvent.setup();
    const database = createDatabase();
    await seedDatabase(database);

    const downloadDeliverableMock = vi.fn().mockResolvedValue({
      material: {
        target: {
          id: "101:201",
          course_id: "101",
          course_code: "CMPE-255",
          title: "Homework 1: Clustering",
          due_at: "2026-09-20T23:59:00Z",
          points_possible: 100,
          deliverable_type: "assignment",
          html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
        },
        localized_html: "<html><body>HW1</body></html>",
        raw_description_html: "<p>HW1</p>",
        attachments: [],
        embedded_images: [],
      },
      downloadedFiles: new Map(),
      downloadedImages: new Map(),
      issues: [],
    });

    const mockDownloader = {
      downloadDeliverable: downloadDeliverableMock,
    } as unknown as CanvasDeliverableDownloader;

    const mockZipPackager = vi
      .fn()
      .mockResolvedValue(new Blob(["zip-content"]));
    const mockDownloadTrigger = vi.fn();

    render(
      <MantineProvider>
        <App
          database={database}
          now_fn={() => NOW}
          send_message={vi.fn().mockResolvedValue({
            status: "success",
            trigger: "manual",
            startedAt: NOW.toISOString(),
            completedAt: NOW.toISOString(),
          })}
          downloader={mockDownloader}
          zip_packager_fn={mockZipPackager}
          download_trigger_fn={mockDownloadTrigger}
        />
      </MantineProvider>,
    );

    // Verify initial state: "Download Assignment Deliverables" button is visible
    const toggleBtn = await screen.findByRole("button", {
      name: /download assignment deliverables/i,
    });
    expect(toggleBtn).toBeInTheDocument();

    // Click to enter selection mode
    await user.click(toggleBtn);

    // Action bar items appear
    expect(await screen.findByText(/0 selected/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^select all/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /exit selection mode/i }),
    ).toBeInTheDocument();

    // Checkboxes appear on the deliverables
    const hw1Checkbox = screen.getByRole("checkbox", {
      name: /select homework 1: clustering for download/i,
    });
    expect(hw1Checkbox).not.toBeChecked();

    // Select Homework 1
    await user.click(hw1Checkbox);
    expect(hw1Checkbox).toBeChecked();
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

    // Click "Select All"
    const selectAllBtn = screen.getByRole("button", { name: /^select all/i });
    await user.click(selectAllBtn);
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();

    // Click "Download Materials (.zip)"
    const downloadBtn = screen.getByRole("button", {
      name: /download materials \(\.zip\)/i,
    });
    await user.click(downloadBtn);

    // Verify mockDownloader was called for selected items
    await waitFor(() => {
      expect(downloadDeliverableMock).toHaveBeenCalledTimes(2);
      expect(mockZipPackager).toHaveBeenCalled();
      expect(mockDownloadTrigger).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/canvas_assignments_\d{4}-\d{2}-\d{2}\.zip/),
      );
    });
  });
});
