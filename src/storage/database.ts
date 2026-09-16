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
  IsaAssignmentRecord,
  IsaTodoRecord,
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

  /** Stores normalized ISA assignments with grading status. */
  isa_assignments!: Table<IsaAssignmentRecord, string>;

  /** Stores persistent local ISA todo checklist items. */
  isa_todos!: Table<IsaTodoRecord, string>;

  /**
   * Creates a database using versioned Canvas schemas.
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

    this.version(2).stores({
      courses: "&id, course_id, name, course_code, enrollment_type",
      agenda_items: "&id, course_id, due_at, item_type, is_complete",
      announcements: "&id, course_id, posted_at",
      course_preferences: "&id, enabled",
      item_states: "&id, hidden",
      sync_metadata: "&id, last_status, last_success_at",
      isa_assignments: "&id, course_id, due_at, needs_grading_count",
      isa_todos: "&id, completed, created_at",
    });
  }
}
