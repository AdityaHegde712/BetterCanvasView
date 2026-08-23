import { describe, expect, it } from "vitest";

import { classifyDueAt, type AgendaBucket } from "../../src/domain/agenda";

describe("classifyDueAt", () => {
  const now = new Date("2026-02-18T20:30:00.000Z"); // 12:30 PM America/Los_Angeles

  it.each<[string, AgendaBucket]>([
    ["2026-02-18T20:30:00.000Z", "today"],
    ["2026-02-18T19:00:00.000Z", "overdue"],
    ["2026-02-19T08:00:00.000Z", "tomorrow"],
    ["2026-02-20T08:00:00.000Z", "days_2_7"],
    ["2026-02-26T08:00:00.000Z", "days_8_14"],
    ["2026-03-05T08:00:00.000Z", "day_15_plus"],
  ])("assigns %s to the exclusive %s bucket", (dueAt, expected) => {
    expect(classifyDueAt(dueAt, now)).toBe(expected);
  });

  it("uses Pacific calendar days across the spring DST transition", () => {
    const beforeSpringForward = new Date("2026-03-08T09:30:00.000Z");
    const nextLocalMidnight = "2026-03-09T07:00:00.000Z";

    expect(classifyDueAt(nextLocalMidnight, beforeSpringForward)).toBe(
      "tomorrow",
    );
  });

  it("uses Pacific calendar days across the fall DST transition", () => {
    const beforeFallBack = new Date("2026-11-01T08:30:00.000Z");
    const nextLocalMidnight = "2026-11-02T08:00:00.000Z";

    expect(classifyDueAt(nextLocalMidnight, beforeFallBack)).toBe("tomorrow");
  });

  it("keeps missing due dates in the undated bucket", () => {
    expect(classifyDueAt(null, now)).toBe("undated");
  });
});
