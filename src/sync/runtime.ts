/**
 * @fileoverview Coordinates extension scheduling and synchronization messages.
 */

import type { SyncTrigger } from "./sync-service";

export const SYNC_ALARM_NAME = "better-canvas-view-hourly-sync";
const SYNC_PERIOD_MINUTES = 60;

interface AlarmDetails {
  name: string;
  periodInMinutes?: number;
}

type AlarmListener = (alarm: { name: string }) => void | Promise<void>;
type MessageListener = (message: unknown) => unknown;

export interface SyncRuntimeAdapter {
  get(name: string): Promise<AlarmDetails | undefined>;
  create(name: string, alarmInfo: { periodInMinutes: number }): Promise<void>;
  onAlarm(listener: AlarmListener): void;
  onMessage(listener: MessageListener): void;
}

export interface RuntimeSyncService {
  run(trigger: SyncTrigger): Promise<unknown>;
}

/** Checks for the one explicit dashboard synchronization message. */
function isManualSyncMessage(message: unknown): boolean {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "RUN_CANVAS_SYNC"
  );
}

/** Owns alarm registration and event-to-service dispatch. */
export class SyncRuntime {
  readonly #service: RuntimeSyncService;
  readonly #adapter: SyncRuntimeAdapter;
  #initialized = false;

  /** Creates a runtime over browser-independent scheduling interfaces. */
  constructor(service: RuntimeSyncService, adapter: SyncRuntimeAdapter) {
    this.#service = service;
    this.#adapter = adapter;
  }

  /** Registers listeners once and verifies the hourly alarm configuration. */
  async initialize(): Promise<void> {
    if (this.#initialized) {
      return;
    }

    this.#initialized = true;
    this.#adapter.onAlarm(async (alarm) => {
      if (alarm.name === SYNC_ALARM_NAME) {
        await this.#service.run("alarm");
      }
    });
    this.#adapter.onMessage((message) => {
      if (!isManualSyncMessage(message)) {
        return undefined;
      }

      return this.#service.run("manual");
    });

    await this.#ensureAlarm();
  }

  /** Verifies scheduling and performs an extension-startup synchronization. */
  async startup(): Promise<void> {
    await this.#ensureAlarm();
    await this.#service.run("startup");
  }

  /** Recreates a missing or incorrectly configured periodic alarm. */
  async #ensureAlarm(): Promise<void> {
    const existing = await this.#adapter.get(SYNC_ALARM_NAME);
    if (existing?.periodInMinutes === SYNC_PERIOD_MINUTES) {
      return;
    }

    await this.#adapter.create(SYNC_ALARM_NAME, {
      periodInMinutes: SYNC_PERIOD_MINUTES,
    });
  }
}
