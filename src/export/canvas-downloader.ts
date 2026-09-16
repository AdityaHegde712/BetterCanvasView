/**
 * @fileoverview Coordinates fetching deliverable details, streaming attachment binaries,
 * and downloading embedded images with resilient error tolerance and pacing.
 */

import {
  extractCanvasFileLinks,
  extractEmbeddedImages,
  localizeAssignmentHtml,
} from "./html-localizer";
import type {
  AttachmentResource,
  DeliverableExportTarget,
  DeliverableMaterial,
  ExportIssue,
  ExportProgressState,
} from "./models";

const DEFAULT_CANVAS_ORIGIN = "https://sjsu.instructure.com";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeFilename(name: string): string {
  return Array.from(name)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || /[/\\:*?"<>|]/.test(char)) {
        return "_";
      }
      return char;
    })
    .join("")
    .trim();
}

function getUniqueFilename(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) {
    existingNames.add(name);
    return name;
  }
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex !== -1 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex !== -1 ? name.slice(dotIndex) : "";

  let counter = 1;
  while (existingNames.has(`${base}_${counter}${ext}`)) {
    counter++;
  }
  const unique = `${base}_${counter}${ext}`;
  existingNames.add(unique);
  return unique;
}

/**
 * Parses the filename from a Content-Disposition header string.
 * Supports standard `filename="..."` and RFC 5987 `filename*=UTF-8''...` formats.
 */
export function parseContentDispositionFilename(
  header: string | null | undefined,
): string | null {
  if (!header) {
    return null;
  }

  // RFC 5987 format: filename*=UTF-8''filename.ext
  const rfc5987Match = header.match(
    /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i,
  );
  if (rfc5987Match?.[1]) {
    try {
      const decoded = decodeURIComponent(rfc5987Match[1].trim());
      const cleaned = sanitizeFilename(decoded.replace(/^["']|["']$/g, ""));
      if (cleaned) {
        return cleaned;
      }
    } catch {
      // Ignore decoding error and fallback
    }
  }

  // Standard format: filename="filename.ext" or filename=filename.ext
  const standardMatch = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  const matched = standardMatch?.[1] ?? standardMatch?.[2];
  if (matched) {
    let unquoted = matched.replace(/^["']|["']$/g, "").trim();
    try {
      unquoted = decodeURIComponent(unquoted);
    } catch {
      // Keep as-is if not urlencoded
    }
    const cleaned = sanitizeFilename(unquoted);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

export interface DeliverableFetchClient {
  get<T>(path: string): Promise<T>;
}

export interface DownloaderOptions {
  client: DeliverableFetchClient;
  fetchFn?: typeof fetch;
  canvasOrigin?: string;
  concurrency?: number;
}

export interface SingleDeliverableResult {
  material: DeliverableMaterial;
  downloadedFiles: Map<string, ArrayBuffer>;
  downloadedImages: Map<string, ArrayBuffer>;
  issues: ExportIssue[];
}

export class CanvasDeliverableDownloader {
  readonly #client: DeliverableFetchClient;
  readonly #fetchFn: typeof fetch;
  readonly #canvasOrigin: string;

  constructor(options: DownloaderOptions) {
    this.#client = options.client;
    this.#fetchFn =
      options.fetchFn ??
      ((input: RequestInfo | URL, init?: RequestInit) =>
        globalThis.fetch(input, init));
    this.#canvasOrigin = options.canvasOrigin ?? DEFAULT_CANVAS_ORIGIN;
  }

  /**
   * Fetches an individual deliverable's description and downloads all its attachments and images.
   */
  async downloadDeliverable(
    target: DeliverableExportTarget,
    options?: {
      onProgress?: (state: ExportProgressState) => void;
      signal?: AbortSignal;
    },
  ): Promise<SingleDeliverableResult> {
    const issues: ExportIssue[] = [];
    const downloadedFiles = new Map<string, ArrayBuffer>();
    const downloadedImages = new Map<string, ArrayBuffer>();

    options?.onProgress?.({
      active: true,
      stage: "fetching_details",
      current: 0,
      total: 1,
      message: `Fetching instructions for ${target.title}...`,
    });

    const objectId = target.id.includes(":")
      ? target.id.split(":")[1]
      : target.id;

    let apiPath = `/api/v1/courses/${target.course_id}/assignments/${objectId}`;
    if (target.deliverable_type === "quiz") {
      apiPath = `/api/v1/courses/${target.course_id}/quizzes/${objectId}`;
    } else if (target.deliverable_type === "discussion") {
      apiPath = `/api/v1/courses/${target.course_id}/discussion_topics/${objectId}`;
    }

    let rawDescription = "";
    const apiAttachments: AttachmentResource[] = [];

    try {
      const payload = await this.#client.get<Record<string, unknown>>(apiPath);
      rawDescription =
        typeof payload.description === "string"
          ? payload.description
          : typeof payload.message === "string"
            ? payload.message
            : "";

      const rawAttachments = payload.attachments;
      if (Array.isArray(rawAttachments)) {
        for (const item of rawAttachments) {
          if (isRecord(item) && typeof item.url === "string") {
            const itemId =
              typeof item.id === "string" || typeof item.id === "number"
                ? String(item.id)
                : undefined;

            const displayName =
              typeof item.display_name === "string"
                ? item.display_name
                : typeof item.filename === "string"
                  ? item.filename
                  : `file_${itemId ?? "unknown"}`;

            apiAttachments.push({
              id: itemId ?? displayName,
              display_name: displayName,
              download_url: item.url,
              size_bytes: typeof item.size === "number" ? item.size : null,
            });
          }
        }
      }
    } catch (err) {
      issues.push({
        deliverable_id: target.id,
        deliverable_title: target.title,
        resource_name: "Assignment Details",
        error_message: err instanceof Error ? err.message : String(err),
      });
    }

    // Combine attachments from API payload and description HTML
    const htmlAttachments = extractCanvasFileLinks(
      rawDescription,
      this.#canvasOrigin,
    );
    const combinedAttachments = this.#mergeAttachments(
      apiAttachments,
      htmlAttachments,
    );
    const embeddedImages = extractEmbeddedImages(
      rawDescription,
      this.#canvasOrigin,
    );

    // Download attachments and resolve authoritative filenames
    const resolvedAttachments: AttachmentResource[] = [];
    const usedFilenames = new Set<string>();
    let fileIdx = 0;

    for (const att of combinedAttachments) {
      fileIdx++;
      options?.onProgress?.({
        active: true,
        stage: "downloading_attachments",
        current: fileIdx,
        total: combinedAttachments.length + embeddedImages.length,
        message: `Downloading file ${att.display_name}...`,
      });

      let finalFilename = att.display_name;

      try {
        const response = await this.#fetchFn(att.download_url, {
          credentials: "include",
          signal: options?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const dispositionHeader = response.headers?.get("content-disposition");
        const serverFilename =
          parseContentDispositionFilename(dispositionHeader);
        if (serverFilename) {
          finalFilename = serverFilename;
        }

        finalFilename = getUniqueFilename(finalFilename, usedFilenames);

        const buffer = await response.arrayBuffer();
        downloadedFiles.set(finalFilename, buffer);

        resolvedAttachments.push({
          ...att,
          display_name: finalFilename,
        });
      } catch (err) {
        issues.push({
          deliverable_id: target.id,
          deliverable_title: target.title,
          resource_name: att.display_name,
          error_message: err instanceof Error ? err.message : String(err),
        });
        resolvedAttachments.push(att);
      }
    }

    // Download embedded images
    let imgIdx = 0;
    for (const img of embeddedImages) {
      imgIdx++;
      options?.onProgress?.({
        active: true,
        stage: "downloading_attachments",
        current: combinedAttachments.length + imgIdx,
        total: combinedAttachments.length + embeddedImages.length,
        message: `Downloading embedded image ${img.local_filename}...`,
      });

      try {
        const response = await this.#fetchFn(img.original_url, {
          credentials: "include",
          signal: options?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        downloadedImages.set(img.local_filename, buffer);
      } catch (err) {
        issues.push({
          deliverable_id: target.id,
          deliverable_title: target.title,
          resource_name: img.local_filename,
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Localize HTML with finalized attachment filenames and embedded image references
    const localizedHtml = localizeAssignmentHtml({
      target,
      rawHtml: rawDescription,
      attachments: resolvedAttachments,
      embeddedImages,
    });

    const material: DeliverableMaterial = {
      target,
      localized_html: localizedHtml,
      raw_description_html: rawDescription,
      attachments: resolvedAttachments,
      embedded_images: embeddedImages,
    };

    return {
      material,
      downloadedFiles,
      downloadedImages,
      issues,
    };
  }

  /**
   * Deduplicates attachments by ID or download URL.
   */
  #mergeAttachments(
    primary: readonly AttachmentResource[],
    secondary: readonly AttachmentResource[],
  ): AttachmentResource[] {
    const results: AttachmentResource[] = [...primary];
    const seenIds = new Set<string>(primary.map((a) => a.id));
    const seenUrls = new Set<string>(primary.map((a) => a.download_url));

    for (const item of secondary) {
      if (!seenIds.has(item.id) && !seenUrls.has(item.download_url)) {
        seenIds.add(item.id);
        seenUrls.add(item.download_url);
        results.push(item);
      }
    }

    return results;
  }
}
