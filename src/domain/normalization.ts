/**
 * @fileoverview Normalizes minimally shaped Canvas API objects into domain records.
 */

import type {
  AgendaItemRecord,
  AgendaItemType,
  AnnouncementRecord,
  CourseEnrollmentType,
  CourseRecord,
  IsaAssignmentRecord,
} from "./models";
import { isSubmissionComplete } from "./submissions";
import { getTrustedCanvasUrl } from "../security/canvas-links";

type CanvasObject = Record<string, unknown>;

/**
 * Checks whether a value is a non-null Canvas-shaped object.
 *
 * @param value - Unknown value to inspect.
 * @returns Whether the value can contain Canvas object properties.
 */
function isCanvasObject(value: unknown): value is CanvasObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Determines enrollment type based on Canvas course enrollments array.
 *
 * @param course - Canvas course object.
 * @returns CourseEnrollmentType or undefined if enrollments is absent.
 */
function getCourseEnrollmentType(
  course: CanvasObject,
): CourseEnrollmentType | undefined {
  if (!Array.isArray(course.enrollments)) {
    return undefined;
  }

  const hasTaEnrollment = course.enrollments.some(
    (enrollment) =>
      isCanvasObject(enrollment) &&
      (enrollment.type === "ta" ||
        enrollment.role === "TaEnrollment" ||
        enrollment.type === "teacher"),
  );

  if (hasTaEnrollment) {
    return "ta";
  }

  const hasStudentEnrollment = course.enrollments.some(
    (enrollment) =>
      isCanvasObject(enrollment) &&
      (enrollment.type === "student" ||
        enrollment.role === "StudentEnrollment"),
  );

  if (hasStudentEnrollment) {
    return "student";
  }

  return undefined;
}

/**
 * Converts a Canvas identifier to its stable string representation.
 *
 * @param value - Canvas identifier value.
 * @param label - Field name used in a validation error.
 * @returns Non-empty stable identifier.
 * @throws {TypeError} If the identifier is missing or unsupported.
 */
function normalizeIdentifier(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  throw new TypeError(`${label} must be a non-empty string or finite number.`);
}

/**
 * Reads a string property from an unknown Canvas object.
 *
 * @param object - Canvas object containing the property.
 * @param key - Property name to read.
 * @returns Property value or an empty string when absent.
 */
function getString(object: CanvasObject, key: string): string {
  const value = object[key];

  return typeof value === "string" ? value : "";
}

/**
 * Reads a nullable Canvas timestamp, excluding malformed date strings.
 *
 * @param object - Canvas object containing the timestamp.
 * @param key - Timestamp property name.
 * @returns Parseable timestamp string or null.
 */
function getNullableString(object: CanvasObject, key: string): string | null {
  const value = object[key];

  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

/**
 * Checks whether submission types include a Canvas type marker.
 *
 * @param submissionTypes - Unknown Canvas submission_types value.
 * @param type - Marker to find.
 * @returns Whether the type marker is present.
 */
function hasSubmissionType(submissionTypes: unknown, type: string): boolean {
  return (
    Array.isArray(submissionTypes) &&
    submissionTypes.some((submissionType) => submissionType === type)
  );
}

/**
 * Determines the normalized item type for a Canvas assignment.
 *
 * @param assignment - Canvas assignment to classify.
 * @returns Matching agenda item type.
 */
function getAssignmentType(assignment: CanvasObject): AgendaItemType {
  const isQuiz =
    assignment.is_quiz_assignment === true ||
    assignment.is_quiz_lti_assignment === true ||
    (assignment.quiz_id !== null && assignment.quiz_id !== undefined);

  if (isQuiz) {
    return "quiz";
  }

  const isExternalTool =
    isCanvasObject(assignment.external_tool_tag_attributes) ||
    hasSubmissionType(assignment.submission_types, "external_tool");

  return isExternalTool ? "external_tool" : "assignment";
}

/**
 * Normalizes a Canvas course into its persisted domain representation.
 *
 * @param course - Unknown Canvas course payload.
 * @returns Normalized course record.
 * @throws {TypeError} If course does not provide a usable identifier.
 */
export function normalizeCourse(course: unknown): CourseRecord {
  if (!isCanvasObject(course)) {
    throw new TypeError("course must be a Canvas-shaped object.");
  }

  const courseId = normalizeIdentifier(course.id, "course.id");
  const enrollmentType = getCourseEnrollmentType(course);

  return {
    course_code: getString(course, "course_code"),
    course_id: courseId,
    html_url: getTrustedCanvasUrl(course.html_url),
    id: `${courseId}:${courseId}`,
    name: getString(course, "name"),
    object_id: courseId,
    ...(enrollmentType !== undefined
      ? { enrollment_type: enrollmentType }
      : {}),
  };
}

/**
 * Normalizes a Canvas assignment unless it represents a discussion topic.
 *
 * @param course - Unknown Canvas course payload.
 * @param assignment - Unknown Canvas assignment payload.
 * @returns Normalized agenda item or null for discussion topics.
 * @throws {TypeError} If required identifiers are missing.
 */
export function normalizeAssignment(
  course: unknown,
  assignment: unknown,
): AgendaItemRecord | null {
  if (!isCanvasObject(course)) {
    throw new TypeError("course must be a Canvas-shaped object.");
  }

  if (!isCanvasObject(assignment)) {
    throw new TypeError("assignment must be a Canvas-shaped object.");
  }

  if (
    hasSubmissionType(assignment.submission_types, "discussion_topic") &&
    (assignment.due_at === null || assignment.due_at === undefined)
  ) {
    return null;
  }

  const courseId = normalizeIdentifier(course.id, "course.id");
  const assignmentId = normalizeIdentifier(assignment.id, "assignment.id");
  const pointsPossible = assignment.points_possible;

  return {
    course_id: courseId,
    due_at: getNullableString(assignment, "due_at"),
    html_url: getTrustedCanvasUrl(assignment.html_url),
    id: `${courseId}:${assignmentId}`,
    is_complete: isSubmissionComplete(assignment.submission),
    item_type: getAssignmentType(assignment),
    object_id: assignmentId,
    points_possible:
      typeof pointsPossible === "number" && Number.isFinite(pointsPossible)
        ? pointsPossible
        : null,
    title: getString(assignment, "name"),
  };
}

/**
 * Normalizes a Canvas announcement into its persisted domain representation.
 *
 * @param course - Unknown Canvas course payload.
 * @param announcement - Unknown Canvas announcement payload.
 * @returns Normalized announcement record.
 * @throws {TypeError} If required identifiers are missing.
 */
export function normalizeAnnouncement(
  course: unknown,
  announcement: unknown,
): AnnouncementRecord {
  if (!isCanvasObject(course)) {
    throw new TypeError("course must be a Canvas-shaped object.");
  }

  if (!isCanvasObject(announcement)) {
    throw new TypeError("announcement must be a Canvas-shaped object.");
  }

  const courseId = normalizeIdentifier(course.id, "course.id");
  const announcementId = normalizeIdentifier(
    announcement.id,
    "announcement.id",
  );

  return {
    course_id: courseId,
    html_url: getTrustedCanvasUrl(announcement.html_url),
    id: `${courseId}:${announcementId}`,
    message: getString(announcement, "message"),
    object_id: announcementId,
    posted_at: getNullableString(announcement, "posted_at"),
    title: getString(announcement, "title"),
  };
}

/**
 * Normalizes a Canvas assignment for an ISA course.
 *
 * @param course - Unknown Canvas course payload.
 * @param assignment - Unknown Canvas assignment payload.
 * @returns Normalized ISA assignment record.
 * @throws {TypeError} If required identifiers are missing.
 */
export function normalizeIsaAssignment(
  course: unknown,
  assignment: unknown,
): IsaAssignmentRecord {
  if (!isCanvasObject(course)) {
    throw new TypeError("course must be a Canvas-shaped object.");
  }

  if (!isCanvasObject(assignment)) {
    throw new TypeError("assignment must be a Canvas-shaped object.");
  }

  const courseId = normalizeIdentifier(course.id, "course.id");
  const assignmentId = normalizeIdentifier(assignment.id, "assignment.id");
  const title = getString(assignment, "name") || getString(assignment, "title");
  const needsGradingCount =
    typeof assignment.needs_grading_count === "number" &&
    Number.isFinite(assignment.needs_grading_count) &&
    assignment.needs_grading_count >= 0
      ? assignment.needs_grading_count
      : 0;
  const pointsPossible =
    typeof assignment.points_possible === "number" &&
    Number.isFinite(assignment.points_possible)
      ? assignment.points_possible
      : null;

  const rawHtmlUrl = getString(assignment, "html_url");
  const trustedHtmlUrl = getTrustedCanvasUrl(rawHtmlUrl);
  const speedgraderRawUrl = `https://sjsu.instructure.com/courses/${courseId}/gradebook/speed_grader?assignment_id=${assignmentId}`;
  const speedgraderUrl = getTrustedCanvasUrl(speedgraderRawUrl);

  return {
    course_id: courseId,
    due_at: getNullableString(assignment, "due_at"),
    html_url: trustedHtmlUrl,
    id: `${courseId}:${assignmentId}`,
    needs_grading_count: needsGradingCount,
    object_id: assignmentId,
    points_possible: pointsPossible,
    speedgrader_url: speedgraderUrl,
    title,
  };
}
