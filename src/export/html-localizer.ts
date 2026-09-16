/**
 * @fileoverview Parses assignment description HTML, extracts attachments and images,
 * and renders offline-styled self-contained HTML documents.
 */

import type {
  AttachmentResource,
  DeliverableExportTarget,
  EmbeddedImageResource,
} from "./models";

const DEFAULT_CANVAS_ORIGIN = "https://sjsu.instructure.com";

/**
 * Extracts Canvas file download links from an HTML description.
 */
export function extractCanvasFileLinks(
  html: string,
  canvasOrigin: string = DEFAULT_CANVAS_ORIGIN,
): AttachmentResource[] {
  if (!html || typeof html !== "string") {
    return [];
  }

  const attachments: AttachmentResource[] = [];
  const seenIds = new Set<string>();

  // Matches <a ... href="..." ...>Link Text</a>
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim() ?? "";
    const rawText = match[2]?.replace(/<[^>]+>/g, "").trim() ?? "";

    // Check for Canvas file path pattern: /files/(\d+)
    const fileIdMatch = rawHref.match(/\/files\/(\d+)(?:\/download|\?|$)/i);
    if (!fileIdMatch || !fileIdMatch[1]) {
      continue;
    }

    const fileId = fileIdMatch[1];
    if (seenIds.has(fileId)) {
      continue;
    }

    let absoluteUrl = rawHref;
    if (rawHref.startsWith("/")) {
      absoluteUrl = `${canvasOrigin}${rawHref}`;
    }

    // Verify it targets Canvas origin
    try {
      const url = new URL(absoluteUrl);
      if (url.origin !== canvasOrigin) {
        continue;
      }
    } catch {
      continue;
    }

    seenIds.add(fileId);
    attachments.push({
      id: fileId,
      display_name: rawText.length > 0 ? rawText : `file_${fileId}`,
      download_url: `${canvasOrigin}/files/${fileId}/download?download_frd=1`,
    });
  }

  return attachments;
}

/**
 * Extracts embedded image URLs pointing to Canvas files and generates local filenames.
 */
export function extractEmbeddedImages(
  html: string,
  canvasOrigin: string = DEFAULT_CANVAS_ORIGIN,
): EmbeddedImageResource[] {
  if (!html || typeof html !== "string") {
    return [];
  }

  const images: EmbeddedImageResource[] = [];
  const seenUrls = new Set<string>();

  // Matches <img ... src="..." ...>
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  let imageCounter = 1;

  while ((match = imgRegex.exec(html)) !== null) {
    const rawSrc = match[1]?.trim() ?? "";
    if (seenUrls.has(rawSrc)) {
      continue;
    }

    let absoluteUrl = rawSrc;
    if (rawSrc.startsWith("/")) {
      absoluteUrl = `${canvasOrigin}${rawSrc}`;
    }

    try {
      const url = new URL(absoluteUrl);
      if (url.origin !== canvasOrigin) {
        continue;
      }
    } catch {
      continue;
    }

    seenUrls.add(rawSrc);

    // Determine extension from URL path or fallback to .png
    let ext = "png";
    const pathExt = rawSrc.split(/[#?]/)[0]?.split(".").pop()?.toLowerCase();
    if (
      pathExt &&
      ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(pathExt)
    ) {
      ext = pathExt;
    }

    images.push({
      original_url: absoluteUrl,
      local_filename: `image_${imageCounter}.${ext}`,
    });

    imageCounter++;
  }

  return images;
}

interface LocalizeHtmlOptions {
  target: DeliverableExportTarget;
  rawHtml: string;
  attachments: readonly AttachmentResource[];
  embeddedImages: readonly EmbeddedImageResource[];
}

/**
 * Localizes assignment instructions HTML with rewritten image paths and standalone styling.
 */
export function localizeAssignmentHtml(options: LocalizeHtmlOptions): string {
  const { target, rawHtml, attachments, embeddedImages } = options;

  let rewrittenContent = rawHtml;

  for (const img of embeddedImages) {
    const escapedUrl = img.original_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const srcRegex = new RegExp(`src=["']${escapedUrl}["']`, "g");
    rewrittenContent = rewrittenContent.replace(
      srcRegex,
      `src="attachments/images/${img.local_filename}"`,
    );

    // Also replace pathname if original_url was relative in the source HTML
    try {
      const parsed = new URL(img.original_url);
      const relativePath = `${parsed.pathname}${parsed.search}`;
      const escapedRelative = relativePath.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const relativeSrcRegex = new RegExp(
        `src=["']${escapedRelative}["']`,
        "g",
      );
      rewrittenContent = rewrittenContent.replace(
        relativeSrcRegex,
        `src="attachments/images/${img.local_filename}"`,
      );
    } catch {
      // Ignored
    }
  }

  const dueDateFormatted = target.due_at
    ? new Date(target.due_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "No due date";

  const pointsText =
    target.points_possible !== null
      ? `${target.points_possible} Points`
      : "Ungraded";

  const attachmentsListHtml =
    attachments.length > 0
      ? `
    <section class="attachments-section">
      <h3>Attached Deliverables & Datasets</h3>
      <ul>
        ${attachments
          .map(
            (att) => `
          <li>
            <a href="attachments/${att.display_name}" download="${att.display_name}">
              📎 ${att.display_name}
            </a>
          </li>`,
          )
          .join("")}
      </ul>
    </section>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(target.course_code)} - ${escapeHtml(target.title)}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a1a;
      --card-bg: #f8f9fa;
      --border: #e9ecef;
      --primary: #4c6ef5;
      --dimmed: #6c757d;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121212;
        --text: #e0e0e0;
        --card-bg: #1e1e1e;
        --border: #2e2e2e;
        --primary: #748ffc;
        --dimmed: #909296;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background-color: var(--bg);
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 26px;
      margin: 0 0 12px 0;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 14px;
      color: var(--dimmed);
    }
    .content-body {
      margin-top: 24px;
      font-size: 15px;
    }
    .content-body img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 12px 0;
      border: 1px solid var(--border);
    }
    .attachments-section {
      margin-top: 36px;
      padding: 16px 20px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .attachments-section h3 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .attachments-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .attachments-section li {
      margin-bottom: 8px;
    }
    .attachments-section a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    .attachments-section a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <header>
    <div class="badge">${escapeHtml(target.course_code)}</div>
    <h1>${escapeHtml(target.title)}</h1>
    <div class="meta-row">
      <span>🕒 Due: ${escapeHtml(dueDateFormatted)}</span>
      <span>🎯 ${escapeHtml(pointsText)}</span>
      ${
        target.html_url
          ? `<span>🔗 <a href="${escapeHtml(target.html_url)}" target="_blank" rel="noopener">Canvas Link</a></span>`
          : ""
      }
    </div>
  </header>

  <main class="content-body">
    ${rewrittenContent}
  </main>

  ${attachmentsListHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
