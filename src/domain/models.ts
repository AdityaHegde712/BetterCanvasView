/**
 * @fileoverview Defines normalized Canvas records shared across application layers.
 */

export type AgendaItemType = "assignment" | "quiz" | "external_tool";

export interface CourseRecord {
  id: string;
  course_id: string;
  object_id: string;
  name: string;
  course_code: string;
  html_url: string | null;
}

export interface AgendaItemRecord {
  id: string;
  course_id: string;
  object_id: string;
  title: string;
  due_at: string | null;
  points_possible: number | null;
  item_type: AgendaItemType;
  is_complete: boolean;
  html_url: string | null;
}

export interface AnnouncementRecord {
  id: string;
  course_id: string;
  object_id: string;
  title: string;
  message: string;
  posted_at: string | null;
  html_url: string | null;
}

export interface CoursePreference {
  id: string;
  enabled: boolean;
}

export interface ItemState {
  id: string;
  hidden: boolean;
  note: string;
}

export interface RemoteSnapshot {
  courses: CourseRecord[];
  agenda_items: AgendaItemRecord[];
  announcements: AnnouncementRecord[];
}

export interface SyncMetadata {
  id: "current";
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_status:
    | "success"
    | "auth_required"
    | "network_error"
    | "rate_limited"
    | "invalid_response";
  course_count?: number;
  agenda_item_count?: number;
  announcement_count?: number;
  error_code?: string;
}
