import { describe, expect, it, vi } from "vitest";

import {
  CanvasDeliverableDownloader,
  type DeliverableFetchClient,
  parseContentDispositionFilename,
} from "../../src/export/canvas-downloader";
import type { DeliverableExportTarget } from "../../src/export/models";

describe("Canvas Deliverable & Attachment Downloader", () => {
  const sampleAssignment: DeliverableExportTarget = {
    id: "101:201",
    course_id: "101",
    course_code: "CMPE-255",
    title: "Homework 2: Classification",
    due_at: "2026-09-24T23:59:00Z",
    points_possible: 100,
    deliverable_type: "assignment",
    html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
  };

  it("fetches assignment description and combines API attachments with HTML linked attachments", async () => {
    const mockGet = vi.fn().mockResolvedValue({
      id: 201,
      description: `
        <p>Please use this dataset:</p>
        <a href="https://sjsu.instructure.com/courses/101/files/5001/download">dataset.csv</a>
        <img src="https://sjsu.instructure.com/courses/101/files/6001/preview" alt="diagram" />
      `,
      attachments: [
        {
          id: 7001,
          display_name: "rubric.pdf",
          url: "https://sjsu.instructure.com/files/7001/download",
          size: 1024,
        },
      ],
    });

    const mockClient: DeliverableFetchClient = {
      get: mockGet,
    };

    const mockFetchFn = vi.fn().mockImplementation(async () => {
      return new Response(new ArrayBuffer(8), { status: 200 });
    });

    const downloader = new CanvasDeliverableDownloader({
      client: mockClient,
      fetchFn: mockFetchFn,
    });

    const progressUpdates: string[] = [];
    const result = await downloader.downloadDeliverable(sampleAssignment, {
      onProgress: (state) => progressUpdates.push(state.message),
    });

    expect(mockGet).toHaveBeenCalledWith("/api/v1/courses/101/assignments/201");
    expect(result.material.attachments).toHaveLength(2); // 1 from API attachments + 1 from HTML link
    expect(result.material.embedded_images).toHaveLength(1);
    expect(result.material.localized_html).toContain(
      "attachments/images/image_1.png",
    );
    expect(result.issues).toHaveLength(0);
    expect(progressUpdates.length).toBeGreaterThan(0);
  });

  it("resiliently records an issue and continues if a file attachment download fails", async () => {
    const mockGet = vi.fn().mockResolvedValue({
      id: 201,
      description: `
        <a href="https://sjsu.instructure.com/courses/101/files/5001/download">broken_link.csv</a>
      `,
      attachments: [],
    });

    const mockClient: DeliverableFetchClient = {
      get: mockGet,
    };

    const mockFetchFn = vi.fn().mockImplementation(async () => {
      return new Response(null, {
        status: 404,
        statusText: "Not Found",
      });
    });

    const downloader = new CanvasDeliverableDownloader({
      client: mockClient,
      fetchFn: mockFetchFn,
    });

    const result = await downloader.downloadDeliverable(sampleAssignment);

    // File download failed, but deliverable material was still returned with an issue recorded
    expect(result.material).toBeDefined();
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.resource_name).toBe("broken_link.csv");
    expect(result.issues[0]?.error_message).toContain("404");
  });

  describe("parseContentDispositionFilename", () => {
    it("parses standard quoted filenames", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="homework_1.pdf"',
        ),
      ).toBe("homework_1.pdf");
    });

    it("parses unquoted filenames", () => {
      expect(
        parseContentDispositionFilename("attachment; filename=homework_1.pdf"),
      ).toBe("homework_1.pdf");
    });

    it("parses RFC 5987 utf-8 encoded filenames", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=UTF-8''Machine%20Learning%20Notes.pdf",
        ),
      ).toBe("Machine Learning Notes.pdf");
    });

    it("prefers RFC 5987 filename* over standard filename fallback", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename=\"fallback.csv\"; filename*=utf-8''actual_data.csv",
        ),
      ).toBe("actual_data.csv");
    });

    it("returns null for missing, empty, or header without filename", () => {
      expect(parseContentDispositionFilename(null)).toBeNull();
      expect(parseContentDispositionFilename("")).toBeNull();
      expect(parseContentDispositionFilename("inline")).toBeNull();
      expect(parseContentDispositionFilename("attachment")).toBeNull();
    });
  });

  it("updates generic anchor names with authoritative filename from Content-Disposition and syncs HTML", async () => {
    const mockGet = vi.fn().mockResolvedValue({
      id: 201,
      description: `
        <p>Download the starter notebook <a href="https://sjsu.instructure.com/courses/101/files/5001">here</a></p>
      `,
      attachments: [],
    });

    const mockClient: DeliverableFetchClient = {
      get: mockGet,
    };

    const mockFetchFn = vi.fn().mockImplementation(async () => {
      return new Response(new ArrayBuffer(16), {
        status: 200,
        headers: {
          "content-disposition":
            'attachment; filename="starter_notebook.ipynb"',
        },
      });
    });

    const downloader = new CanvasDeliverableDownloader({
      client: mockClient,
      fetchFn: mockFetchFn,
    });

    const result = await downloader.downloadDeliverable(sampleAssignment);

    expect(result.downloadedFiles.has("starter_notebook.ipynb")).toBe(true);
    expect(result.material.attachments[0]?.display_name).toBe(
      "starter_notebook.ipynb",
    );
    expect(result.material.localized_html).toContain(
      'href="attachments/starter_notebook.ipynb"',
    );
    expect(result.material.localized_html).toContain(
      'download="starter_notebook.ipynb"',
    );
  });

  it("binds global fetch to globalThis when no custom fetchFn is provided", async () => {
    const mockGet = vi.fn().mockResolvedValue({
      id: 201,
      description: "<p>Plain assignment</p>",
      attachments: [],
    });

    const mockClient: DeliverableFetchClient = {
      get: mockGet,
    };

    const originalFetch = globalThis.fetch;
    const globalFetchSpy = vi.fn().mockImplementation(async () => {
      return new Response(new ArrayBuffer(8), { status: 200 });
    });
    globalThis.fetch = globalFetchSpy;

    try {
      const downloader = new CanvasDeliverableDownloader({
        client: mockClient,
      });

      const result = await downloader.downloadDeliverable(sampleAssignment);
      expect(result.material).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
