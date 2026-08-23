/**
 * @fileoverview Defines the privacy-preserving Canvas diagnostic contract.
 */

export const RUN_DIAGNOSTIC_MESSAGE = "RUN_CANVAS_DIAGNOSTIC" as const;

export interface DiagnosticRequest {
  type: typeof RUN_DIAGNOSTIC_MESSAGE;
}

export type DiagnosticStatus =
  | "success"
  | "auth_required"
  | "network_error"
  | "rate_limited"
  | "invalid_response";

export interface DiagnosticResult {
  status: DiagnosticStatus;
  elapsed_ms: number;
  checked_at: string;
  course_sample_count?: number;
  error_code?: string;
}

/** Checks whether an extension message requests the Canvas diagnostic. */
export function isDiagnosticRequest(
  value: unknown,
): value is DiagnosticRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Reflect.get(value, "type") === RUN_DIAGNOSTIC_MESSAGE;
}
