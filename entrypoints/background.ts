/**
 * @fileoverview Opens the dashboard and runs read-only Canvas diagnostics.
 */

import { browser } from "wxt/browser";

import {
  isDiagnosticRequest,
  type DiagnosticRequest,
  type DiagnosticResult,
} from "../src/diagnostic/contracts";
import { runCanvasDiagnostic } from "../src/diagnostic/run-canvas-diagnostic";

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

export default defineBackground({
  type: "module",

  /** Registers extension listeners when the service worker starts. */
  main(): void {
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
  },
});
