/**
 * @fileoverview Verifies read-only Canvas API access without exposing payloads.
 */

import type { DiagnosticResult, DiagnosticStatus } from "./contracts";

const CANVAS_ORIGIN = "https://sjsu.instructure.com";
const DIAGNOSTIC_URL = new URL("/api/v1/courses", CANVAS_ORIGIN);

DIAGNOSTIC_URL.searchParams.set("enrollment_type", "student");
DIAGNOSTIC_URL.searchParams.set("enrollment_state", "active");
DIAGNOSTIC_URL.searchParams.set("per_page", "1");

/** Maps a failed Canvas response to a non-sensitive diagnostic status. */
function classifyFailure(response: Response): DiagnosticStatus {
  if (response.status === 401 || response.status === 403) {
    return "auth_required";
  }

  if (response.status === 429) {
    return "rate_limited";
  }

  return "invalid_response";
}

/** Checks whether Canvas returned JSON from the expected API origin and path. */
function isExpectedJsonResponse(response: Response): boolean {
  const responseUrl = new URL(response.url);
  const isCanvasApi =
    responseUrl.origin === CANVAS_ORIGIN &&
    responseUrl.pathname.startsWith("/api/v1/");
  const isJson = response.headers
    .get("content-type")
    ?.toLowerCase()
    .includes("application/json");

  return isCanvasApi && isJson === true;
}

/** Builds a diagnostic result containing metadata but no Canvas response data. */
function createResult(
  status: DiagnosticStatus,
  startedAt: number,
  details: Pick<DiagnosticResult, "course_sample_count" | "error_code"> = {},
): DiagnosticResult {
  return {
    status,
    elapsed_ms: Math.round(performance.now() - startedAt),
    checked_at: new Date().toISOString(),
    ...details,
  };
}

/** Runs a single fixed GET request against the active-courses Canvas endpoint. */
export async function runCanvasDiagnostic(): Promise<DiagnosticResult> {
  const startedAt = performance.now();

  try {
    const response = await fetch(DIAGNOSTIC_URL, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return createResult(classifyFailure(response), startedAt, {
        error_code: `HTTP_${response.status}`,
      });
    }

    if (!isExpectedJsonResponse(response)) {
      return createResult("auth_required", startedAt, {
        error_code: "NON_API_RESPONSE",
      });
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      return createResult("invalid_response", startedAt, {
        error_code: "UNEXPECTED_JSON_SHAPE",
      });
    }

    return createResult("success", startedAt, {
      course_sample_count: payload.length,
    });
  } catch {
    return createResult("network_error", startedAt, {
      error_code: "FETCH_FAILED",
    });
  }
}
