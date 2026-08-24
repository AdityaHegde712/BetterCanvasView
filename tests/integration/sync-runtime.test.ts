/**
 * @fileoverview Defines extension-runtime scheduling and message dispatch contracts.
 */

import { describe, expect, it, vi } from "vitest";

import { SYNC_ALARM_NAME, SyncRuntime } from "../../src/sync/runtime";

type AlarmListener = (alarm: { name: string }) => void | Promise<void>;
type MessageListener = (message: unknown) => unknown;

function createAlarmAdapter(existingPeriod?: number) {
  const alarmListeners: AlarmListener[] = [];
  const messageListeners: MessageListener[] = [];

  return {
    create: vi.fn(async () => undefined),
    get: vi.fn(async (name: string) =>
      existingPeriod !== undefined && name === SYNC_ALARM_NAME
        ? { name, periodInMinutes: existingPeriod }
        : undefined,
    ),
    onAlarm: (listener: AlarmListener) => alarmListeners.push(listener),
    onMessage: (listener: MessageListener) => messageListeners.push(listener),
    async triggerAlarm(name: string): Promise<void> {
      await Promise.all(
        alarmListeners.map(async (listener) => listener({ name })),
      );
    },
    async triggerMessage(message: unknown): Promise<unknown[]> {
      return Promise.all(
        messageListeners.map(async (listener) => await listener(message)),
      );
    },
  };
}

describe("SyncRuntime", () => {
  it("registers one 60-minute periodic alarm and does not duplicate an existing alarm", async () => {
    const service = { run: vi.fn(async () => ({ status: "success" })) };
    const freshAdapter = createAlarmAdapter();
    const freshRuntime = new SyncRuntime(service, freshAdapter);

    await freshRuntime.initialize();
    await freshRuntime.initialize();
    expect(freshAdapter.create).toHaveBeenCalledOnce();
    expect(freshAdapter.create).toHaveBeenCalledWith(SYNC_ALARM_NAME, {
      periodInMinutes: 60,
    });

    const existingAdapter = createAlarmAdapter(60);
    await new SyncRuntime(service, existingAdapter).initialize();
    expect(existingAdapter.create).not.toHaveBeenCalled();

    const wrongPeriodAdapter = createAlarmAdapter(30);
    await new SyncRuntime(service, wrongPeriodAdapter).initialize();
    expect(wrongPeriodAdapter.create).toHaveBeenCalledWith(SYNC_ALARM_NAME, {
      periodInMinutes: 60,
    });
  });

  it("ensures scheduling and runs startup synchronization", async () => {
    const service = { run: vi.fn(async () => ({ status: "success" })) };
    const adapter = createAlarmAdapter();
    const runtime = new SyncRuntime(service, adapter);

    await runtime.startup();

    expect(adapter.create).toHaveBeenCalledWith(SYNC_ALARM_NAME, {
      periodInMinutes: 60,
    });
    expect(service.run).toHaveBeenCalledWith("startup");
  });

  it("dispatches only matching alarms and the explicit manual sync message", async () => {
    const syncResult = { status: "success" };
    const service = { run: vi.fn(async () => syncResult) };
    const adapter = createAlarmAdapter();
    const runtime = new SyncRuntime(service, adapter);

    await runtime.initialize();
    await adapter.triggerAlarm("other-alarm");
    await expect(adapter.triggerMessage({ type: "IGNORE" })).resolves.toEqual([
      undefined,
    ]);
    expect(service.run).not.toHaveBeenCalled();

    await adapter.triggerAlarm(SYNC_ALARM_NAME);
    await expect(
      adapter.triggerMessage({ type: "RUN_CANVAS_SYNC" }),
    ).resolves.toEqual([syncResult]);
    expect(service.run).toHaveBeenNthCalledWith(1, "alarm");
    expect(service.run).toHaveBeenNthCalledWith(2, "manual");
  });
});
