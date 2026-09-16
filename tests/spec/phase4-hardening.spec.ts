/**
 * @fileoverview Locks Phase 4 release-hardening behavior.
 */

import { describe, expect, it } from "vitest";

import { CanvasClientError, CanvasHttpClient } from "../../src/canvas/client";
import {
  selectAnnouncementsByCourse,
  selectHiddenAnnouncements,
  selectVisibleAgendaItems,
} from "../../src/dashboard/selectors";
import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CoursePreference,
  CourseRecord,
  ItemState,
} from "../../src/domain/models";
import {
  normalizeAnnouncement,
  normalizeAssignment,
} from "../../src/domain/normalization";

const COURSE: CourseRecord = {
  course_code: "CMPE 295A",
  course_id: "101",
  html_url: "https://sjsu.instructure.com/courses/101",
  id: "101:101",
  name: "Master Project I",
  object_id: "101",
};
const PREFERENCES: CoursePreference[] = [{ enabled: true, id: COURSE.id }];
const COLLIDING_ID = "101:401";
const COLLIDING_IDS = new Set([COLLIDING_ID]);

describe("Phase 4 release hardening", () => {
  it("settles a never-ending Canvas request with a privacy-safe network error", async () => {
    const client = new CanvasHttpClient({
      fetch_fn: async () => new Promise<Response>(() => undefined),
      request_timeout_ms: 10,
    });
    const outcome = client
      .get("/api/v1/courses")
      .then(() => "unexpected_success")
      .catch((error: unknown) =>
        error instanceof CanvasClientError ? error.code : "unexpected_error",
      );

    await expect(
      Promise.race([
        outcome,
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("request_hung"), 100);
        }),
      ]),
    ).resolves.toBe("network_error");
  });

  it("isolates hidden state when agenda and announcement IDs collide", () => {
    const agendaItem: AgendaItemRecord = {
      course_id: COURSE.course_id,
      due_at: "2026-08-25T18:00:00.000Z",
      html_url: null,
      id: COLLIDING_ID,
      is_complete: false,
      item_type: "assignment",
      object_id: "401",
      points_possible: 10,
      title: "Project checkpoint",
    };
    const announcement: AnnouncementRecord = {
      course_id: COURSE.course_id,
      html_url: null,
      id: COLLIDING_ID,
      message: "<p>Checkpoint details</p>",
      object_id: "401",
      posted_at: "2026-08-24T12:00:00.000Z",
      title: "Project announcement",
    };
    const states: ItemState[] = [
      { hidden: false, id: `agenda:${COLLIDING_ID}`, note: "outline" },
      { hidden: true, id: `announcement:${COLLIDING_ID}`, note: "" },
    ];

    expect(
      selectVisibleAgendaItems(
        [agendaItem],
        PREFERENCES,
        states,
        { course_ids: [], title_query: "" },
        COLLIDING_IDS,
      ).map(({ id }) => id),
    ).toEqual([COLLIDING_ID]);
    expect(
      selectAnnouncementsByCourse(
        [COURSE],
        PREFERENCES,
        [announcement],
        states,
        new Date("2026-08-24T12:00:00.000Z"),
        COLLIDING_IDS,
      ),
    ).toEqual([]);
    expect(
      selectHiddenAnnouncements(
        [COURSE],
        PREFERENCES,
        [announcement],
        states,
        new Date("2026-08-24T12:00:00.000Z"),
        COLLIDING_IDS,
      ).map(({ id }) => id),
    ).toEqual([COLLIDING_ID]);
  });

  it("normalizes malformed optional Canvas timestamps to null", () => {
    expect(
      normalizeAssignment(
        { id: 101 },
        {
          due_at: "not-a-date",
          id: 401,
          name: "Project checkpoint",
          submission: { workflow_state: "unsubmitted" },
        },
      ),
    ).toMatchObject({ due_at: null });
    expect(
      normalizeAnnouncement(
        { id: 101 },
        {
          id: 401,
          message: "Details",
          posted_at: "not-a-date",
          title: "Project announcement",
        },
      ),
    ).toMatchObject({ posted_at: null });
  });
});
