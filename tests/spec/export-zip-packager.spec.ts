import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import {
  createAssignmentsZip,
  sanitizeDirectoryName,
} from "../../src/export/zip-packager";
import type { SingleDeliverableResult } from "../../src/export/canvas-downloader";
import type { DeliverableExportTarget } from "../../src/export/models";

describe("ZIP Packager Engine", () => {
  const sampleTarget: DeliverableExportTarget = {
    id: "101:201",
    course_id: "101",
    course_code: "CMPE-255: Data Mining",
    title: "Homework 2 / Classification & Clustering",
    due_at: "2026-09-24T23:59:00Z",
    points_possible: 100,
    deliverable_type: "assignment",
    html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
  };

  it("sanitizes directory names removing invalid filesystem characters", () => {
    const raw = 'CMPE-255: Homework 2 / "Classification"? <Part 1> | Main';
    const sanitized = sanitizeDirectoryName(raw);
    expect(sanitized).not.toMatch(/[/\\:*?"<>|]/);
    expect(sanitized).toBe(
      "CMPE-255_ Homework 2 _ _Classification_ _Part 1_ _ Main",
    );
  });

  it("builds a structured zip containing instructions.html, attachments, and embedded images", async () => {
    const filesMap = new Map<string, ArrayBuffer>();
    filesMap.set(
      "dataset.csv",
      new TextEncoder().encode("col1,col2\n1,2").buffer,
    );

    const imagesMap = new Map<string, ArrayBuffer>();
    imagesMap.set(
      "image_1.png",
      new TextEncoder().encode("fake-png-bytes").buffer,
    );

    const deliverableResults: SingleDeliverableResult[] = [
      {
        material: {
          target: sampleTarget,
          localized_html: "<html><body>Instructions</body></html>",
          raw_description_html: "<p>Instructions</p>",
          attachments: [
            {
              id: "5001",
              display_name: "dataset.csv",
              download_url: "https://example.com/dataset.csv",
            },
          ],
          embedded_images: [
            {
              original_url: "https://example.com/image_1.png",
              local_filename: "image_1.png",
            },
          ],
        },
        downloadedFiles: filesMap,
        downloadedImages: imagesMap,
        issues: [],
      },
    ];

    const blob = await createAssignmentsZip(deliverableResults, []);
    expect(blob).toBeInstanceOf(Blob);

    // Read back with JSZip to verify structure
    const zip = await JSZip.loadAsync(blob);
    const folderPrefix =
      "CMPE-255_ Data Mining_Homework 2 _ Classification & Clustering";

    const instructionsFile = zip.file(`${folderPrefix}/instructions.html`);
    expect(instructionsFile).not.toBeNull();
    const instructionsContent = await instructionsFile?.async("text");
    expect(instructionsContent).toBe("<html><body>Instructions</body></html>");

    const attachmentFile = zip.file(`${folderPrefix}/attachments/dataset.csv`);
    expect(attachmentFile).not.toBeNull();

    const imageFile = zip.file(
      `${folderPrefix}/attachments/images/image_1.png`,
    );
    expect(imageFile).not.toBeNull();

    // No issues, so no report file
    expect(zip.file("export_report.txt")).toBeNull();
  });

  it("includes an export_report.txt when issues are present", async () => {
    const blob = await createAssignmentsZip(
      [],
      [
        {
          deliverable_id: "101:201",
          deliverable_title: "HW2",
          resource_name: "dataset.csv",
          error_message: "HTTP 404 Not Found",
        },
      ],
    );

    const zip = await JSZip.loadAsync(blob);
    const reportFile = zip.file("export_report.txt");
    expect(reportFile).not.toBeNull();
    const reportContent = await reportFile?.async("text");
    expect(reportContent).toContain("HTTP 404 Not Found");
    expect(reportContent).toContain("dataset.csv");
  });
});
