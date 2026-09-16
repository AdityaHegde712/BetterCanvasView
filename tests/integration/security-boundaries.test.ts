/**
 * @fileoverview Verifies mutable integration boundaries for untrusted Canvas data.
 */

import { describe, expect, it } from "vitest";

import { getTrustedCanvasUrl } from "../../src/security/canvas-links";

describe("Canvas security boundaries", () => {
  it("rejects the trusted hostname when it uses a nonstandard origin port", () => {
    expect(
      getTrustedCanvasUrl(
        "https://sjsu.instructure.com:444/courses/101/assignments/201",
      ),
    ).toBeNull();
  });
});
