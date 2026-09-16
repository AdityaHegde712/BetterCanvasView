import { describe, expect, it } from "vitest";

import { getTrustedCanvasUrl } from "../../src/security/canvas-links";

describe("getTrustedCanvasUrl", () => {
  it("accepts HTTPS links on the exact SJSU Canvas host", () => {
    expect(
      getTrustedCanvasUrl(
        "https://sjsu.instructure.com/courses/101/assignments/201",
      ),
    ).toBe("https://sjsu.instructure.com/courses/101/assignments/201");
  });

  it.each([
    "http://sjsu.instructure.com/courses/101",
    "https://sjsu.instructure.com.example.invalid/courses/101",
    "https://other.instructure.com/courses/101",
    "javascript:alert(1)",
    "/courses/101",
  ])("rejects untrusted link %s", (value) => {
    expect(getTrustedCanvasUrl(value)).toBeNull();
  });
});
