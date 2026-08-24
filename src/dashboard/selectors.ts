/**
 * @fileoverview Derives deterministic dashboard views from normalized records.
 */

import { classifyDueAt, type AgendaBucket } from "../domain/agenda";
import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CoursePreference,
  CourseRecord,
  ItemState,
  SyncMetadata,
} from "../domain/models";
import { announcementHtmlToText } from "../security/announcement-text";
import { getItemState } from "./item-state-keys";
import type { ItemStateRecordType } from "./item-state-keys";

export const AGENDA_BUCKET_ORDER: readonly AgendaBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "days_2_7",
  "days_8_14",
  "day_15_plus",
  "undated",
];

const STALE_AFTER_MS = 2 * 60 * 60 * 1_000;
const CONTENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1_000;
const NO_ITEM_STATE_COLLISIONS: ReadonlySet<string> = new Set();

const AGENDA_BUCKET_LABELS: Record<AgendaBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  days_2_7: "Days 2-7",
  days_8_14: "Days 8-14",
  day_15_plus: "Day 15+",
  undated: "Undated",
};

export interface AgendaFilters {
  course_ids: string[];
  title_query: string;
}

export interface AgendaBucketView {
  id: AgendaBucket;
  label: string;
  items: AgendaItemRecord[];
}

export interface DashboardAnnouncement extends AnnouncementRecord {
  excerpt: string;
}

export interface AnnouncementCourseGroup {
  course: CourseRecord;
  announcements: DashboardAnnouncement[];
}

/** Returns the normalized stable key used by course preferences. */
function getCourseRecordId(courseId: string): string {
  return `${courseId}:${courseId}`;
}

/** Creates a lookup for local item state without mutating source arrays. */
function indexItemStates(itemStates: ItemState[]): Map<string, ItemState> {
  return new Map(itemStates.map((state) => [state.id, state]));
}

/** Resolves state using typed keys only for IDs shared across record types. */
function getRecordState(
  statesById: ReadonlyMap<string, ItemState>,
  recordType: ItemStateRecordType,
  recordId: string,
  collidingItemIds: ReadonlySet<string>,
): ItemState | undefined {
  return getItemState(statesById, recordType, recordId, collidingItemIds);
}

/** Creates a set of enabled stable course keys. */
function getEnabledCourseIds(preferences: CoursePreference[]): Set<string> {
  return new Set(
    preferences
      .filter((preference) => preference.enabled)
      .map((preference) => preference.id),
  );
}

/** Applies enabled-course and transient title/course filters. */
function matchesAgendaFilters(
  item: AgendaItemRecord,
  enabledCourseIds: Set<string>,
  filters: AgendaFilters,
): boolean {
  const selectedCourses = new Set(filters.course_ids);
  const titleQuery = filters.title_query.trim().toLocaleLowerCase();

  return (
    enabledCourseIds.has(getCourseRecordId(item.course_id)) &&
    (selectedCourses.size === 0 || selectedCourses.has(item.course_id)) &&
    (titleQuery === "" || item.title.toLocaleLowerCase().includes(titleQuery))
  );
}

/** Selects active agenda items while excluding completed and hidden records. */
export function selectVisibleAgendaItems(
  items: AgendaItemRecord[],
  preferences: CoursePreference[],
  itemStates: ItemState[],
  filters: AgendaFilters,
  collidingItemIds: ReadonlySet<string> = NO_ITEM_STATE_COLLISIONS,
): AgendaItemRecord[] {
  const enabledCourseIds = getEnabledCourseIds(preferences);
  const statesById = indexItemStates(itemStates);

  return items.filter(
    (item) =>
      !item.is_complete &&
      getRecordState(statesById, "agenda", item.id, collidingItemIds)
        ?.hidden !== true &&
      matchesAgendaFilters(item, enabledCourseIds, filters),
  );
}

/** Selects hidden, incomplete items from enabled courses. */
export function selectHiddenItems(
  items: AgendaItemRecord[],
  preferences: CoursePreference[],
  itemStates: ItemState[],
  filters?: AgendaFilters,
  collidingItemIds: ReadonlySet<string> = NO_ITEM_STATE_COLLISIONS,
  now: Date = new Date(),
): AgendaItemRecord[] {
  const enabledCourseIds = getEnabledCourseIds(preferences);
  const statesById = indexItemStates(itemStates);

  return items.filter((item) => {
    if (
      item.is_complete ||
      !isRecentAgendaItem(item, now) ||
      getRecordState(statesById, "agenda", item.id, collidingItemIds)
        ?.hidden !== true
    ) {
      return false;
    }
    if (filters !== undefined) {
      return matchesAgendaFilters(item, enabledCourseIds, filters);
    }
    return enabledCourseIds.has(getCourseRecordId(item.course_id));
  });
}

/** Orders agenda records by due instant, then stable identifier. */
function compareAgendaItems(
  left: AgendaItemRecord,
  right: AgendaItemRecord,
): number {
  if (left.due_at === null && right.due_at === null) {
    return left.id.localeCompare(right.id);
  }
  if (left.due_at === null) {
    return 1;
  }
  if (right.due_at === null) {
    return -1;
  }

  const dueDifference =
    new Date(left.due_at).getTime() - new Date(right.due_at).getTime();
  return dueDifference === 0 ? left.id.localeCompare(right.id) : dueDifference;
}

/** Groups items into every canonical mutually exclusive Pacific-time bucket. */
export function selectAgendaBuckets(
  items: AgendaItemRecord[],
  now: Date,
): AgendaBucketView[] {
  const itemsByBucket = new Map<AgendaBucket, AgendaItemRecord[]>(
    AGENDA_BUCKET_ORDER.map((bucket) => [bucket, []]),
  );

  for (const item of items) {
    itemsByBucket.get(classifyDueAt(item.due_at, now))?.push(item);
  }

  return AGENDA_BUCKET_ORDER.map((id) => ({
    id,
    label: AGENDA_BUCKET_LABELS[id],
    items: [...(itemsByBucket.get(id) ?? [])].sort(compareAgendaItems),
  }));
}

/** Selects canonical agenda buckets that contain at least one item. */
export function selectNonEmptyAgendaBuckets(
  items: AgendaItemRecord[],
  now: Date,
): AgendaBucketView[] {
  return selectAgendaBuckets(
    items.filter((item) => isRecentAgendaItem(item, now)),
    now,
  ).filter((bucket) => bucket.items.length > 0);
}

/** Keeps due-dated agenda work within one year and preserves undated work. */
function isRecentAgendaItem(item: AgendaItemRecord, now: Date): boolean {
  if (item.due_at === null) {
    return true;
  }

  const dueAtTime = Date.parse(item.due_at);
  if (Number.isNaN(dueAtTime)) {
    return false;
  }

  return dueAtTime >= now.getTime() - CONTENT_MAX_AGE_MS;
}

/** Keeps announcements within one year, including those with unknown age. */
function isRecentAnnouncement(
  announcement: AnnouncementRecord,
  now: Date,
): boolean {
  if (announcement.posted_at === null) {
    return true;
  }

  const postedAtTime = Date.parse(announcement.posted_at);
  if (Number.isNaN(postedAtTime)) {
    return false;
  }

  return postedAtTime >= now.getTime() - CONTENT_MAX_AGE_MS;
}

/** Groups enabled-course announcements and orders each group newest first. */
export function selectAnnouncementsByCourse(
  courses: CourseRecord[],
  preferences: CoursePreference[],
  announcements: AnnouncementRecord[],
  itemStates: ItemState[] = [],
  now: Date = new Date(),
  collidingItemIds: ReadonlySet<string> = NO_ITEM_STATE_COLLISIONS,
): AnnouncementCourseGroup[] {
  const enabledCourseIds = getEnabledCourseIds(preferences);
  const statesById = indexItemStates(itemStates);

  return courses
    .filter((course) => enabledCourseIds.has(course.id))
    .sort((left, right) =>
      (left.course_code || left.name).localeCompare(
        right.course_code || right.name,
      ),
    )
    .map((course) => ({
      course,
      announcements: announcements
        .filter(
          (announcement) =>
            announcement.course_id === course.course_id &&
            getRecordState(
              statesById,
              "announcement",
              announcement.id,
              collidingItemIds,
            )?.hidden !== true &&
            isRecentAnnouncement(announcement, now),
        )
        .map((announcement) => ({
          ...announcement,
          excerpt: announcementHtmlToText(announcement.message),
        }))
        .sort((left, right) => {
          const leftTime =
            left.posted_at === null
              ? Number.NEGATIVE_INFINITY
              : Date.parse(left.posted_at);
          const rightTime =
            right.posted_at === null
              ? Number.NEGATIVE_INFINITY
              : Date.parse(right.posted_at);
          return rightTime - leftTime || left.id.localeCompare(right.id);
        }),
    }))
    .filter((group) => group.announcements.length > 0);
}

export interface HiddenAnnouncementView extends DashboardAnnouncement {
  courseName: string;
}

/** Selects hidden announcements from enabled courses. */
export function selectHiddenAnnouncements(
  courses: CourseRecord[],
  preferences: CoursePreference[],
  announcements: AnnouncementRecord[],
  itemStates: ItemState[],
  now: Date = new Date(),
  collidingItemIds: ReadonlySet<string> = NO_ITEM_STATE_COLLISIONS,
): HiddenAnnouncementView[] {
  const enabledCourseIds = getEnabledCourseIds(preferences);
  const statesById = indexItemStates(itemStates);
  const courseNameById = new Map(
    courses.map((course) => [course.course_id, course.name]),
  );

  return announcements
    .filter(
      (announcement) =>
        enabledCourseIds.has(getCourseRecordId(announcement.course_id)) &&
        getRecordState(
          statesById,
          "announcement",
          announcement.id,
          collidingItemIds,
        )?.hidden === true &&
        isRecentAnnouncement(announcement, now),
    )
    .map((announcement) => ({
      ...announcement,
      courseName:
        courseNameById.get(announcement.course_id) ?? "Unknown course",
      excerpt: announcementHtmlToText(announcement.message),
    }))
    .sort((left, right) => {
      const leftTime =
        left.posted_at === null
          ? Number.NEGATIVE_INFINITY
          : Date.parse(left.posted_at);
      const rightTime =
        right.posted_at === null
          ? Number.NEGATIVE_INFINITY
          : Date.parse(right.posted_at);
      return rightTime - leftTime || left.id.localeCompare(right.id);
    });
}

/** Determines whether cached data needs a stale-data warning. */
export function shouldShowStaleWarning(
  metadata: SyncMetadata | null | undefined,
  now: Date,
): boolean {
  if (
    metadata?.last_status !== "success" ||
    metadata.last_success_at === null
  ) {
    return true;
  }

  const lastSuccessTime = Date.parse(metadata.last_success_at);
  if (Number.isNaN(lastSuccessTime)) {
    return true;
  }

  return now.getTime() - lastSuccessTime > STALE_AFTER_MS;
}
