/**
 * @fileoverview Derives backward-compatible local-state keys for dashboard records.
 */

import type {
  AgendaItemRecord,
  AnnouncementRecord,
  ItemState,
} from "../domain/models";

export type ItemStateRecordType = "agenda" | "announcement";

/** Finds record IDs that occur in both dashboard source collections. */
export function getCollidingItemStateIds(
  agendaItems: AgendaItemRecord[],
  announcements: AnnouncementRecord[],
): Set<string> {
  const agendaIds = new Set(agendaItems.map(({ id }) => id));

  return new Set(
    announcements.map(({ id }) => id).filter((id) => agendaIds.has(id)),
  );
}

/** Returns a typed key only when the legacy raw ID is ambiguous. */
export function getItemStateKey(
  recordType: ItemStateRecordType,
  recordId: string,
  collidingIds: ReadonlySet<string>,
): string {
  return collidingIds.has(recordId) ? `${recordType}:${recordId}` : recordId;
}

/** Resolves local state, excluding ambiguous legacy raw keys by construction. */
export function getItemState(
  statesById: ReadonlyMap<string, ItemState>,
  recordType: ItemStateRecordType,
  recordId: string,
  collidingIds: ReadonlySet<string>,
): ItemState | undefined {
  const typedKey = `${recordType}:${recordId}`;
  if (collidingIds.has(recordId)) {
    return statesById.get(typedKey);
  }

  return statesById.get(typedKey) ?? statesById.get(recordId);
}
