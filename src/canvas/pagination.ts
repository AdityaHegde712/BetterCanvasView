/**
 * @fileoverview Extracts opaque continuation URLs from Canvas Link headers.
 */

/**
 * Returns the Canvas URL whose Link relation includes next.
 *
 * @param linkHeader - HTTP Link header returned by Canvas.
 * @returns Opaque next-page URL, or null when no next relation exists.
 */
export function getNextPageUrl(linkHeader: string | null): string | null {
  if (linkHeader === null || linkHeader.trim() === "") {
    return null;
  }

  const linkPattern = /<([^>]+)>\s*((?:;\s*[^,]*)*)/gu;

  for (const match of linkHeader.matchAll(linkPattern)) {
    const url = match[1];
    const parameters = match[2] ?? "";
    const relationMatch = /;\s*rel\s*=\s*(?:"([^"]*)"|([^;\s,]+))/iu.exec(
      parameters,
    );
    const relations = (relationMatch?.[1] ?? relationMatch?.[2] ?? "").split(
      /\s+/u,
    );

    if (relations.includes("next") && url !== undefined) {
      return url;
    }
  }

  return null;
}
