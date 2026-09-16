/**
 * @fileoverview Provides isolated Playwright fixtures for Chrome MV3 extension testing.
 */

import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EXTENSION_PATH = path.resolve(process.cwd(), ".output/chrome-mv3");

export interface MockCanvasData {
  courses?: Array<Record<string, unknown>>;
  courseAssignments?: Record<string | number, Array<Record<string, unknown>>>;
  courseAnnouncements?: Record<string | number, Array<Record<string, unknown>>>;
  authError?: boolean;
}

export const DEFAULT_MOCK_CANVAS: MockCanvasData = {
  courses: [
    {
      id: 101,
      name: "Software Design",
      course_code: "CMPE 100",
      workflow_state: "available",
      html_url: "https://sjsu.instructure.com/courses/101",
    },
    {
      id: 102,
      name: "Computer Networks",
      course_code: "CMPE 102",
      workflow_state: "available",
      html_url: "https://sjsu.instructure.com/courses/102",
    },
  ],
  courseAssignments: {
    101: [
      {
        id: 201,
        name: "Module exercise",
        due_at: "2026-02-20T18:00:00Z",
        points_possible: 25,
        html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
        submission: {
          workflow_state: "unsubmitted",
          late: false,
          missing: false,
        },
      },
    ],
    102: [
      {
        id: 202,
        name: "Network exercise",
        due_at: "2026-02-21T18:00:00Z",
        points_possible: 10,
        html_url: "https://sjsu.instructure.com/courses/102/assignments/202",
        submission: {
          workflow_state: "unsubmitted",
          late: false,
          missing: false,
        },
      },
    ],
  },
  courseAnnouncements: {
    101: [
      {
        id: 401,
        title: "Project update",
        is_announcement: true,
        message:
          "<p>Milestone posted.</p><script>window.executed = true;</script>",
        posted_at: "2026-02-18T18:00:00Z",
        html_url:
          "https://sjsu.instructure.com/courses/101/discussion_topics/401",
      },
    ],
    102: [
      {
        id: 402,
        title: "Network update",
        is_announcement: true,
        message: "<p>Read chapter four.</p>",
        posted_at: "2026-02-19T18:00:00Z",
        html_url:
          "https://sjsu.instructure.com/courses/102/discussion_topics/402",
      },
    ],
  },
};

export interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
  optionsPage: Page;
  setCanvasMock: (data: MockCanvasData) => void;
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "playwright-canvas-ext-"),
    );

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--headless=new",
      ],
    });

    try {
      await use(context);
    } finally {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },

  serviceWorker: async ({ context }, use) => {
    let worker = context.serviceWorkers()[0];
    if (worker === undefined) {
      worker = await Promise.race([
        context
          .waitForEvent("serviceworker", { timeout: 5000 })
          .catch(() => undefined),
        new Promise<Worker | undefined>((resolve) => {
          const interval = setInterval(() => {
            const w = context.serviceWorkers()[0];
            if (w !== undefined) {
              clearInterval(interval);
              resolve(w);
            }
          }, 100);
          setTimeout(() => {
            clearInterval(interval);
            resolve(undefined);
          }, 5000);
        }),
      ]);
    }

    if (worker === undefined) {
      // Fallback: check one more time
      worker = context.serviceWorkers()[0];
    }

    if (worker === undefined) {
      throw new Error("Could not find extension service worker within 5000ms.");
    }
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    const extensionId = serviceWorker.url().split("/")[2];
    if (extensionId === undefined || extensionId.length === 0) {
      throw new Error(
        "Could not determine extension ID from service worker URL.",
      );
    }
    await use(extensionId);
  },

  setCanvasMock: async ({ context, serviceWorker }, use) => {
    let currentMock = DEFAULT_MOCK_CANVAS;

    const setupWorkerMock = async (mockData: MockCanvasData) => {
      await serviceWorker.evaluate((data) => {
        const target = globalThis as unknown as {
          __TEST_CANVAS_MOCK__?: MockCanvasData;
          __ORIGINAL_FETCH__?: typeof fetch;
        };

        target.__TEST_CANVAS_MOCK__ = data;

        if (target.__ORIGINAL_FETCH__ === undefined) {
          target.__ORIGINAL_FETCH__ = globalThis.fetch.bind(globalThis);
          globalThis.fetch = async (
            input: RequestInfo | URL,
            init?: RequestInit,
          ): Promise<Response> => {
            const urlString =
              typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.toString()
                  : input.url;
            const url = new URL(urlString);

            if (url.origin === "https://sjsu.instructure.com") {
              const activeMock = target.__TEST_CANVAS_MOCK__ ?? {};

              if (activeMock.authError) {
                return new Response(
                  JSON.stringify({ errors: [{ message: "Unauthorized" }] }),
                  {
                    status: 401,
                    headers: { "content-type": "application/json" },
                  },
                );
              }

              if (url.pathname === "/api/v1/courses") {
                return new Response(JSON.stringify(activeMock.courses ?? []), {
                  status: 200,
                  headers: { "content-type": "application/json" },
                });
              }

              const assignmentMatch = url.pathname.match(
                /^\/api\/v1\/courses\/(\d+)\/assignments$/,
              );
              if (assignmentMatch !== null) {
                const courseId = assignmentMatch[1];
                const assignments =
                  courseId !== undefined
                    ? (activeMock.courseAssignments?.[courseId] ?? [])
                    : [];
                return new Response(JSON.stringify(assignments), {
                  status: 200,
                  headers: { "content-type": "application/json" },
                });
              }

              const announcementMatch = url.pathname.match(
                /^\/api\/v1\/courses\/(\d+)\/discussion_topics$/,
              );
              if (announcementMatch !== null) {
                const courseId = announcementMatch[1];
                const announcements =
                  courseId !== undefined
                    ? (activeMock.courseAnnouncements?.[courseId] ?? [])
                    : [];
                return new Response(JSON.stringify(announcements), {
                  status: 200,
                  headers: { "content-type": "application/json" },
                });
              }

              return new Response(
                JSON.stringify({ errors: [{ message: "Not found" }] }),
                {
                  status: 404,
                  headers: { "content-type": "application/json" },
                },
              );
            }

            return target.__ORIGINAL_FETCH__!(input, init);
          };
        }
      }, mockData);
    };

    // Also route context page requests if any
    await context.route("https://sjsu.instructure.com/**", async (route) => {
      const url = new URL(route.request().url());

      if (currentMock.authError) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ errors: [{ message: "Unauthorized" }] }),
        });
        return;
      }

      if (url.pathname === "/api/v1/courses") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentMock.courses ?? []),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ errors: [{ message: "Not found" }] }),
      });
    });

    await setupWorkerMock(currentMock);

    await use((data: MockCanvasData) => {
      currentMock = data;
      void setupWorkerMock(data);
    });
  },

  optionsPage: async ({ context, extensionId, setCanvasMock }, use) => {
    void setCanvasMock;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector("#root");
    await use(page);
  },
});

export { expect } from "@playwright/test";
