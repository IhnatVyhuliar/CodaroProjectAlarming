/** Serializers translating the demo dataset into API payloads, honouring visibility rules. */

import type {
  Assignment,
  AssigneeSummary,
  Attachment,
  Category,
  ClientSummary,
  DataScopeOption,
  HistoryEntry,
  Position,
  PositionSuggestion,
  ReportCapabilities,
  ReportDetail,
  ReportSummary,
  RequestDetail,
  RequestSummary,
  ScopedReportInfo,
  StatusRef,
  StatusTransitionOption,
  UserSummary,
  AppNotification,
  MediaStreamSession,
  StaffTaskSummary,
  StaffTaskDetail,
} from '../types';
import {
  mockState,
  type MockAssignment,
  type MockAttachment,
  type MockHistoryEntry,
  type MockNotification,
  type MockReport,
  type MockRequest,
  type MockSuggestion,
  type MockUser,
  type RoleToken,
} from './dataset';

export type Viewer = MockUser;

export function findUser(userId: number | null): MockUser | null {
  if (userId === null) {
    return null;
  }

  return mockState().users.find((user) => user.id === userId) ?? null;
}

export function positionRef(positionId: number | null): Position | null {
  if (positionId === null) {
    return null;
  }

  return mockState().positions.find((position) => position.id === positionId) ?? null;
}

export function categoryRef(categoryId: number | null): Category | null {
  if (categoryId === null) {
    return null;
  }

  return mockState().categories.find((category) => category.id === categoryId) ?? null;
}

export function dataScopeRef(key: string): DataScopeOption | null {
  return mockState().dataScopes.find((scope) => scope.key === key) ?? null;
}

export function statusRef(entityType: 'report' | 'request', key: string): StatusRef {
  const status = mockState().statuses.find(
    (candidate) => candidate.entity_type === entityType && candidate.key === key,
  );

  if (status === undefined) {
    throw new Error(`Nieznany status ${entityType}:${key}`);
  }

  return {
    id: status.id,
    key: status.key,
    label: status.label,
    description: status.description,
    color: status.color,
    is_final: status.is_final,
  };
}

export function userSummary(user: MockUser | null): UserSummary | null {
  if (user === null) {
    return null;
  }

  return { id: user.id, name: user.name, role: user.role };
}

export function clientSummary(report: MockReport, viewer: Viewer): ClientSummary | null {
  const client = findUser(report.client_id);

  if (client === null) {
    return null;
  }

  // Clients do not need their own contact card; dispatch roles do.
  if (viewer.role === 'client') {
    return { id: client.id, name: client.name, phone: null, email: null };
  }

  return { id: client.id, name: client.name, phone: client.phone, email: client.email };
}

export function isAssignmentActive(assignment: MockAssignment): boolean {
  return assignment.revoked_at === null && assignment.completed_at === null;
}

export function reportAssignments(reportId: number): MockAssignment[] {
  return mockState().assignments.filter((assignment) => assignment.report_id === reportId);
}

export function activeAssignmentsForUser(userId: number): MockAssignment[] {
  return mockState().assignments.filter(
    (assignment) =>
      assignment.assignee_type === 'staff' &&
      assignment.assignee_id === userId &&
      isAssignmentActive(assignment),
  );
}

function assigneeSummary(assignment: MockAssignment): AssigneeSummary {
  if (assignment.assignee_type === 'service') {
    const service = mockState().services.find((candidate) => candidate.id === assignment.assignee_id);

    return {
      id: assignment.assignee_id,
      type: 'service',
      display_name: service?.name ?? 'Służba zewnętrzna',
      position: positionRef(assignment.position_id),
      organization_name: service?.name ?? null,
      avatar_url: null,
      contact_channel: null,
      participation_status: isAssignmentActive(assignment) ? 'Uczestniczy' : 'Zakończony udział',
    };
  }

  const staff = findUser(assignment.assignee_id);

  return {
    id: assignment.assignee_id,
    type: 'staff',
    display_name: staff?.name ?? 'Pracownik',
    position: positionRef(assignment.position_id ?? staff?.position_id ?? null),
    organization_name: staff?.organization_name ?? null,
    avatar_url: staff?.avatar_url ?? null,
    contact_channel: staff?.contact_channel ?? null,
    participation_status: isAssignmentActive(assignment) ? 'Uczestniczy' : 'Zakończony udział',
  };
}

export function serializeAssignment(assignment: MockAssignment): Assignment {
  return {
    id: assignment.id,
    report_id: assignment.report_id,
    request_id: assignment.request_id,
    scope: assignment.request_id === null ? 'report' : 'request',
    assignee: assigneeSummary(assignment),
    position: positionRef(assignment.position_id),
    data_scope: dataScopeRef(assignment.data_scope),
    instruction: assignment.instruction,
    assigned_by: userSummary(findUser(assignment.assigned_by_admin_id)),
    assigned_at: assignment.assigned_at,
    revoked_at: assignment.revoked_at,
    completed_at: assignment.completed_at,
    is_active: isAssignmentActive(assignment),
  };
}

/**
 * Assignments a viewer is allowed to see. A client only ever receives *active*
 * assignments — historical assignees stay in the admin audit trail only.
 */
export function visibleAssignments(reportId: number, viewer: Viewer): Assignment[] {
  const all = reportAssignments(reportId);

  if (viewer.role === 'client') {
    return all.filter(isAssignmentActive).map(serializeAssignment);
  }

  if (viewer.role === 'staff') {
    return all
      .filter(
        (assignment) =>
          isAssignmentActive(assignment) &&
          assignment.assignee_type === 'staff' &&
          assignment.assignee_id === viewer.id,
      )
      .map(serializeAssignment);
  }

  return all.map(serializeAssignment);
}

export function serializeSuggestion(suggestion: MockSuggestion): PositionSuggestion {
  const position = positionRef(suggestion.position_id);

  if (position === null) {
    throw new Error(`Nieznane stanowisko ${suggestion.position_id}`);
  }

  return {
    id: suggestion.id,
    report_id: suggestion.report_id,
    request_id: suggestion.request_id,
    position,
    status: suggestion.status,
    note: suggestion.note,
    created_at: suggestion.created_at,
    reviewed_at: suggestion.reviewed_at,
    reviewed_by: userSummary(findUser(suggestion.reviewed_by_admin_id)),
    resulting_position: positionRef(suggestion.resulting_position_id),
  };
}

export function serializeAttachment(attachment: MockAttachment): Attachment {
  return {
    id: attachment.id,
    report_id: attachment.report_id,
    request_id: attachment.request_id,
    type: attachment.type,
    name: attachment.name,
    url: null,
    mime_type: attachment.mime_type,
    size: attachment.size,
    created_at: attachment.created_at,
    uploaded_by: userSummary(findUser(attachment.uploaded_by_id)),
  };
}

export function serializeHistoryEntry(entry: MockHistoryEntry): HistoryEntry {
  const entityType = entry.request_id === null ? 'report' : 'request';

  return {
    id: entry.id,
    scope: entry.scope,
    request_id: entry.request_id,
    label: entry.label,
    description: entry.description,
    actor: userSummary(findUser(entry.actor_id)),
    created_at: entry.created_at,
    from_status:
      entry.from_status_key === null ? null : statusRef(entityType, entry.from_status_key),
    to_status: entry.to_status_key === null ? null : statusRef(entityType, entry.to_status_key),
  };
}

export function serializeNotification(notification: MockNotification): AppNotification {
  return {
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    created_at: notification.created_at,
    read_at: notification.read_at,
    target: {
      report_id: notification.report_id,
      request_id: notification.request_id,
      assignment_id: notification.assignment_id,
    },
  };
}

export function serializeMediaSession(reportId: number): MediaStreamSession[] {
  return mockState()
    .mediaSessions.filter((session) => session.report_id === reportId)
    .map((session) => ({
      id: session.id,
      report_id: session.report_id,
      kind: session.kind,
      started_at: session.started_at,
      ended_at: session.ended_at,
      is_live: session.ended_at === null,
    }));
}

export function requestsOfReport(reportId: number): MockRequest[] {
  return mockState().requests.filter((request) => request.report_id === reportId);
}

export function suggestionsOfReport(reportId: number): MockSuggestion[] {
  return mockState().suggestions.filter((suggestion) => suggestion.report_id === reportId);
}

export function attachmentsOfReport(reportId: number): MockAttachment[] {
  return mockState().attachments.filter((attachment) => attachment.report_id === reportId);
}

export function historyOfReport(reportId: number): MockHistoryEntry[] {
  return mockState()
    .history.filter((entry) => entry.report_id === reportId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function serializeRequestSummary(request: MockRequest): RequestSummary {
  const suggestion = mockState().suggestions.find(
    (candidate) => candidate.request_id === request.id,
  );

  return {
    id: request.id,
    report_id: request.report_id,
    name: request.name,
    description: request.description,
    status: statusRef('request', request.status_key),
    created_at: request.created_at,
    suggested_position: suggestion === undefined ? null : positionRef(suggestion.position_id),
    active_assignments_count: mockState().assignments.filter(
      (assignment) => assignment.request_id === request.id && isAssignmentActive(assignment),
    ).length,
  };
}

export function capabilitiesFor(report: MockReport, viewer: Viewer): ReportCapabilities {
  const isFinal = statusRef('report', report.status_key).is_final;
  const isOwner = viewer.role === 'client' && viewer.id === report.client_id;
  const isDispatch = viewer.role === 'admin' || viewer.role === 'super_admin';

  return {
    can_add_attachment: !isFinal && (isOwner || isDispatch || viewer.role === 'staff'),
    can_add_note: !isFinal && (isOwner || isDispatch || viewer.role === 'staff'),
    can_suggest_position: !isFinal && isOwner,
    can_manage_assignments: !isFinal && isDispatch,
    can_create_request: !isFinal && (isOwner || isDispatch),
    can_close: !isFinal && (isOwner || isDispatch),
  };
}

export function serializeReportSummary(report: MockReport, viewer: Viewer): ReportSummary {
  const requests = requestsOfReport(report.id);
  const activeAssignments = reportAssignments(report.id).filter(isAssignmentActive);

  return {
    id: report.id,
    name: report.name,
    description: report.description,
    category: categoryRef(report.category_id),
    urgency: report.urgency,
    is_entrapment: report.is_entrapment,
    site_address: report.site_address,
    device_label: report.device_label,
    status: statusRef('report', report.status_key),
    created_at: report.created_at,
    updated_at: report.updated_at,
    closed_at: report.closed_at,
    requests_count: requests.length,
    open_requests_count: requests.filter(
      (request) => !statusRef('request', request.status_key).is_final,
    ).length,
    active_assignments_count: activeAssignments.length,
    handled_by_admin_only: activeAssignments.length === 0 && report.assigned_admin_id !== null,
    client: clientSummary(report, viewer),
    assigned_admin: userSummary(findUser(report.assigned_admin_id)),
    location: report.location === null ? null : { ...report.location, recorded_at: report.updated_at },
    location_mode: report.location_mode,
    has_live_stream: serializeMediaSession(report.id).some((session) => session.is_live),
  };
}

export function serializeReportDetail(report: MockReport, viewer: Viewer): ReportDetail {
  return {
    ...serializeReportSummary(report, viewer),
    requests: requestsOfReport(report.id).map(serializeRequestSummary),
    position_suggestions: suggestionsOfReport(report.id).map(serializeSuggestion),
    assignments: visibleAssignments(report.id, viewer),
    attachments: attachmentsOfReport(report.id).map(serializeAttachment),
    media_sessions: serializeMediaSession(report.id),
    capabilities: capabilitiesFor(report, viewer),
  };
}

export function serializeRequestDetail(request: MockRequest, viewer: Viewer): RequestDetail {
  const report = mockState().reports.find((candidate) => candidate.id === request.report_id);

  if (report === undefined) {
    throw new Error(`Brak zgłoszenia dla requesta ${request.id}`);
  }

  const assignments = mockState()
    .assignments.filter((assignment) => assignment.request_id === request.id)
    .filter((assignment) => {
      if (viewer.role === 'client') {
        return isAssignmentActive(assignment);
      }
      if (viewer.role === 'staff') {
        return (
          isAssignmentActive(assignment) &&
          assignment.assignee_type === 'staff' &&
          assignment.assignee_id === viewer.id
        );
      }

      return true;
    })
    .map(serializeAssignment);

  return {
    ...serializeRequestSummary(request),
    assignments,
    position_suggestions: mockState()
      .suggestions.filter((suggestion) => suggestion.request_id === request.id)
      .map(serializeSuggestion),
    attachments: mockState()
      .attachments.filter((attachment) => attachment.request_id === request.id)
      .map(serializeAttachment),
    capabilities: capabilitiesFor(report, viewer),
    report: {
      id: report.id,
      name: report.name,
      status: statusRef('report', report.status_key),
      category: categoryRef(report.category_id),
      client: clientSummary(report, viewer),
    },
  };
}

export function scopedReportInfo(report: MockReport, viewer: Viewer, dataScope: string): ScopedReportInfo {
  return {
    id: report.id,
    name: report.name,
    description: dataScope === 'minimal' ? null : report.description,
    category: categoryRef(report.category_id),
    urgency: report.urgency,
    is_entrapment: report.is_entrapment,
    // The field team always needs to know where to go, even at the minimal scope.
    site_address: report.site_address,
    device_label: report.device_label,
    status: statusRef('report', report.status_key),
    client: dataScope === 'report_full' ? clientSummary(report, viewer) : null,
    created_at: report.created_at,
  };
}

export function serializeStaffTaskSummary(assignment: MockAssignment): StaffTaskSummary {
  const state = mockState();
  const report = state.reports.find((candidate) => candidate.id === assignment.report_id);

  if (report === undefined) {
    throw new Error(`Brak zgłoszenia ${assignment.report_id}`);
  }

  const request =
    assignment.request_id === null
      ? null
      : (state.requests.find((candidate) => candidate.id === assignment.request_id) ?? null);

  return {
    assignment: serializeAssignment(assignment),
    scope: assignment.request_id === null ? 'report' : 'request',
    title: request === null ? report.name : request.name,
    position_name: positionRef(assignment.position_id)?.name ?? null,
    status:
      request === null
        ? statusRef('report', report.status_key)
        : statusRef('request', request.status_key),
    report: {
      id: report.id,
      name: report.name,
      category: categoryRef(report.category_id),
      urgency: report.urgency,
      is_entrapment: report.is_entrapment,
      site_address: report.site_address,
      device_label: report.device_label,
    },
    request: request === null ? null : { id: request.id, name: request.name },
    updated_at: report.updated_at,
  };
}

export function serializeStaffTaskDetail(assignment: MockAssignment, viewer: Viewer): StaffTaskDetail {
  const state = mockState();
  const report = state.reports.find((candidate) => candidate.id === assignment.report_id);

  if (report === undefined) {
    throw new Error(`Brak zgłoszenia ${assignment.report_id}`);
  }

  const request =
    assignment.request_id === null
      ? null
      : (state.requests.find((candidate) => candidate.id === assignment.request_id) ?? null);

  // Request-scoped assignments never leak sibling requests or their attachments.
  const attachments = attachmentsOfReport(report.id).filter((attachment) => {
    if (assignment.request_id === null) {
      return true;
    }

    return attachment.request_id === assignment.request_id || attachment.request_id === null;
  });

  const history = historyOfReport(report.id).filter((entry) => {
    if (assignment.request_id === null) {
      return true;
    }

    return entry.request_id === assignment.request_id;
  });

  return {
    assignment: serializeAssignment(assignment),
    scope: assignment.request_id === null ? 'report' : 'request',
    title: request === null ? report.name : request.name,
    description: request === null ? report.description : request.description,
    position_name: positionRef(assignment.position_id)?.name ?? null,
    status:
      request === null
        ? statusRef('report', report.status_key)
        : statusRef('request', request.status_key),
    report: scopedReportInfo(report, viewer, assignment.data_scope),
    request: request === null ? null : serializeRequestSummary(request),
    attachments: attachments.map(serializeAttachment),
    history: history.map(serializeHistoryEntry),
    location: assignment.data_scope === 'minimal' || report.location === null
      ? null
      : { ...report.location, recorded_at: report.updated_at },
    capabilities: { can_add_note: true, can_add_attachment: true },
  };
}

/** Which role token the viewer acts as for a given report/request. */
export function roleTokensFor(
  viewer: Viewer,
  report: MockReport,
  requestId: number | null,
): RoleToken[] {
  if (viewer.role === 'admin') {
    return ['admin'];
  }
  if (viewer.role === 'super_admin') {
    return ['super_admin'];
  }
  if (viewer.role === 'client') {
    return viewer.id === report.client_id ? ['client'] : [];
  }

  const assignments = activeAssignmentsForUser(viewer.id).filter(
    (assignment) => assignment.report_id === report.id,
  );

  if (assignments.length === 0) {
    return [];
  }

  if (requestId === null) {
    // Only a report-wide assignment grants report-level actions.
    return assignments.some((assignment) => assignment.request_id === null) ? ['staff'] : [];
  }

  return assignments.some(
    (assignment) => assignment.request_id === null || assignment.request_id === requestId,
  )
    ? ['staff']
    : [];
}

export function availableTransitions(
  entityType: 'report' | 'request',
  currentStatusKey: string,
  tokens: RoleToken[],
): StatusTransitionOption[] {
  return mockState()
    .transitions.filter(
      (transition) =>
        transition.entity_type === entityType &&
        transition.from_status_key === currentStatusKey &&
        transition.allowed_roles.some((role) => tokens.includes(role)),
    )
    .map((transition) => {
      const target = statusRef(entityType, transition.to_status_key);

      return {
        id: transition.id,
        to_status_id: target.id,
        key: target.key,
        label: target.label,
        description: target.description,
        color: target.color,
        requires_confirmation: transition.requires_confirmation,
        requires_note: transition.requires_note,
        requires_attachment: transition.requires_attachment,
      };
    });
}
