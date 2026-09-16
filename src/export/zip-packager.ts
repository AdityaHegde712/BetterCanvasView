/**
 * @fileoverview Packages localized deliverable materials into a structured ZIP archive
 * and triggers client-side browser downloads.
 */

import JSZip from "jszip";

import type { SingleDeliverableResult } from "./canvas-downloader";
import type { ExportIssue } from "./models";

/**
 * Sanitizes folder and file names to be safely extracted across Windows, macOS, and Linux.
 */
export function sanitizeDirectoryName(name: string): string {
  if (!name || typeof name !== "string") {
    return "untitled";
  }

  // Remove control characters and characters invalid in Windows/POSIX filenames: / \ : * ? " < > |
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/_+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compresses deliverable folders, instructions, attachments, and optional report into a ZIP blob.
 */
export async function createAssignmentsZip(
  deliverables: readonly SingleDeliverableResult[],
  issues: readonly ExportIssue[] = [],
): Promise<Blob> {
  const zip = new JSZip();

  for (const item of deliverables) {
    const { target, localized_html } = item.material;
    const folderName = `${sanitizeDirectoryName(target.course_code)}_${sanitizeDirectoryName(target.title)}`;

    // Store localized instructions
    zip.file(`${folderName}/instructions.html`, localized_html);

    // Store downloaded attachment files
    for (const [filename, buffer] of item.downloadedFiles.entries()) {
      const sanitizedFile = sanitizeDirectoryName(filename);
      zip.file(`${folderName}/attachments/${sanitizedFile}`, buffer);
    }

    // Store downloaded embedded images
    for (const [filename, buffer] of item.downloadedImages.entries()) {
      const sanitizedImage = sanitizeDirectoryName(filename);
      zip.file(`${folderName}/attachments/images/${sanitizedImage}`, buffer);
    }
  }

  // If any issues occurred during the export, write an export_report.txt at archive root
  if (issues.length > 0) {
    const reportLines = [
      "==================================================",
      "Better Canvas View - Deliverables Export Report",
      `Generated: ${new Date().toISOString()}`,
      "==================================================",
      "",
      "The following issues or skipped files were encountered during download:",
      "",
      ...issues.map(
        (issue, index) =>
          `${index + 1}. [${issue.deliverable_title}] File: "${issue.resource_name}" | Error: ${issue.error_message}`,
      ),
      "",
      "All other files and instructions were successfully packaged.",
    ];

    zip.file("export_report.txt", reportLines.join("\n"));
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Triggers a browser file download of the given blob without backend round-trips.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke object URL after slight delay to allow download initiation
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 2000);
}
