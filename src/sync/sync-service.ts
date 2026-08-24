/**
 * @fileoverview Coordinates complete read-only Canvas snapshot synchronization.
 */

import {
  CanvasClientError,
  type CanvasClientErrorCode,
  type CanvasQuery,
} from "../canvas/client";
import {
  normalizeAnnouncement,
  normalizeAssignment,
  normalizeCourse,
} from "../domain/normalization";
import type {
  AgendaItemRecord,
  AnnouncementRecord,
  CourseRecord,
  SyncMetadata,
} from "../domain/models";
import { CanvasDatabase } from "../storage/database";
import { replaceRemoteSnapshot, saveSyncMetadata } from "../storage/repository";

export type SyncTrigger = "startup" | "alarm" | "manual" | "diagnostic";
export type SyncStatus = "success" | CanvasClientErrorCode;

export interface SyncCounts {
  courses: number;
  agenda_items: number;
  announcements: number;
}

export interface SyncResult {
  status: SyncStatus;
  trigger: SyncTrigger;
  startedAt: string;
  completedAt: string;
  counts?: SyncCounts;
  error_code?: CanvasClientErrorCode;
}

export interface SyncRunner {
  run(trigger: SyncTrigger): Promise<SyncResult>;
}

interface SyncServiceOptions {
  now_fn?: () => Date;
}

interface SyncCanvasClient {
  getAll(path: string, query?: CanvasQuery): Promise<unknown[]>;
}

type CanvasObject = Record<string, unknown>;

const COURSE_QUERY: CanvasQuery = {
  enrollment_state: "active",
  enrollment_type: "student",
  "include[]": "term",
  per_page: 100,
};

const ASSIGNMENT_QUERY: CanvasQuery = {
  "include[]": "submission",
  order_by: "due_at",
  override_assignment_dates: true,
  per_page: 100,
};

const ANNOUNCEMENT_QUERY: CanvasQuery = {
  only_announcements: true,
  order_by: "recent_activity",
  per_page: 100,
};

/** Checks whether an unknown Canvas value is a non-null object. */
function isCanvasObject(value: unknown): value is CanvasObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Maps all unexpected synchronization failures to a privacy-safe code. */
function getErrorCode(error: unknown): CanvasClientErrorCode {
  return error instanceof CanvasClientError ? error.code : "invalid_response";
}

/** Coordinates serial Canvas reads and atomic IndexedDB persistence. */
export class SyncService implements SyncRunner {
  readonly #client: SyncCanvasClient;
  readonly #database: CanvasDatabase;
  readonly #nowFn: () => Date;
  #runQueue: Promise<void> = Promise.resolve();

  /** Creates a service with injectable time for deterministic tests. */
  constructor(
    client: SyncCanvasClient,
    database: CanvasDatabase,
    options: SyncServiceOptions = {},
  ) {
    this.#client = client;
    this.#database = database;
    this.#nowFn = options.now_fn ?? (() => new Date());
  }

  /** Queues one complete synchronization in trigger arrival order. */
  run(trigger: SyncTrigger): Promise<SyncResult> {
    const result = this.#runQueue.then(() => this.#runOnce(trigger));
    this.#runQueue = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  /** Fetches one complete snapshot and preserves the prior one on failure. */
  async #runOnce(trigger: SyncTrigger): Promise<SyncResult> {
    const startedAt = this.#nowFn().toISOString();

    try {
      const snapshot = await this.#fetchSnapshot();
      const completedAt = this.#nowFn().toISOString();
      const counts: SyncCounts = {
        courses: snapshot.courses.length,
        agenda_items: snapshot.agenda_items.length,
        announcements: snapshot.announcements.length,
      };
      const metadata: SyncMetadata = {
        id: "current",
        last_attempt_at: completedAt,
        last_success_at: completedAt,
        last_status: "success",
        course_count: counts.courses,
        agenda_item_count: counts.agenda_items,
        announcement_count: counts.announcements,
      };

      await replaceRemoteSnapshot(this.#database, snapshot, metadata);

      return { status: "success", trigger, startedAt, completedAt, counts };
    } catch (error) {
      const completedAt = this.#nowFn().toISOString();
      const errorCode = getErrorCode(error);
      const previous = await this.#database.sync_metadata.get("current");

      await saveSyncMetadata(this.#database, {
        ...previous,
        id: "current",
        last_attempt_at: completedAt,
        last_success_at: previous?.last_success_at ?? null,
        last_status: errorCode,
        error_code: errorCode,
      });

      return {
        status: errorCode,
        trigger,
        startedAt,
        completedAt,
        error_code: errorCode,
      };
    }
  }

  /** Reads all course resources serially before returning a complete snapshot. */
  async #fetchSnapshot(): Promise<{
    courses: CourseRecord[];
    agenda_items: AgendaItemRecord[];
    announcements: AnnouncementRecord[];
  }> {
    const rawCourses = await this.#client.getAll(
      "/api/v1/courses",
      COURSE_QUERY,
    );
    const courses: CourseRecord[] = [];
    const agendaItems: AgendaItemRecord[] = [];
    const announcements: AnnouncementRecord[] = [];

    for (const rawCourse of rawCourses) {
      const course = normalizeCourse(rawCourse);
      courses.push(course);

      const courseId = encodeURIComponent(course.course_id);
      const assignments = await this.#client.getAll(
        `/api/v1/courses/${courseId}/assignments`,
        ASSIGNMENT_QUERY,
      );
      for (const assignment of assignments) {
        const normalized = normalizeAssignment(rawCourse, assignment);
        if (normalized !== null) {
          agendaItems.push(normalized);
        }
      }

      const topics = await this.#client.getAll(
        `/api/v1/courses/${courseId}/discussion_topics`,
        ANNOUNCEMENT_QUERY,
      );
      for (const topic of topics) {
        if (isCanvasObject(topic) && topic.is_announcement === true) {
          announcements.push(normalizeAnnouncement(rawCourse, topic));
        }
      }
    }

    return {
      courses,
      agenda_items: agendaItems,
      announcements,
    };
  }
}
