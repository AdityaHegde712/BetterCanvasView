/**
 * @fileoverview Locks responsive dashboard header behavior at narrow widths.
 */

import { expect, test } from "./extension-fixtures";

test("keeps dashboard branding readable at a narrow desktop width", async ({
  optionsPage,
}) => {
  await optionsPage.setViewportSize({ width: 420, height: 900 });

  const title = optionsPage.getByRole("heading", {
    name: "Better Canvas View",
  });
  const icon = optionsPage.getByRole("img", {
    name: "Better Canvas View icon",
  });

  await expect(title).toBeVisible();
  await expect(icon).toBeVisible();
  await expect(
    optionsPage.getByRole("button", { name: "Refresh" }),
  ).toBeVisible();

  const titleLineCount = await title.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  });
  const iconBox = await icon.boundingBox();
  const hasHorizontalOverflow = await optionsPage.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(titleLineCount).toBe(1);
  expect(iconBox?.width).toBe(iconBox?.height);
  expect(hasHorizontalOverflow).toBe(false);
});
