/**
 * @fileoverview Defines the versioned Dexie schema for Canvas local data.
 *
 * Keeps remote Canvas records and local user state in separate stores so a
 * refresh can replace server data without discarding user preferences.
 */

import Dexie, { type Table } from "dexie";

import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CoursePreference,
  CourseRecord,
  ItemState,
  SyncMetadata,
} from "../domain/models";

/**
 * Provides versioned IndexedDB tables for Canvas data.
 */
export class CanvasDatabase extends Dexie {
  /** Stores courses returned by the Canvas API. */
  courses!: Table<CourseRecord, string>;

  /** Stores normalized assignments, quizzes, and external-tool items. */
  agenda_items!: Table<AgendaItemRecord, string>;

  /** Stores normalized Canvas announcements. */
  announcements!: Table<AnnouncementRecord, string>;

  /** Stores local visibility choices for courses. */
  course_preferences!: Table<CoursePreference, string>;

  /** Stores local hidden and note state for agenda items. */
  item_states!: Table<ItemState, string>;

  /** Stores the outcome of the latest synchronization attempt. */
  sync_metadata!: Table<SyncMetadata, "current">;

  /**
   * Creates a database using the version-1 Canvas schema.
   *
   * @param databaseName - The IndexedDB database name.
   */
  constructor(databaseName = "canvas") {
    super(databaseName);

    this.version(1).stores({
      courses: "&id, course_id, name, course_code",
      agenda_items: "&id, course_id, due_at, item_type, is_complete",
      announcements: "&id, course_id, posted_at",
      course_preferences: "&id, enabled",
      item_states: "&id, hidden",
      sync_metadata: "&id, last_status, last_success_at",
    });
  }
}
