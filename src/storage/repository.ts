/**
 * @fileoverview Provides atomic persistence operations for Canvas local data.
 *
 * Remote snapshots replace only API-owned stores; local preferences and item
 * state remain durable across refreshes.
 */

import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CourseRecord,
} from "../domain/models";
import { CanvasDatabase } from "./database";

/** Accepts both normalized agenda records and fixtures without completion state. */
export type RemoteAgendaItem = Omit<AgendaItemRecord, "is_complete"> & {
  is_complete?: boolean;
};

/** Describes the remote data that is replaced during a Canvas refresh. */
export interface RemoteSnapshotInput {
  courses: CourseRecord[];
  agenda_items: RemoteAgendaItem[];
  announcements: AnnouncementRecord[];
}

/**
 * Replaces all API-owned records without removing local user state.
 *
 * @param database - The Canvas database to update.
 * @param snapshot - The complete set of remote records from Canvas.
 * @returns A promise that resolves after the replacement commits.
 */
export async function replaceRemoteSnapshot(
  database: CanvasDatabase,
  snapshot: RemoteSnapshotInput,
): Promise<void> {
  const agendaItems = snapshot.agenda_items.map(normalizeAgendaItem);

  await database.transaction(
    "rw",
    database.courses,
    database.agenda_items,
    database.announcements,
    database.course_preferences,
    async () => {
      const existingPreferences = await database.course_preferences.bulkGet(
        snapshot.courses.map(({ id }) => id),
      );
      const newPreferences = snapshot.courses
        .filter((_, index) => existingPreferences[index] === undefined)
        .map(({ id }) => ({ id, enabled: true }));

      await database.courses.clear();
      await database.agenda_items.clear();
      await database.announcements.clear();
      await database.courses.bulkPut(snapshot.courses);
      await database.agenda_items.bulkPut(agendaItems);
      await database.announcements.bulkPut(snapshot.announcements);
      await database.course_preferences.bulkPut(newPreferences);
    },
  );
}

/**
 * Persists a course visibility preference using its stable course key.
 *
 * @param database - The Canvas database to update.
 * @param courseId - The normalized course record ID.
 * @param enabled - Whether the course should appear in the interface.
 * @returns A promise that resolves after the preference is upserted.
 */
export async function saveCoursePreference(
  database: CanvasDatabase,
  courseId: string,
  enabled: boolean,
): Promise<void> {
  await database.course_preferences.put({ id: courseId, enabled });
}

/**
 * Persists local agenda state using its stable agenda-item key.
 *
 * @param database - The Canvas database to update.
 * @param itemId - The normalized agenda-item record ID.
 * @param state - The hidden and note state to preserve locally.
 * @returns A promise that resolves after the state is upserted.
 */
export async function saveItemState(
  database: CanvasDatabase,
  itemId: string,
  state: { hidden: boolean; note: string },
): Promise<void> {
  await database.item_states.put({ id: itemId, ...state });
}

/**
 * Removes every remote and local Canvas record atomically.
 *
 * @param database - The Canvas database to clear.
 * @returns A promise that resolves after all stores are empty.
 */
export async function clearAllData(database: CanvasDatabase): Promise<void> {
  await database.transaction("rw", database.tables, async () => {
    await database.courses.clear();
    await database.agenda_items.clear();
    await database.announcements.clear();
    await database.course_preferences.clear();
    await database.item_states.clear();
    await database.sync_metadata.clear();
  });
}

/**
 * Normalizes optional fixture completion state to the persisted domain shape.
 *
 * @param agendaItem - A remote agenda record that may omit completion state.
 * @returns A fully normalized agenda record for storage.
 */
function normalizeAgendaItem(agendaItem: RemoteAgendaItem): AgendaItemRecord {
  return {
    ...agendaItem,
    is_complete: agendaItem.is_complete ?? false,
  };
}
