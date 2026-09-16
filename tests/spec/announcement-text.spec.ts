import { describe, expect, it } from "vitest";

import { announcementHtmlToText } from "../../src/security/announcement-text";

describe("announcementHtmlToText", () => {
  it("removes executable and non-visible content while decoding and normalizing visible text", () => {
    const html =
      "<style>.hidden { display: none; }</style><script>window.bad = true;</script><p>Hello&nbsp;team <strong> &amp; welcome</strong>.</p><template>Ignore me</template><p>Review the rubric.</p>";

    expect(announcementHtmlToText(html)).toBe(
      "Hello team & welcome. Review the rubric.",
    );
  });

  it("truncates safely without returning markup", () => {
    expect(announcementHtmlToText("<p>One two three four</p>", 10)).toBe(
      "One two...",
    );
  });
});
