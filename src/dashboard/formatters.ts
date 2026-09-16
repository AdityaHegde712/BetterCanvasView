/**
 * @fileoverview Formats Canvas timestamps consistently in Pacific time.
 */

const PACIFIC_TIME_ZONE = "America/Los_Angeles";

const pacificDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: PACIFIC_TIME_ZONE,
  timeZoneName: "short",
  year: "numeric",
});

/** Parses and formats a nullable Canvas timestamp in Pacific time. */
export function formatPacificDateTime(value: string | null): string {
  if (value === null) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("value must be a valid Canvas timestamp.");
  }

  return pacificDateTimeFormatter.format(date);
}

/** Formats an agenda due timestamp with its user-facing prefix. */
export function formatPacificDueAt(dueAt: string | null): string {
  return dueAt === null ? "No due date" : `Due ${formatPacificDateTime(dueAt)}`;
}
