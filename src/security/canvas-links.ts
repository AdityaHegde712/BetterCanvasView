/**
 * @fileoverview Validates links before they are opened in the Canvas extension.
 */

const TRUSTED_CANVAS_ORIGIN = "https://sjsu.instructure.com";

/**
 * Returns a Canvas URL only when it targets the exact trusted HTTPS origin.
 *
 * @param value - Unknown Canvas link supplied by a remote response.
 * @returns Canonical trusted URL, or null for invalid or untrusted links.
 */
export function getTrustedCanvasUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    const isTrustedCanvasUrl =
      url.origin === TRUSTED_CANVAS_ORIGIN &&
      url.username === "" &&
      url.password === "";

    return isTrustedCanvasUrl ? url.href : null;
  } catch {
    return null;
  }
}
