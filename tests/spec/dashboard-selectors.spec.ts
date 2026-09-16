/**
 * @fileoverview Defines frozen Phase 3 dashboard selector behavior.
 */

import { describe, expect, it } from "vitest";

import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CoursePreference,
  CourseRecord,
  ItemState,
  SyncMetadata,
} from "../../src/domain/models";
import {
  AGENDA_BUCKET_ORDER,
  selectAgendaBuckets,
  selectAnnouncementsByCourse,
  selectHiddenItems,
  selectVisibleAgendaItems,
  shouldShowStaleWarning,
} from "../../src/dashboard/selectors";

const NOW = new Date("2026-02-18T20:30:00.000Z");

const courses: CourseRecord[] = [
  {
    id: "101:101",
    course_id: "101",
    object_id: "101",
    name: "Software Design",
    course_code: "CMPE 100",
    html_url: "https://sjsu.instructure.com/courses/101",
  },
  {
    id: "102:102",
    course_id: "102",
    object_id: "102",
    name: "Networks",
    course_code: "CMPE 102",
    html_url: "https://sjsu.instructure.com/courses/102",
  },
];

const preferences: CoursePreference[] = [
  { id: "101:101", enabled: true },
  { id: "102:102", enabled: false },
];

function agendaItem(
  id: string,
  title: string,
  dueAt: string | null,
  options: Partial<AgendaItemRecord> = {},
): AgendaItemRecord {
  return {
    id,
    course_id: id.split(":")[0] ?? "",
    object_id: id.split(":")[1] ?? "",
    title,
    due_at: dueAt,
    points_possible: 10,
    item_type: "assignment",
    is_complete: false,
    html_url: null,
    ...options,
  };
}

describe("dashboard selectors", () => {
  it("includes only enabled, incomplete, non-hidden items in the active agenda and keeps hidden items separate", () => {
    const items = [
      agendaItem("101:201", "Active work", "2026-02-19T18:00:00.000Z"),
      agendaItem("101:202", "Hidden work", "2026-02-20T18:00:00.000Z"),
      agendaItem("101:203", "Completed work", "2026-02-20T18:00:00.000Z", {
        is_complete: true,
      }),
      agendaItem("102:204", "Disabled course work", "2026-02-20T18:00:00.000Z"),
    ];
    const itemStates: ItemState[] = [{ id: "101:202", hidden: true, note: "" }];

    expect(
      selectVisibleAgendaItems(items, preferences, itemStates, {
        course_ids: [],
        title_query: "",
      }),
    ).toEqual([expect.objectContaining({ id: "101:201" })]);
    expect(
      selectHiddenItems(items, preferences, itemStates, {
        course_ids: [],
        title_query: "",
      }),
    ).toEqual([expect.objectContaining({ id: "101:202" })]);
  });

  it("places every remaining item in one canonical Pacific-time bucket and orders dated work before undated work", () => {
    const items = [
      agendaItem("101:201", "Undated", null),
      agendaItem("101:202", "Later today", "2026-02-19T04:00:00.000Z"),
      agendaItem("101:203", "Earlier today", "2026-02-18T19:00:00.000Z"),
      agendaItem("101:204", "Tomorrow", "2026-02-19T08:00:00.000Z"),
      agendaItem("101:205", "Two days", "2026-02-20T08:00:00.000Z"),
      agendaItem("101:206", "Eight days", "2026-02-26T08:00:00.000Z"),
      agendaItem("101:207", "Fifteen days", "2026-03-05T08:00:00.000Z"),
      agendaItem("101:208", "Earlier overdue", "2026-02-17T18:00:00.000Z"),
    ];

    const buckets = selectAgendaBuckets(items, NOW);

    expect(AGENDA_BUCKET_ORDER).toEqual([
      "overdue",
      "today",
      "tomorrow",
      "days_2_7",
      "days_8_14",
      "day_15_plus",
      "undated",
    ]);
    expect(buckets.map((bucket) => bucket.id)).toEqual(AGENDA_BUCKET_ORDER);
    expect(
      buckets.flatMap((bucket) => bucket.items.map((item) => item.id)),
    ).toEqual([
      "101:208",
      "101:203",
      "101:202",
      "101:204",
      "101:205",
      "101:206",
      "101:207",
      "101:201",
    ]);
  });

  it("applies case-insensitive title search and inclusive multi-course filtering", () => {
    const items = [
      agendaItem("101:201", "Module exercise", "2026-02-20T18:00:00.000Z"),
      agendaItem("102:202", "Network exercise", "2026-02-20T18:00:00.000Z"),
      agendaItem("102:203", "Network quiz", "2026-02-20T18:00:00.000Z"),
    ];
    const enabledPreferences: CoursePreference[] = [
      { id: "101:101", enabled: true },
      { id: "102:102", enabled: true },
    ];

    expect(
      selectVisibleAgendaItems(items, enabledPreferences, [], {
        course_ids: ["101", "102"],
        title_query: "EXERCISE",
      }).map((item) => item.id),
    ).toEqual(["101:201", "102:202"]);
  });

  it("groups enabled-course announcements by course and sorts each group newest first", () => {
    const announcements: AnnouncementRecord[] = [
      {
        id: "101:401",
        course_id: "101",
        object_id: "401",
        title: "Older software update",
        message: "Older",
        posted_at: "2026-02-17T18:00:00.000Z",
        html_url: null,
      },
      {
        id: "101:402",
        course_id: "101",
        object_id: "402",
        title: "Newest software update",
        message: "Newest",
        posted_at: "2026-02-18T18:00:00.000Z",
        html_url: null,
      },
      {
        id: "102:403",
        course_id: "102",
        object_id: "403",
        title: "Hidden course update",
        message: "Disabled course",
        posted_at: "2026-02-19T18:00:00.000Z",
        html_url: null,
      },
    ];

    expect(
      selectAnnouncementsByCourse(courses, preferences, announcements),
    ).toEqual([
      {
        course: expect.objectContaining({ id: "101:101" }) as CourseRecord,
        announcements: [
          expect.objectContaining({ id: "101:402" }) as AnnouncementRecord,
          expect.objectContaining({ id: "101:401" }) as AnnouncementRecord,
        ],
      },
    ]);
  });

  it("marks dashboard data stale after a failed sync or more than two hours without a success", () => {
    const successfulMetadata: SyncMetadata = {
      id: "current",
      last_attempt_at: "2026-02-18T19:00:00.000Z",
      last_success_at: "2026-02-18T19:00:00.000Z",
      last_status: "success",
    };

    expect(shouldShowStaleWarning(successfulMetadata, NOW)).toBe(false);
    expect(
      shouldShowStaleWarning(
        { ...successfulMetadata, last_status: "network_error" },
        NOW,
      ),
    ).toBe(true);
    expect(
      shouldShowStaleWarning(
        {
          ...successfulMetadata,
          last_success_at: "2026-02-18T18:29:59.999Z",
        },
        NOW,
      ),
    ).toBe(true);
  });
});
