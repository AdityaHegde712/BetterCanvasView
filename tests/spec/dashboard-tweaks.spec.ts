/**
 * @fileoverview Locks final Phase 3 dashboard presentation refinements.
 */

import { describe, expect, it } from "vitest";

import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CoursePreference,
  CourseRecord,
  ItemState,
} from "../../src/domain/models";
import {
  selectAnnouncementsByCourse,
  selectHiddenAnnouncements,
  selectHiddenItems,
  selectNonEmptyAgendaBuckets,
} from "../../src/dashboard/selectors";

const NOW = new Date("2026-08-24T12:00:00.000Z");
const COURSE: CourseRecord = {
  course_code: "CMPE 295A",
  course_id: "101",
  html_url: "https://sjsu.instructure.com/courses/101",
  id: "101:101",
  name: "Master Project I",
  object_id: "101",
};
const PREFERENCES: CoursePreference[] = [{ id: COURSE.id, enabled: true }];

/** Creates one announcement with a deterministic stable key. */
function announcement(id: string, postedAt: string): AnnouncementRecord {
  return {
    course_id: COURSE.course_id,
    html_url: null,
    id: `${COURSE.course_id}:${id}`,
    message: `<p>Announcement ${id}</p>`,
    object_id: id,
    posted_at: postedAt,
    title: `Announcement ${id}`,
  };
}

/** Creates one incomplete agenda item for bucket-selection assertions. */
function agendaItem(id: string, dueAt: string | null): AgendaItemRecord {
  return {
    course_id: COURSE.course_id,
    due_at: dueAt,
    html_url: null,
    id: `${COURSE.course_id}:${id}`,
    is_complete: false,
    item_type: "assignment",
    object_id: id,
    points_possible: 10,
    title: `Assignment ${id}`,
  };
}

describe("dashboard presentation refinements", () => {
  it("shows only announcements posted within the inclusive one-year window", () => {
    const exactlyOneYearOld = announcement("401", "2025-08-24T12:00:00.000Z");
    const olderThanOneYear = announcement("402", "2025-08-24T11:59:59.999Z");
    const recent = announcement("403", "2026-08-23T12:00:00.000Z");

    const groups = selectAnnouncementsByCourse(
      [COURSE],
      PREFERENCES,
      [olderThanOneYear, exactlyOneYearOld, recent],
      [],
      NOW,
    );

    expect(groups[0]?.announcements.map(({ id }) => id)).toEqual([
      recent.id,
      exactlyOneYearOld.id,
    ]);
  });

  it("excludes old announcements from Hidden Items while retaining recent ones", () => {
    const oldAnnouncement = announcement("401", "2025-08-24T11:59:59.999Z");
    const recentAnnouncement = announcement("402", "2026-08-23T12:00:00.000Z");
    const itemStates: ItemState[] = [oldAnnouncement, recentAnnouncement].map(
      ({ id }) => ({ hidden: true, id, note: "" }),
    );

    expect(
      selectHiddenAnnouncements(
        [COURSE],
        PREFERENCES,
        [oldAnnouncement, recentAnnouncement],
        itemStates,
        NOW,
      ).map(({ id }) => id),
    ).toEqual([recentAnnouncement.id]);
  });

  it("returns only agenda buckets containing visible items", () => {
    const buckets = selectNonEmptyAgendaBuckets(
      [agendaItem("201", "2026-08-26T12:00:00.000Z")],
      NOW,
    );

    expect(buckets).toEqual([
      expect.objectContaining({
        id: "days_2_7",
        items: [expect.objectContaining({ id: "101:201" })],
      }),
    ]);
  });

  it("shows dated agenda work only within the inclusive one-year window", () => {
    const exactlyOneYearOld = agendaItem("201", "2025-08-24T12:00:00.000Z");
    const olderThanOneYear = agendaItem("202", "2025-08-24T11:59:59.999Z");
    const undated = agendaItem("203", null);

    const buckets = selectNonEmptyAgendaBuckets(
      [olderThanOneYear, exactlyOneYearOld, undated],
      NOW,
    );

    expect(buckets.flatMap(({ items }) => items.map(({ id }) => id))).toEqual([
      exactlyOneYearOld.id,
      undated.id,
    ]);
  });

  it("excludes old dated assignments from Hidden Items", () => {
    const oldAssignment = agendaItem("201", "2025-08-24T11:59:59.999Z");
    const recentAssignment = agendaItem("202", "2026-08-23T12:00:00.000Z");
    const itemStates: ItemState[] = [oldAssignment, recentAssignment].map(
      ({ id }) => ({ hidden: true, id, note: "" }),
    );

    expect(
      selectHiddenItems(
        [oldAssignment, recentAssignment],
        PREFERENCES,
        itemStates,
        undefined,
        undefined,
        NOW,
      ).map(({ id }) => id),
    ).toEqual([recentAssignment.id]);
  });
});
