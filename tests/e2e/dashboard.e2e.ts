/**
 * @fileoverview End-to-end browser tests for Better Canvas View dashboard workflows.
 */

import { expect, test } from "./extension-fixtures";

test.describe("Extension Dashboard E2E", () => {
  test("opens the Options dashboard and renders all primary navigation sections", async ({
    optionsPage,
  }) => {
    await expect(
      optionsPage.getByRole("heading", { name: "Better Canvas View" }),
    ).toBeVisible();

    await expect(
      optionsPage.getByRole("tab", { name: "Agenda" }),
    ).toBeVisible();
    await expect(
      optionsPage.getByRole("tab", { name: "Announcements" }),
    ).toBeVisible();
    await expect(
      optionsPage.getByRole("tab", { name: "Hidden Items" }),
    ).toBeVisible();
    await expect(
      optionsPage.getByRole("tab", { name: "Settings" }),
    ).toBeVisible();
  });

  test("refreshes data from Canvas and displays agenda items", async ({
    optionsPage,
  }) => {
    const refreshButton = optionsPage.getByRole("button", { name: "Refresh" });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    await expect(optionsPage.getByRole("status")).toHaveText(
      /Refresh complete/i,
      { timeout: 10_000 },
    );

    await expect(optionsPage.getByText("Module exercise")).toBeVisible();
    await expect(optionsPage.getByText("Network exercise")).toBeVisible();
  });

  test("filters agenda items by search title and course selection", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();
    await expect(optionsPage.getByText("Module exercise")).toBeVisible();

    const searchInput = optionsPage.getByRole("searchbox", {
      name: "Search agenda",
    });
    await searchInput.fill("Module");
    await expect(optionsPage.getByText("Module exercise")).toBeVisible();
    await expect(optionsPage.getByText("Network exercise")).not.toBeVisible();

    await searchInput.clear();
    await expect(optionsPage.getByText("Network exercise")).toBeVisible();

    const softwareCheckbox = optionsPage.getByRole("checkbox", {
      name: "Software Design",
    });
    await softwareCheckbox.click();
    await expect(optionsPage.getByText("Module exercise")).not.toBeVisible();
    await expect(optionsPage.getByText("Network exercise")).toBeVisible();
  });

  test("saves notes on an assignment and persists across page reload", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();
    await expect(optionsPage.getByText("Module exercise")).toBeVisible();

    const noteInput = optionsPage.getByRole("textbox", {
      name: "Note for Module exercise",
    });
    await noteInput.fill("Review chapter 3 before starting.");

    await optionsPage.getByRole("button", { name: "Save" }).click();

    await optionsPage.reload();
    await expect(
      optionsPage.getByRole("textbox", { name: "Note for Module exercise" }),
    ).toHaveValue("Review chapter 3 before starting.");
  });

  test("hides an item from Agenda, shows in Hidden Items, and restores it", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();
    const agendaPanel = optionsPage.getByRole("tabpanel", { name: "Agenda" });
    const hiddenPanel = optionsPage.getByRole("tabpanel", {
      name: "Hidden Items",
    });

    await expect(agendaPanel.getByText("Module exercise")).toBeVisible();

    const hideCheckbox = agendaPanel.getByRole("checkbox", {
      name: "Hide Module exercise",
    });
    await hideCheckbox.click();

    await expect(agendaPanel.getByText("Module exercise")).not.toBeVisible();

    await optionsPage.getByRole("tab", { name: "Hidden Items" }).click();
    await expect(
      hiddenPanel.getByText("Module exercise", { exact: true }),
    ).toBeVisible();

    const restoreButton = hiddenPanel.getByRole("button", {
      name: "Restore Module exercise",
    });
    await restoreButton.click();

    await expect(
      hiddenPanel.getByText("Module exercise", { exact: true }),
    ).not.toBeVisible();

    await optionsPage.getByRole("tab", { name: "Agenda" }).click();
    await expect(agendaPanel.getByText("Module exercise")).toBeVisible();
  });

  test("displays announcements grouped by course with inert script tags", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();

    await optionsPage.getByRole("tab", { name: "Announcements" }).click();

    const softwareGroup = optionsPage.getByRole("region", {
      name: "Software Design announcements",
    });
    await expect(softwareGroup).toBeVisible();
    await expect(softwareGroup.getByText("Project update")).toBeVisible();
    await expect(softwareGroup.getByText("Milestone posted.")).toBeVisible();
    await expect(
      softwareGroup.getByText("window.executed = true;"),
    ).not.toBeVisible();

    const networksGroup = optionsPage.getByRole("region", {
      name: "Computer Networks announcements",
    });
    await expect(networksGroup).toBeVisible();
    await expect(networksGroup.getByText("Network update")).toBeVisible();
    await expect(networksGroup.getByText("Read chapter four.")).toBeVisible();
  });

  test("hides an announcement, shows in Hidden Items, and restores it", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();

    await optionsPage.getByRole("tab", { name: "Announcements" }).click();
    const announcementsPanel = optionsPage.getByRole("tabpanel", {
      name: "Announcements",
    });
    const hiddenPanel = optionsPage.getByRole("tabpanel", {
      name: "Hidden Items",
    });

    await expect(announcementsPanel.getByText("Project update")).toBeVisible();

    const hideCheckbox = announcementsPanel.getByRole("checkbox", {
      name: "Hide Project update",
    });
    await hideCheckbox.click();

    await expect(
      announcementsPanel.getByText("Project update"),
    ).not.toBeVisible();

    await optionsPage.getByRole("tab", { name: "Hidden Items" }).click();
    await expect(
      hiddenPanel.getByText("Project update", { exact: true }),
    ).toBeVisible();

    const restoreButton = hiddenPanel.getByRole("button", {
      name: "Restore Project update",
    });
    await restoreButton.click();

    await expect(
      hiddenPanel.getByText("Project update", { exact: true }),
    ).not.toBeVisible();

    await optionsPage.getByRole("tab", { name: "Announcements" }).click();
    await expect(announcementsPanel.getByText("Project update")).toBeVisible();
  });

  test("toggles course active state in Settings", async ({ optionsPage }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();

    await optionsPage.getByRole("tab", { name: "Settings" }).click();

    const softwareToggle = optionsPage.getByRole("checkbox", {
      name: "Software Design",
    });
    await expect(softwareToggle).toBeChecked();
    await softwareToggle.click();
    await expect(softwareToggle).not.toBeChecked();

    await optionsPage.getByRole("tab", { name: "Agenda" }).click();
    await expect(optionsPage.getByText("Module exercise")).not.toBeVisible();
  });

  test("retains cached items with stale alert when refresh fails with auth_required", async ({
    optionsPage,
    setCanvasMock,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();
    await expect(optionsPage.getByText("Module exercise")).toBeVisible();

    setCanvasMock({ authError: true });

    await optionsPage.getByRole("button", { name: "Refresh" }).click();

    await expect(optionsPage.getByRole("alert")).toContainText(
      "Data may be stale",
      { timeout: 10_000 },
    );
    await expect(
      optionsPage.getByRole("link", { name: "Open Canvas to Sign In" }),
    ).toHaveAttribute("href", "https://sjsu.instructure.com/");

    // Cached data remains visible
    await expect(optionsPage.getByText("Module exercise")).toBeVisible();
  });

  test("requires confirmation dialog before Clear Data wipes local state", async ({
    optionsPage,
  }) => {
    await optionsPage.getByRole("button", { name: "Refresh" }).click();
    await expect(optionsPage.getByText("Module exercise")).toBeVisible();

    await optionsPage.getByRole("tab", { name: "Settings" }).click();

    const clearButton = optionsPage.getByRole("button", { name: "Clear Data" });
    await clearButton.click();

    const dialog = optionsPage.getByRole("dialog", {
      name: "Clear all data?",
    });
    await expect(dialog).toBeVisible();

    const confirmButton = optionsPage.getByRole("button", {
      name: "Confirm Clear Data",
    });
    await confirmButton.click();

    await expect(dialog).not.toBeVisible();

    await optionsPage.getByRole("tab", { name: "Agenda" }).click();
    await expect(optionsPage.getByText("Module exercise")).not.toBeVisible();
  });
});
