/**
 * @fileoverview Classifies Canvas due dates into Pacific-time agenda buckets.
 */

export type AgendaBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "days_2_7"
  | "days_8_14"
  | "day_15_plus"
  | "undated";

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

const PACIFIC_TIME_ZONE = "America/Los_Angeles";

const pacificDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
});

/**
 * Parses a date while rejecting invalid input with a useful error.
 *
 * @param value - Date value provided by Canvas or the caller.
 * @param label - Field name used in any validation error.
 * @returns A valid Date instance.
 * @throws {TypeError} If the supplied value is not a valid date.
 */
function parseValidDate(value: unknown, label: string): Date {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new TypeError(`${label} must be a valid date.`);
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${label} must be a valid date.`);
  }

  return date;
}

/**
 * Extracts the calendar date for an instant in Pacific time.
 *
 * @param date - Valid instant to convert.
 * @returns Pacific calendar date components.
 */
function getPacificCalendarDate(date: Date): CalendarDate {
  const parts = pacificDateFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    day: values.day ?? 0,
    month: values.month ?? 0,
    year: values.year ?? 0,
  };
}

/**
 * Calculates the number of calendar days between two Pacific dates.
 *
 * @param dueDate - Calendar date of the due instant.
 * @param currentDate - Calendar date of the current instant.
 * @returns Signed difference in calendar days.
 */
function getCalendarDayDifference(
  dueDate: CalendarDate,
  currentDate: CalendarDate,
): number {
  const dueDay = Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day);
  const currentDay = Date.UTC(
    currentDate.year,
    currentDate.month - 1,
    currentDate.day,
  );

  return (dueDay - currentDay) / 86_400_000;
}

/**
 * Classifies a Canvas due date using America/Los_Angeles calendar days.
 *
 * @param dueAt - Canvas due-date timestamp, or null when no due date exists.
 * @param now - Reference instant used to determine the active bucket.
 * @returns Exclusive agenda bucket for the due date.
 * @throws {TypeError} If dueAt or now is an invalid date.
 */
export function classifyDueAt(
  dueAt: string | null,
  now: Date = new Date(),
): AgendaBucket {
  if (dueAt === null) {
    return "undated";
  }

  const dueDate = parseValidDate(dueAt, "dueAt");
  const currentDate = parseValidDate(now, "now");
  const dayDifference = getCalendarDayDifference(
    getPacificCalendarDate(dueDate),
    getPacificCalendarDate(currentDate),
  );

  if (dayDifference < 0 || (dayDifference === 0 && dueDate < currentDate)) {
    return "overdue";
  }

  if (dayDifference === 0) {
    return "today";
  }

  if (dayDifference === 1) {
    return "tomorrow";
  }

  if (dayDifference <= 7) {
    return "days_2_7";
  }

  if (dayDifference <= 14) {
    return "days_8_14";
  }

  return "day_15_plus";
}
