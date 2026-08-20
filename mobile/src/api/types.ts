/**
 * Domain types mirroring the HTTP contract documented in `docs/frontend-api-contract.md`.
 *
 * Operational statuses are NEVER modelled as a union here — they are configurable
 * on the backend and always arrive as {@link StatusRef} / {@link StatusTransitionOption}.
 */

export type UserRole = 'client' | 'admin' | 'super_admin' | 'staff';
export type EntityType = 'report' | 'request';
export type AssignmentScope = 'report' | 'request';
export type AssigneeType = 'staff' | 'service';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionStatus = 'pending' | 'accepted' | 'replaced' | 'rejected';
export type SuggestionDecision = 'accepted' | 'replaced' | 'rejected';
export type LocationMode = 'none' | 'one_time' | 'streaming';
export type QueueSort = 'fifo' | 'client_priority' | 'ai_priority';
export type AttachmentType = 'photo' | 'file' | 'audio' | 'video';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Envelope<T> {
  data: T;
}

export interface UserSummary {
  id: number;
  name: string;
  role: UserRole;
}

export interface AuthenticatedUser extends UserSummary {
  email: string;
  phone: string | null;
  avatar_url: string | null;
  position: Position | null;
  organization_name: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface Position {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

/** "Zakres udostępnionych danych" — configurable server-side, never hardcoded. */
export interface DataScopeOption {
  key: string;
  label: string;
  description: string | null;
}

export interface StatusRef {
  id: number;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  is_final: boolean;
}

/** One entry of `GET .../available-status-transitions`. */
export interface StatusTransitionOption {
  id: number;
  to_status_id: number;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  requires_confirmation: boolean;
  requires_note: boolean;
  requires_attachment: boolean;
}

export interface StatusChangePayload {
  to_status_id: number;
  note?: string;
  attachment_ids?: number[];
}

export interface ClientSummary {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * What the API is willing to reveal about an assignee. For clients this is only
 * ever returned for an *active* assignment (see the contract doc).
 */
export interface AssigneeSummary {
  id: number;
  type: AssigneeType;
  display_name: string;
  position: Position | null;
  organization_name: string | null;
  avatar_url: string | null;
  contact_channel: string | null;
  participation_status: string | null;
}

export interface Assignment {
  id: number;
  report_id: number;
  request_id: number | null;
  scope: AssignmentScope;
  assignee: AssigneeSummary;
  position: Position | null;
  data_scope: DataScopeOption | null;
  instruction: string | null;
  assigned_by: UserSummary | null;
  assigned_at: string;
  revoked_at: string | null;
  completed_at: string | null;
  is_active: boolean;
}

export interface PositionSuggestion {
  id: number;
  report_id: number;
  request_id: number | null;
  position: Position;
  status: SuggestionStatus;
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: UserSummary | null;
  resulting_position: Position | null;
}

export interface Attachment {
  id: number;
  report_id: number;
  request_id: number | null;
  type: AttachmentType;
  name: string;
  url: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string;
  uploaded_by: UserSummary | null;
}

export interface HistoryEntry {
  id: number;
  scope: 'report' | 'request' | 'assignment';
  request_id: number | null;
  label: string;
  description: string | null;
  actor: UserSummary | null;
  created_at: string;
  from_status: StatusRef | null;
  to_status: StatusRef | null;
}

export interface LocationSnapshot {
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
}

export interface MediaStreamSession {
  id: number;
  report_id: number;
  kind: 'camera' | 'audio' | 'location';
  started_at: string;
  ended_at: string | null;
  is_live: boolean;
}

export interface ReportCapabilities {
  can_add_attachment: boolean;
  can_add_note: boolean;
  can_suggest_position: boolean;
  can_manage_assignments: boolean;
  can_create_request: boolean;
  can_close: boolean;
}

export interface RequestSummary {
  id: number;
  report_id: number;
  name: string;
  description: string | null;
  status: StatusRef;
  created_at: string;
  suggested_position: Position | null;
  active_assignments_count: number;
}

export interface RequestDetail extends RequestSummary {
  assignments: Assignment[];
  position_suggestions: PositionSuggestion[];
  attachments: Attachment[];
  capabilities: ReportCapabilities;
  report: {
    id: number;
    name: string;
    status: StatusRef;
    category: Category | null;
    client: ClientSummary | null;
  };
}

export interface ReportSummary {
  id: number;
  name: string;
  description: string | null;
  category: Category | null;
  urgency: UrgencyLevel;
  /** Ktoś jest uwięziony w kabinie — najwyższy priorytet operacyjny. */
  is_entrapment: boolean;
  /** Adres obiektu (budynek wspólnoty/spółdzielni). */
  site_address: string | null;
  /** Oznaczenie urządzenia, np. „Winda A (kabina 1)”. */
  device_label: string | null;
  status: StatusRef;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  requests_count: number;
  open_requests_count: number;
  active_assignments_count: number;
  /** True when no staff/service is assigned — the admin runs the report alone. */
  handled_by_admin_only: boolean;
  client: ClientSummary | null;
  assigned_admin: UserSummary | null;
  location: LocationSnapshot | null;
  location_mode: LocationMode;
  has_live_stream: boolean;
}

export interface ReportDetail extends ReportSummary {
  requests: RequestSummary[];
  position_suggestions: PositionSuggestion[];
  assignments: Assignment[];
  attachments: Attachment[];
  media_sessions: MediaStreamSession[];
  capabilities: ReportCapabilities;
}

/** Report data trimmed down by the API to the assignment's `data_scope`. */
export interface ScopedReportInfo {
  id: number;
  name: string;
  description: string | null;
  category: Category | null;
  urgency: UrgencyLevel;
  is_entrapment: boolean;
  site_address: string | null;
  device_label: string | null;
  status: StatusRef;
  client: ClientSummary | null;
  created_at: string;
}

export interface StaffTaskSummary {
  assignment: Assignment;
  scope: AssignmentScope;
  title: string;
  position_name: string | null;
  status: StatusRef;
  report: {
    id: number;
    name: string;
    category: Category | null;
    urgency: UrgencyLevel;
    is_entrapment: boolean;
    site_address: string | null;
    device_label: string | null;
  };
  request: { id: number; name: string } | null;
  updated_at: string;
}

export interface StaffTaskDetail {
  assignment: Assignment;
  scope: AssignmentScope;
  title: string;
  description: string | null;
  position_name: string | null;
  status: StatusRef;
  report: ScopedReportInfo;
  request: RequestSummary | null;
  attachments: Attachment[];
  history: HistoryEntry[];
  location: LocationSnapshot | null;
  capabilities: { can_add_note: boolean; can_add_attachment: boolean };
}

export interface DirectoryStaffMember {
  id: number;
  name: string;
  position: Position | null;
  organization_name: string | null;
  is_available: boolean;
  active_assignments_count: number;
}

export interface DirectoryService {
  id: number;
  name: string;
  description: string | null;
  position: Position | null;
  is_available: boolean;
}

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  target: {
    report_id: number | null;
    request_id: number | null;
    assignment_id: number | null;
  } | null;
}

export interface ClientDashboard {
  active_reports: ReportSummary[];
  recent_changes: HistoryEntry[];
  unread_notifications: number;
  live_streams: MediaStreamSession[];
}

export interface AdminDashboard {
  queue: {
    total: number;
    by_urgency: Record<UrgencyLevel, number>;
    oldest_waiting_minutes: number | null;
  };
  handled_reports: ReportSummary[];
  pending_suggestions: PositionSuggestion[];
  active_assignments: Assignment[];
  unread_notifications: number;
}

export interface NewRequestDraft {
  name: string;
  description: string | null;
  suggested_position_id: number | null;
}

export interface LocalFileRef {
  uri: string;
  name: string;
  mime_type: string;
  type: AttachmentType;
}

export interface CreateReportPayload {
  name: string;
  description: string;
  category_id: number | null;
  urgency: UrgencyLevel;
  is_entrapment: boolean;
  site_address: string | null;
  device_label: string | null;
  location_mode: LocationMode;
  location: { lat: number; lng: number; accuracy: number | null } | null;
  suggested_position_id: number | null;
  requests: NewRequestDraft[];
}

export interface CreateAssignmentPayload {
  request_id: number | null;
  assignee_type: AssigneeType;
  assignee_id: number;
  position_id: number | null;
  data_scope: string;
  instruction: string | null;
}

export interface UpdateAssignmentPayload {
  position_id?: number | null;
  data_scope?: string;
  instruction?: string | null;
}

export interface ReportListFilters {
  scope?: 'mine' | 'assigned' | 'all';
  status_key?: string;
  search?: string;
  page?: number;
}

export interface QueueFilters {
  sort?: QueueSort;
  urgency?: UrgencyLevel;
  category_id?: number;
  search?: string;
  page?: number;
}
