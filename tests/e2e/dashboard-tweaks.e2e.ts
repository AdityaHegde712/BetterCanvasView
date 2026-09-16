/**
 * @fileoverview Verifies final Phase 3 dashboard presentation refinements.
 */

import { expect, test } from "./extension-fixtures";

test.describe("Dashboard presentation tweaks", () => {
  test("shows the brand icon and omits every empty agenda category", async ({
    optionsPage,
  }) => {
    await expect(
      optionsPage.getByRole("img", { name: "Better Canvas View icon" }),
    ).toBeVisible();
    await expect(
      optionsPage.getByRole("heading", { name: "Overdue" }),
    ).toHaveCount(0);
    await expect(
      optionsPage.getByRole("heading", { name: "Today" }),
    ).toHaveCount(0);
    await expect(
      optionsPage.getByRole("heading", { name: "Tomorrow" }),
    ).toHaveCount(0);
  });

  test("dismisses the successful refresh alert automatically", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();

    const status = optionsPage.getByRole("status");
    await expect(status).toContainText("Refresh complete");
    await expect(status).toHaveCount(0, { timeout: 6_000 });
  });
});
