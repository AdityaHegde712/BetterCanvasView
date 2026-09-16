/**
 * @fileoverview Domain contracts and transport models for the assignment materials exporter.
 */

import type { AgendaItemRecord } from "../domain/models";

export type DeliverableType = "assignment" | "quiz" | "discussion";

/** Represents an agenda item selected by the user for materials export. */
export interface DeliverableExportTarget {
  readonly id: string;
  readonly course_id: string;
  readonly course_code: string;
  readonly title: string;
  readonly due_at: string | null;
  readonly points_possible: number | null;
  readonly deliverable_type: DeliverableType;
  readonly html_url: string | null;
}

/** Represents an attachment file associated with an assignment. */
export interface AttachmentResource {
  readonly id: string;
  readonly display_name: string;
  readonly download_url: string;
  readonly size_bytes?: number | null;
  readonly content_type?: string | null;
}

/** Represents an embedded image discovered in assignment instructions HTML. */
export interface EmbeddedImageResource {
  readonly original_url: string;
  readonly local_filename: string;
  readonly mime_type?: string;
}

/** Complete extracted deliverable package ready for offline rendering and zipping. */
export interface DeliverableMaterial {
  readonly target: DeliverableExportTarget;
  readonly localized_html: string;
  readonly raw_description_html: string;
  readonly attachments: readonly AttachmentResource[];
  readonly embedded_images: readonly EmbeddedImageResource[];
}

/** Real-time progress status during batch extraction and ZIP compression. */
export interface ExportProgressState {
  readonly active: boolean;
  readonly stage:
    | "preparing"
    | "fetching_details"
    | "downloading_attachments"
    | "compressing"
    | "complete"
    | "error";
  readonly current: number;
  readonly total: number;
  readonly message: string;
}

/** Warning or failure record for partial export logging. */
export interface ExportIssue {
  readonly deliverable_id: string;
  readonly deliverable_title: string;
  readonly resource_name: string;
  readonly error_message: string;
}

/** Summary report bundled inside the archive if issues occur. */
export interface ExportReport {
  readonly generated_at: string;
  readonly total_requested: number;
  readonly successful_deliverables: number;
  readonly total_attachments_downloaded: number;
  readonly issues: readonly ExportIssue[];
}

/**
 * Converts an AgendaItemRecord into a DeliverableExportTarget.
 */
export function createExportTarget(
  item: AgendaItemRecord,
  courseCode: string,
): DeliverableExportTarget {
  let deliverable_type: DeliverableType = "assignment";
  if (item.item_type === "quiz") {
    deliverable_type = "quiz";
  }

  return {
    id: item.id,
    course_id: item.course_id,
    course_code: courseCode,
    title: item.title,
    due_at: item.due_at,
    points_possible: item.points_possible,
    deliverable_type,
    html_url: item.html_url,
  };
}
