import { describe, expect, it } from "vitest";

import {
  extractCanvasFileLinks,
  extractEmbeddedImages,
  localizeAssignmentHtml,
} from "../../src/export/html-localizer";
import type {
  AttachmentResource,
  DeliverableExportTarget,
  EmbeddedImageResource,
} from "../../src/export/models";

describe("HTML Localizer & Extraction Engine", () => {
  const sampleTarget: DeliverableExportTarget = {
    id: "101:201",
    course_id: "101",
    course_code: "CMPE-255",
    title: "Homework 2: Classification",
    due_at: "2026-09-24T23:59:00Z",
    points_possible: 100,
    deliverable_type: "assignment",
    html_url: "https://sjsu.instructure.com/courses/101/assignments/201",
  };

  describe("extractCanvasFileLinks", () => {
    it("extracts download links from anchor tags inside description HTML", () => {
      const html = `
        <p>Please download the dataset below:</p>
        <p><a href="https://sjsu.instructure.com/courses/101/files/5001/download?download_frd=1">Heart Disease Dataset</a></p>
        <p><a href="/courses/101/files/5002/download">Starter Code.py</a></p>
        <p><a href="https://external-site.com/resource.pdf">External Reference</a></p>
      `;

      const attachments = extractCanvasFileLinks(
        html,
        "https://sjsu.instructure.com",
      );
      expect(attachments).toHaveLength(2);
      expect(attachments[0]).toEqual({
        id: "5001",
        display_name: "Heart Disease Dataset",
        download_url:
          "https://sjsu.instructure.com/files/5001/download?download_frd=1",
      });
      expect(attachments[1]).toEqual({
        id: "5002",
        display_name: "Starter Code.py",
        download_url:
          "https://sjsu.instructure.com/files/5002/download?download_frd=1",
      });
    });

    it("deduplicates multiple links pointing to the same file ID", () => {
      const html = `
        <p><a href="/courses/101/files/5001/download">Link 1</a></p>
        <p><a href="/courses/101/files/5001/download">Link 2</a></p>
      `;

      const attachments = extractCanvasFileLinks(
        html,
        "https://sjsu.instructure.com",
      );
      expect(attachments).toHaveLength(1);
      expect(attachments[0]?.id).toBe("5001");
    });
  });

  describe("extractEmbeddedImages", () => {
    it("extracts Canvas-hosted images and assigns deterministic local filenames", () => {
      const html = `
        <p>Refer to this diagram:</p>
        <img src="https://sjsu.instructure.com/courses/101/files/6001/preview" alt="Model Diagram" />
        <img src="/courses/101/files/6002/download" alt="Architecture" />
        <img src="https://external-cdn.com/logo.png" alt="External Logo" />
      `;

      const images = extractEmbeddedImages(
        html,
        "https://sjsu.instructure.com",
      );
      expect(images).toHaveLength(2);
      expect(images[0]).toEqual({
        original_url:
          "https://sjsu.instructure.com/courses/101/files/6001/preview",
        local_filename: "image_1.png",
      });
      expect(images[1]).toEqual({
        original_url:
          "https://sjsu.instructure.com/courses/101/files/6002/download",
        local_filename: "image_2.png",
      });
    });
  });

  describe("localizeAssignmentHtml", () => {
    it("rewrites embedded image sources to relative paths and embeds styling and metadata", () => {
      const rawHtml = `
        <h3>Assignment Overview</h3>
        <p>Review the diagram below:</p>
        <img src="https://sjsu.instructure.com/courses/101/files/6001/preview" alt="Diagram" />
      `;

      const attachments: AttachmentResource[] = [
        {
          id: "5001",
          display_name: "dataset.csv",
          download_url:
            "https://sjsu.instructure.com/courses/101/files/5001/download",
        },
      ];

      const embeddedImages: EmbeddedImageResource[] = [
        {
          original_url:
            "https://sjsu.instructure.com/courses/101/files/6001/preview",
          local_filename: "image_1.png",
        },
      ];

      const result = localizeAssignmentHtml({
        target: sampleTarget,
        rawHtml,
        attachments,
        embeddedImages,
      });

      // Rewritten relative image link
      expect(result).toContain('src="attachments/images/image_1.png"');
      // Original remote URL should not remain in the img src
      expect(result).not.toContain(
        'src="https://sjsu.instructure.com/courses/101/files/6001/preview"',
      );
      // Metadata included
      expect(result).toContain("CMPE-255");
      expect(result).toContain("Homework 2: Classification");
      expect(result).toContain("100 Points");
      // Attachment listed
      expect(result).toContain("dataset.csv");
      // Self-contained document wrapper
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<style>");
    });
  });
});
