/**
 * @fileoverview Converts untrusted Canvas announcement HTML into safe plain text.
 */

const REMOVED_HTML_ELEMENTS = "script, style, template, noscript";
const DEFAULT_MAX_LENGTH = 280;
const ELLIPSIS = "...";

/**
 * Truncates text at a word boundary while reserving space for an ellipsis.
 *
 * @param text - Normalized plain text to truncate.
 * @param maxLength - Maximum returned character count.
 * @returns Original text or a word-boundary-truncated plain-text string.
 */
function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const candidate = text.slice(0, maxLength);
  const boundaryIndex = candidate.lastIndexOf(" ");
  const truncatedText =
    boundaryIndex > 0
      ? candidate.slice(0, boundaryIndex)
      : text.slice(0, maxLength - ELLIPSIS.length);

  return `${truncatedText}${ELLIPSIS}`;
}

/**
 * Converts Canvas announcement HTML into bounded, normalized visible text.
 *
 * @param html - Untrusted Canvas announcement HTML.
 * @param maxLength - Maximum number of text characters to return.
 * @returns Safe plain text with no HTML markup.
 * @throws {TypeError} If html is not a string.
 * @throws {RangeError} If maxLength cannot accommodate a safe ellipsis.
 */
export function announcementHtmlToText(
  html: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  if (typeof html !== "string") {
    throw new TypeError("html must be a string.");
  }

  if (!Number.isInteger(maxLength) || maxLength <= ELLIPSIS.length) {
    throw new RangeError("maxLength must be an integer greater than 3.");
  }

  const document = new DOMParser().parseFromString(html, "text/html");

  for (const element of document.querySelectorAll(REMOVED_HTML_ELEMENTS)) {
    element.remove();
  }

  const visibleText = Array.from(document.body.childNodes)
    .map((node) => node.textContent ?? "")
    .join(" ");
  const normalizedText = visibleText.replace(/\s+/gu, " ").trim();

  return truncateAtWordBoundary(normalizedText, maxLength);
}
