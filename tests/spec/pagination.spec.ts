import { describe, expect, it } from "vitest";

import { getNextPageUrl } from "../../src/canvas/pagination";

describe("getNextPageUrl", () => {
  it("returns the opaque URL associated with rel=next", () => {
    const linkHeader = [
      '<https://sjsu.instructure.com/api/v1/courses?page=2&per_page=100>; rel="next"',
      '<https://sjsu.instructure.com/api/v1/courses?page=8&per_page=100>; rel="last"',
    ].join(", ");

    expect(getNextPageUrl(linkHeader)).toBe(
      "https://sjsu.instructure.com/api/v1/courses?page=2&per_page=100",
    );
  });

  it("returns null when pagination has no next relation", () => {
    expect(
      getNextPageUrl(
        '<https://sjsu.instructure.com/api/v1/courses?page=1>; rel="current"',
      ),
    ).toBeNull();
    expect(getNextPageUrl(null)).toBeNull();
  });
});
