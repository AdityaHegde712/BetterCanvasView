/**
 * @fileoverview Opens the dashboard and runs read-only Canvas diagnostics.
 */

import { browser } from "wxt/browser";

import { CanvasHttpClient } from "../src/canvas/client";
import {
  isDiagnosticRequest,
  type DiagnosticRequest,
  type DiagnosticResult,
} from "../src/diagnostic/contracts";
import { runCanvasDiagnostic } from "../src/diagnostic/run-canvas-diagnostic";
import { CanvasDatabase } from "../src/storage/database";
import { SyncRuntime, type SyncRuntimeAdapter } from "../src/sync/runtime";
import { SyncService } from "../src/sync/sync-service";

/** Opens the full-page extension dashboard. */
function openDashboard(): void {
  void browser.runtime.openOptionsPage();
}

/** Handles diagnostic messages from trusted extension pages. */
function handleMessage(
  message: unknown,
): Promise<DiagnosticResult> | undefined {
  if (!isDiagnosticRequest(message)) {
    return undefined;
  }

  return runCanvasDiagnostic();
}

/** Adapts WXT browser events to the browser-independent synchronization runtime. */
function createSyncRuntimeAdapter(): SyncRuntimeAdapter {
  return {
    async get(name) {
      const alarm = await browser.alarms.get(name);

      return alarm === undefined
        ? undefined
        : {
            name: alarm.name,
            periodInMinutes: alarm.periodInMinutes,
          };
    },
    async create(name, alarmInfo) {
      await browser.alarms.create(name, alarmInfo);
    },
    onAlarm(listener) {
      browser.alarms.onAlarm.addListener((alarm) => {
        void listener({ name: alarm.name });
      });
    },
    onMessage(listener) {
      browser.runtime.onMessage.addListener((message) => listener(message));
    },
  };
}

export default defineBackground({
  type: "module",

  /** Registers extension listeners when the service worker starts. */
  main(): void {
    const database = new CanvasDatabase("better-canvas-view");
    const service = new SyncService(new CanvasHttpClient(), database);
    const runtime = new SyncRuntime(service, createSyncRuntimeAdapter());

    browser.action.onClicked.addListener(openDashboard);
    browser.runtime.onMessage.addListener(
      (
        message: DiagnosticRequest,
        _sender,
        sendResponse: (result: DiagnosticResult) => void,
      ): boolean => {
        const diagnostic = handleMessage(message);
        if (diagnostic === undefined) {
          return false;
        }

        void diagnostic.then(sendResponse);
        return true;
      },
    );

    browser.runtime.onStartup.addListener(() => {
      void runtime.startup();
    });
    void runtime.initialize();
  },
});
