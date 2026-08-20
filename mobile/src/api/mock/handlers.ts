/** Route handlers for the development-only mock API. */

import type {
  AdminDashboard,
  AssigneeType,
  AuthenticatedUser,
  ClientDashboard,
  CreateAssignmentPayload,
  CreateReportPayload,
  NewRequestDraft,
  Paginated,
  QueueSort,
  ReportSummary,
  StatusChangePayload,
  SuggestionDecision,
  UrgencyLevel,
} from '../types';
import {
  mockState,
  nextId,
  nowIso,
  type MockAssignment,
  type MockReport,
  type MockRequest,
  type MockUser,
} from './dataset';
import {
  activeAssignmentsForUser,
  attachmentsOfReport,
  availableTransitions,
  findUser,
  historyOfReport,
  isAssignmentActive,
  positionRef,
  reportAssignments,
  roleTokensFor,
  serializeAssignment,
  serializeAttachment,
  serializeHistoryEntry,
  serializeNotification,
  serializeReportDetail,
  serializeReportSummary,
  serializeRequestDetail,
  serializeStaffTaskDetail,
  serializeStaffTaskSummary,
  serializeSuggestion,
  statusRef,
  suggestionsOfReport,
  visibleAssignments,
} from './serializers';

export interface MockRequestContext {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  token: string | null;
}

export interface MockResponse {
  status: number;
  data: unknown;
}

export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'MockHttpError';
  }
}

const PER_PAGE = 15;

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function viewerOrFail(context: MockRequestContext): MockUser {
  const state = mockState();
  const userId = context.token === null ? undefined : state.tokens[context.token];
  const user = userId === undefined ? null : findUser(userId);

  if (user === null) {
    throw new MockHttpError(401, 'Sesja wygasła. Zaloguj się ponownie.');
  }

  return user;
}

function dispatchOrFail(context: MockRequestContext): MockUser {
  const viewer = viewerOrFail(context);

  if (viewer.role !== 'admin' && viewer.role !== 'super_admin') {
    throw new MockHttpError(403, 'Brak uprawnień do tej operacji.');
  }

  return viewer;
}

function reportOrFail(reportId: number): MockReport {
  const report = mockState().reports.find((candidate) => candidate.id === reportId);

  if (report === undefined) {
    throw new MockHttpError(404, 'Nie znaleziono zgłoszenia.');
  }

  return report;
}

function requestOrFail(requestId: number): MockRequest {
  const request = mockState().requests.find((candidate) => candidate.id === requestId);

  if (request === undefined) {
    throw new MockHttpError(404, 'Nie znaleziono zadania.');
  }

  return request;
}

function assignmentOrFail(assignmentId: number): MockAssignment {
  const assignment = mockState().assignments.find((candidate) => candidate.id === assignmentId);

  if (assignment === undefined) {
    throw new MockHttpError(404, 'Nie znaleziono przydziału.');
  }

  return assignment;
}

/** Mirrors the backend policy: who may read a report at all. */
function assertCanViewReport(report: MockReport, viewer: MockUser): void {
  if (viewer.role === 'admin' || viewer.role === 'super_admin') {
    return;
  }

  if (viewer.role === 'client') {
    if (viewer.id !== report.client_id) {
      throw new MockHttpError(403, 'Brak dostępu do tego zgłoszenia.');
    }

    return;
  }

  const hasReportWideAssignment = activeAssignmentsForUser(viewer.id).some(
    (assignment) => assignment.report_id === report.id && assignment.request_id === null,
  );

  if (!hasReportWideAssignment) {
    throw new MockHttpError(403, 'Brak dostępu do danych całego zgłoszenia.');
  }
}

function assertCanViewRequest(request: MockRequest, viewer: MockUser): void {
  const report = reportOrFail(request.report_id);

  if (viewer.role === 'admin' || viewer.role === 'super_admin') {
    return;
  }

  if (viewer.role === 'client') {
    if (viewer.id !== report.client_id) {
      throw new MockHttpError(403, 'Brak dostępu do tego zadania.');
    }

    return;
  }

  const covered = activeAssignmentsForUser(viewer.id).some(
    (assignment) =>
      assignment.report_id === report.id &&
      (assignment.request_id === null || assignment.request_id === request.id),
  );

  if (!covered) {
    throw new MockHttpError(403, 'Brak dostępu do tego zadania.');
  }
}

function addHistory(entry: {
  report_id: number;
  request_id: number | null;
  scope: 'report' | 'request' | 'assignment';
  label: string;
  description?: string | null;
  actor_id: number | null;
  from_status_key?: string | null;
  to_status_key?: string | null;
}): void {
  mockState().history.push({
    id: nextId('history'),
    report_id: entry.report_id,
    request_id: entry.request_id,
    scope: entry.scope,
    label: entry.label,
    description: entry.description ?? null,
    actor_id: entry.actor_id,
    from_status_key: entry.from_status_key ?? null,
    to_status_key: entry.to_status_key ?? null,
    created_at: nowIso(),
  });
}

function notify(
  userIds: number[],
  payload: {
    kind: string;
    title: string;
    body: string | null;
    report_id: number | null;
    request_id?: number | null;
    assignment_id?: number | null;
  },
): void {
  const unique = Array.from(new Set(userIds));

  unique.forEach((userId) => {
    mockState().notifications.push({
      id: `n-${nextId('notification')}`,
      user_id: userId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      read_at: null,
      created_at: nowIso(),
      report_id: payload.report_id,
      request_id: payload.request_id ?? null,
      assignment_id: payload.assignment_id ?? null,
    });
  });
}

/** Recipients per spec §11: client, handling admin and currently assigned people. */
function recipientsFor(report: MockReport, requestId: number | null): number[] {
  const recipients: number[] = [report.client_id];

  if (report.assigned_admin_id !== null) {
    recipients.push(report.assigned_admin_id);
  }

  reportAssignments(report.id)
    .filter(isAssignmentActive)
    .filter((assignment) => assignment.assignee_type === 'staff')
    .filter(
      (assignment) =>
        requestId === null || assignment.request_id === null || assignment.request_id === requestId,
    )
    .forEach((assignment) => recipients.push(assignment.assignee_id));

  return recipients;
}

function adminUserIds(): number[] {
  return mockState()
    .users.filter((user) => user.role === 'admin' || user.role === 'super_admin')
    .map((user) => user.id);
}

function authUser(user: MockUser): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    position: positionRef(user.position_id),
    organization_name: user.organization_name,
  };
}

function paginate<T>(items: T[], page: number): Paginated<T> {
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const start = (currentPage - 1) * PER_PAGE;

  return {
    data: items.slice(start, start + PER_PAGE),
    meta: {
      current_page: currentPage,
      last_page: Math.max(1, Math.ceil(items.length / PER_PAGE)),
      per_page: PER_PAGE,
      total: items.length,
    },
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

function initialStatusKey(entityType: 'report' | 'request'): string {
  const status = mockState().statuses.find(
    (candidate) => candidate.entity_type === entityType && candidate.is_initial,
  );

  if (status === undefined) {
    throw new MockHttpError(500, 'Brak statusu początkowego w konfiguracji.');
  }

  return status.key;
}

function aiScore(report: MockReport): number {
  // People stuck in a cabin outrank everything else in this domain.
  const entrapmentWeight = report.is_entrapment ? 10 : 0;
  const hasLocation = report.location === null ? 0 : 1;

  return URGENCY_RANK[report.urgency] * 2 + entrapmentWeight + hasLocation;
}

function sortQueue(reports: MockReport[], sort: QueueSort): MockReport[] {
  const byCreatedAt = (left: MockReport, right: MockReport): number =>
    left.created_at.localeCompare(right.created_at);

  if (sort === 'client_priority') {
    return [...reports].sort(
      (left, right) =>
        URGENCY_RANK[right.urgency] - URGENCY_RANK[left.urgency] || byCreatedAt(left, right),
    );
  }

  if (sort === 'ai_priority') {
    return [...reports].sort(
      (left, right) => aiScore(right) - aiScore(left) || byCreatedAt(left, right),
    );
  }

  return [...reports].sort(byCreatedAt);
}

function changeReportStatus(
  report: MockReport,
  viewer: MockUser,
  payload: StatusChangePayload,
): void {
  const tokens = roleTokensFor(viewer, report, null);
  const options = availableTransitions('report', report.status_key, tokens);
  const chosen = options.find((option) => option.to_status_id === payload.to_status_id);

  if (chosen === undefined) {
    throw new MockHttpError(422, 'To przejście statusu jest niedostępne.', {
      to_status_id: ['Niedozwolone przejście statusu.'],
    });
  }

  if (chosen.requires_note && asString(payload.note).trim().length === 0) {
    throw new MockHttpError(422, 'Ta zmiana statusu wymaga notatki.', {
      note: ['Notatka jest wymagana dla tej zmiany statusu.'],
    });
  }

  if (chosen.requires_attachment && (payload.attachment_ids ?? []).length === 0) {
    throw new MockHttpError(422, 'Ta zmiana statusu wymaga załącznika.', {
      attachment_ids: ['Załącznik jest wymagany dla tej zmiany statusu.'],
    });
  }

  const fromStatusKey = report.status_key;

  report.status_key = chosen.key;
  report.updated_at = nowIso();

  if (statusRef('report', chosen.key).is_final) {
    report.closed_at = report.closed_at ?? nowIso();
  }

  addHistory({
    report_id: report.id,
    request_id: null,
    scope: 'report',
    label: 'Zmiana statusu zgłoszenia',
    description: asString(payload.note).trim().length > 0 ? asString(payload.note) : null,
    actor_id: viewer.id,
    from_status_key: fromStatusKey,
    to_status_key: chosen.key,
  });

  notify(recipientsFor(report, null), {
    kind: 'report.status_changed',
    title: `Zmiana statusu zgłoszenia: ${chosen.label}`,
    body: report.name,
    report_id: report.id,
  });
}

function changeRequestStatus(
  request: MockRequest,
  viewer: MockUser,
  payload: StatusChangePayload,
): void {
  const report = reportOrFail(request.report_id);
  const tokens = roleTokensFor(viewer, report, request.id);
  const options = availableTransitions('request', request.status_key, tokens);
  const chosen = options.find((option) => option.to_status_id === payload.to_status_id);

  if (chosen === undefined) {
    throw new MockHttpError(422, 'To przejście statusu jest niedostępne.', {
      to_status_id: ['Niedozwolone przejście statusu.'],
    });
  }

  if (chosen.requires_note && asString(payload.note).trim().length === 0) {
    throw new MockHttpError(422, 'Ta zmiana statusu wymaga notatki.', {
      note: ['Notatka jest wymagana dla tej zmiany statusu.'],
    });
  }

  if (chosen.requires_attachment && (payload.attachment_ids ?? []).length === 0) {
    throw new MockHttpError(422, 'Ta zmiana statusu wymaga załącznika.', {
      attachment_ids: ['Załącznik jest wymagany dla tej zmiany statusu.'],
    });
  }

  const fromStatusKey = request.status_key;

  request.status_key = chosen.key;
  report.updated_at = nowIso();

  addHistory({
    report_id: report.id,
    request_id: request.id,
    scope: 'request',
    label: 'Zmiana statusu zadania',
    description: asString(payload.note).trim().length > 0 ? asString(payload.note) : null,
    actor_id: viewer.id,
    from_status_key: fromStatusKey,
    to_status_key: chosen.key,
  });

  notify(recipientsFor(report, request.id), {
    kind: 'request.status_changed',
    title: `Zmiana statusu zadania: ${chosen.label}`,
    body: request.name,
    report_id: report.id,
    request_id: request.id,
  });
}

function reviewMatchingSuggestion(
  reportId: number,
  requestId: number | null,
  positionId: number | null,
  adminId: number,
): void {
  const suggestion = mockState().suggestions.find(
    (candidate) =>
      candidate.report_id === reportId &&
      candidate.request_id === requestId &&
      candidate.status === 'pending',
  );

  if (suggestion === undefined) {
    return;
  }

  suggestion.reviewed_by_admin_id = adminId;
  suggestion.reviewed_at = nowIso();
  suggestion.resulting_position_id = positionId;
  suggestion.status = suggestion.position_id === positionId ? 'accepted' : 'replaced';
}

function createAssignment(
  report: MockReport,
  viewer: MockUser,
  payload: CreateAssignmentPayload,
): MockAssignment {
  const assigneeType: AssigneeType = payload.assignee_type === 'service' ? 'service' : 'staff';
  const assigneeId = asNumberOrNull(payload.assignee_id);

  if (assigneeId === null) {
    throw new MockHttpError(422, 'Wskaż wykonawcę.', {
      assignee_id: ['Wybierz pracownika lub służbę.'],
    });
  }

  if (assigneeType === 'staff' && findUser(assigneeId)?.role !== 'staff') {
    throw new MockHttpError(422, 'Nieznany pracownik.', {
      assignee_id: ['Nieznany pracownik.'],
    });
  }

  if (
    assigneeType === 'service' &&
    !mockState().services.some((service) => service.id === assigneeId)
  ) {
    throw new MockHttpError(422, 'Nieznana służba.', { assignee_id: ['Nieznana służba.'] });
  }

  if (payload.request_id !== null) {
    const request = requestOrFail(payload.request_id);

    if (request.report_id !== report.id) {
      throw new MockHttpError(422, 'Zadanie nie należy do tego zgłoszenia.', {
        request_id: ['Zadanie nie należy do tego zgłoszenia.'],
      });
    }
  }

  const dataScope = mockState().dataScopes.some((scope) => scope.key === payload.data_scope)
    ? payload.data_scope
    : (mockState().dataScopes[0]?.key ?? 'minimal');

  const assignment: MockAssignment = {
    id: nextId('assignment'),
    report_id: report.id,
    request_id: payload.request_id,
    assignee_type: assigneeType,
    assignee_id: assigneeId,
    position_id: payload.position_id,
    data_scope: dataScope,
    instruction:
      payload.instruction === null || payload.instruction.trim().length === 0
        ? null
        : payload.instruction.trim(),
    assigned_by_admin_id: viewer.id,
    assigned_at: nowIso(),
    revoked_at: null,
    completed_at: null,
  };

  mockState().assignments.push(assignment);

  if (report.assigned_admin_id === null) {
    report.assigned_admin_id = viewer.id;
  }

  report.updated_at = nowIso();

  reviewMatchingSuggestion(report.id, payload.request_id, payload.position_id, viewer.id);

  const serialized = serializeAssignment(assignment);

  addHistory({
    report_id: report.id,
    request_id: payload.request_id,
    scope: 'assignment',
    label: `Przypisano wykonawcę: ${serialized.assignee.display_name}`,
    description: serialized.position === null ? null : `Stanowisko: ${serialized.position.name}.`,
    actor_id: viewer.id,
  });

  const recipients = [report.client_id];

  if (assigneeType === 'staff') {
    recipients.push(assigneeId);
  }

  notify(recipients, {
    kind: 'assignment.created',
    title: `Nowy przydział: ${serialized.assignee.display_name}`,
    body: report.name,
    report_id: report.id,
    request_id: payload.request_id,
    assignment_id: assignment.id,
  });

  return assignment;
}

function revokeAssignment(assignment: MockAssignment, viewer: MockUser, reason: string | null): void {
  if (!isAssignmentActive(assignment)) {
    throw new MockHttpError(422, 'Przydział jest już nieaktywny.');
  }

  assignment.revoked_at = nowIso();

  const report = reportOrFail(assignment.report_id);
  const serialized = serializeAssignment(assignment);

  report.updated_at = nowIso();

  addHistory({
    report_id: assignment.report_id,
    request_id: assignment.request_id,
    scope: 'assignment',
    label: `Cofnięto przydział: ${serialized.assignee.display_name}`,
    description: reason,
    actor_id: viewer.id,
  });

  const recipients = [report.client_id];

  if (assignment.assignee_type === 'staff') {
    recipients.push(assignment.assignee_id);
  }

  notify(recipients, {
    kind: 'assignment.revoked',
    title: `Cofnięto przydział: ${serialized.assignee.display_name}`,
    body: report.name,
    report_id: report.id,
    request_id: assignment.request_id,
    assignment_id: assignment.id,
  });
}

function createReport(viewer: MockUser, payload: CreateReportPayload): MockReport {
  if (asString(payload.name).trim().length === 0) {
    throw new MockHttpError(422, 'Dane w formularzu są nieprawidłowe.', {
      name: ['Podaj nazwę zgłoszenia.'],
    });
  }

  if (asString(payload.description).trim().length === 0) {
    throw new MockHttpError(422, 'Dane w formularzu są nieprawidłowe.', {
      description: ['Opisz zgłoszenie.'],
    });
  }

  const isEntrapment = payload.is_entrapment === true;
  const report: MockReport = {
    id: nextId('report'),
    client_id: viewer.id,
    category_id: payload.category_id,
    name: payload.name.trim(),
    description: payload.description.trim(),
    // An entrapment report is always critical, whatever the client picked.
    urgency: isEntrapment ? 'critical' : payload.urgency,
    is_entrapment: isEntrapment,
    site_address:
      payload.site_address === null || payload.site_address.trim().length === 0
        ? null
        : payload.site_address.trim(),
    device_label:
      payload.device_label === null || payload.device_label.trim().length === 0
        ? null
        : payload.device_label.trim(),
    status_key: initialStatusKey('report'),
    location: payload.location,
    location_mode: payload.location_mode,
    assigned_admin_id: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    closed_at: null,
  };

  mockState().reports.push(report);

  addHistory({
    report_id: report.id,
    request_id: null,
    scope: 'report',
    label: 'Zgłoszenie utworzone',
    actor_id: viewer.id,
    to_status_key: report.status_key,
  });

  if (payload.suggested_position_id !== null) {
    mockState().suggestions.push({
      id: nextId('suggestion'),
      report_id: report.id,
      request_id: null,
      position_id: payload.suggested_position_id,
      suggested_by_client_id: viewer.id,
      status: 'pending',
      reviewed_by_admin_id: null,
      reviewed_at: null,
      note: null,
      resulting_position_id: null,
      created_at: nowIso(),
    });
  }

  payload.requests.forEach((draft: NewRequestDraft) => {
    const request: MockRequest = {
      id: nextId('request'),
      report_id: report.id,
      name: draft.name,
      description: draft.description,
      status_key: initialStatusKey('request'),
      created_at: nowIso(),
    };

    mockState().requests.push(request);

    addHistory({
      report_id: report.id,
      request_id: request.id,
      scope: 'request',
      label: 'Zadanie utworzone',
      actor_id: viewer.id,
      to_status_key: request.status_key,
    });

    if (draft.suggested_position_id !== null) {
      mockState().suggestions.push({
        id: nextId('suggestion'),
        report_id: report.id,
        request_id: request.id,
        position_id: draft.suggested_position_id,
        suggested_by_client_id: viewer.id,
        status: 'pending',
        reviewed_by_admin_id: null,
        reviewed_at: null,
        note: null,
        resulting_position_id: null,
        created_at: nowIso(),
      });
    }
  });

  notify(adminUserIds(), {
    kind: 'report.created',
    title: isEntrapment ? 'UWIĘZIENIE — nowe zgłoszenie w kolejce' : 'Nowe zgłoszenie w kolejce',
    body: [report.name, report.site_address, report.device_label]
      .filter((part): part is string => part !== null)
      .join(' · '),
    report_id: report.id,
  });

  return report;
}

interface Route {
  method: MockRequestContext['method'];
  pattern: RegExp;
  handle: (context: MockRequestContext, params: string[]) => MockResponse;
}

function ok(data: unknown, status = 200): MockResponse {
  return { status, data };
}

function envelope(data: unknown, status = 200): MockResponse {
  return { status, data: { data } };
}

const routes: Route[] = [
  {
    method: 'get',
    pattern: /^\/health$/,
    handle: () => ok({ status: 'ok' }),
  },
  {
    method: 'post',
    pattern: /^\/auth\/login$/,
    handle: (context) => {
      const email = asString(context.body.email).trim().toLowerCase();
      const password = asString(context.body.password);
      const user = mockState().users.find((candidate) => candidate.email === email);

      if (user === undefined || user.password !== password) {
        throw new MockHttpError(422, 'Nieprawidłowy e-mail lub hasło.', {
          email: ['Nieprawidłowy e-mail lub hasło.'],
        });
      }

      const token = `mock-token-${nextId('token')}`;

      mockState().tokens[token] = user.id;

      return ok({ token, user: authUser(user) });
    },
  },
  {
    method: 'post',
    pattern: /^\/auth\/logout$/,
    handle: (context) => {
      if (context.token !== null) {
        delete mockState().tokens[context.token];
      }

      return ok(null, 204);
    },
  },
  {
    method: 'get',
    pattern: /^\/auth\/me$/,
    handle: (context) => envelope(authUser(viewerOrFail(context))),
  },
  {
    method: 'post',
    pattern: /^\/auth\/forgot-password$/,
    handle: (context) => {
      const email = asString(context.body.email).trim();

      if (email.length === 0) {
        throw new MockHttpError(422, 'Podaj adres e-mail.', { email: ['Podaj adres e-mail.'] });
      }

      return ok({ message: 'Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.' });
    },
  },
  {
    method: 'get',
    pattern: /^\/status-definitions$/,
    handle: (context) => {
      viewerOrFail(context);

      const entityType = context.query.get('entity_type') === 'request' ? 'request' : 'report';

      return envelope(
        mockState()
          .statuses.filter((status) => status.entity_type === entityType)
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((status) => ({
            id: status.id,
            key: status.key,
            label: status.label,
            description: status.description,
            color: status.color,
            is_final: status.is_final,
          })),
      );
    },
  },
  {
    method: 'get',
    pattern: /^\/categories$/,
    handle: (context) => {
      viewerOrFail(context);

      return envelope(mockState().categories);
    },
  },
  {
    method: 'get',
    pattern: /^\/positions$/,
    handle: (context) => {
      viewerOrFail(context);

      return envelope(mockState().positions.filter((position) => position.is_active));
    },
  },
  {
    method: 'get',
    pattern: /^\/assignment-data-scopes$/,
    handle: (context) => {
      dispatchOrFail(context);

      return envelope(mockState().dataScopes);
    },
  },
  {
    method: 'get',
    pattern: /^\/client\/dashboard$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);
      const reports = mockState().reports.filter((report) => report.client_id === viewer.id);
      const active = reports.filter((report) => !statusRef('report', report.status_key).is_final);
      const dashboard: ClientDashboard = {
        active_reports: active.map((report) => serializeReportSummary(report, viewer)),
        recent_changes: reports
          .flatMap((report) => historyOfReport(report.id))
          .sort((left, right) => right.created_at.localeCompare(left.created_at))
          .slice(0, 8)
          .map(serializeHistoryEntry),
        unread_notifications: mockState().notifications.filter(
          (notification) => notification.user_id === viewer.id && notification.read_at === null,
        ).length,
        live_streams: active.flatMap((report) =>
          serializeReportSummary(report, viewer).has_live_stream
            ? [
                {
                  id: report.id,
                  report_id: report.id,
                  kind: report.location_mode === 'streaming' ? ('location' as const) : ('camera' as const),
                  started_at: report.updated_at,
                  ended_at: null,
                  is_live: true,
                },
              ]
            : [],
        ),
      };

      return envelope(dashboard);
    },
  },
  {
    method: 'get',
    pattern: /^\/admin\/dashboard$/,
    handle: (context) => {
      const viewer = dispatchOrFail(context);
      const queue = mockState().reports.filter((report) => report.status_key === 'new');
      const handled = mockState().reports.filter(
        (report) =>
          report.assigned_admin_id === viewer.id &&
          !statusRef('report', report.status_key).is_final,
      );
      const oldest = sortQueue(queue, 'fifo')[0];
      const dashboard: AdminDashboard = {
        queue: {
          total: queue.length,
          by_urgency: {
            critical: queue.filter((report) => report.urgency === 'critical').length,
            high: queue.filter((report) => report.urgency === 'high').length,
            medium: queue.filter((report) => report.urgency === 'medium').length,
            low: queue.filter((report) => report.urgency === 'low').length,
          },
          oldest_waiting_minutes:
            oldest === undefined
              ? null
              : Math.max(
                  0,
                  Math.round((Date.now() - Date.parse(oldest.created_at)) / 60_000),
                ),
        },
        handled_reports: handled.map((report) => serializeReportSummary(report, viewer)),
        pending_suggestions: mockState()
          .suggestions.filter((suggestion) => suggestion.status === 'pending')
          .map(serializeSuggestion),
        active_assignments: mockState()
          .assignments.filter(isAssignmentActive)
          .map(serializeAssignment),
        unread_notifications: mockState().notifications.filter(
          (notification) => notification.user_id === viewer.id && notification.read_at === null,
        ).length,
      };

      return envelope(dashboard);
    },
  },
  {
    method: 'get',
    pattern: /^\/reports$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);
      const scope = context.query.get('scope') ?? 'mine';
      const statusKey = context.query.get('status_key');
      const search = (context.query.get('search') ?? '').trim().toLowerCase();

      let reports = mockState().reports;

      if (viewer.role === 'client') {
        reports = reports.filter((report) => report.client_id === viewer.id);
      } else if (viewer.role === 'staff') {
        const reportIds = new Set(
          activeAssignmentsForUser(viewer.id)
            .filter((assignment) => assignment.request_id === null)
            .map((assignment) => assignment.report_id),
        );

        reports = reports.filter((report) => reportIds.has(report.id));
      } else if (scope === 'mine') {
        reports = reports.filter((report) => report.assigned_admin_id === viewer.id);
      }

      if (statusKey !== null && statusKey.length > 0) {
        reports = reports.filter((report) => report.status_key === statusKey);
      }

      if (search.length > 0) {
        reports = reports.filter((report) =>
          [report.name, report.description, report.site_address, report.device_label]
            .filter((part): part is string => part !== null)
            .some((part) => part.toLowerCase().includes(search)),
        );
      }

      const sorted = [...reports].sort((left, right) =>
        right.updated_at.localeCompare(left.updated_at),
      );
      const page = Number(context.query.get('page') ?? '1');
      const paginated = paginate<ReportSummary>(
        sorted.map((report) => serializeReportSummary(report, viewer)),
        page,
      );

      return ok(paginated);
    },
  },
  {
    method: 'post',
    pattern: /^\/reports$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);

      if (viewer.role !== 'client') {
        throw new MockHttpError(403, 'Zgłoszenie może utworzyć wyłącznie klient.');
      }

      const report = createReport(viewer, context.body as unknown as CreateReportPayload);

      return envelope(serializeReportDetail(report, viewer), 201);
    },
  },
  {
    method: 'get',
    pattern: /^\/queue$/,
    handle: (context) => {
      const viewer = dispatchOrFail(context);
      const sort = (context.query.get('sort') ?? 'fifo') as QueueSort;
      const urgency = context.query.get('urgency');
      const categoryId = context.query.get('category_id');
      const search = (context.query.get('search') ?? '').trim().toLowerCase();

      let reports = mockState().reports.filter((report) => report.status_key === 'new');

      if (urgency !== null && urgency.length > 0) {
        reports = reports.filter((report) => report.urgency === urgency);
      }
      if (categoryId !== null && categoryId.length > 0) {
        reports = reports.filter((report) => report.category_id === Number(categoryId));
      }
      if (search.length > 0) {
        reports = reports.filter((report) =>
          [report.name, report.site_address, report.device_label]
            .filter((part): part is string => part !== null)
            .some((part) => part.toLowerCase().includes(search)),
        );
      }

      const page = Number(context.query.get('page') ?? '1');

      return ok(
        paginate<ReportSummary>(
          sortQueue(reports, sort).map((report) => serializeReportSummary(report, viewer)),
          page,
        ),
      );
    },
  },
  {
    method: 'post',
    pattern: /^\/queue\/(\d+)\/claim$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const report = reportOrFail(Number(params[0]));

      if (report.assigned_admin_id !== null && report.assigned_admin_id !== viewer.id) {
        throw new MockHttpError(422, 'Zgłoszenie jest już obsługiwane przez innego administratora.');
      }

      report.assigned_admin_id = viewer.id;

      const fromStatusKey = report.status_key;

      if (report.status_key === 'new') {
        report.status_key = 'accepted';
      }

      report.updated_at = nowIso();

      addHistory({
        report_id: report.id,
        request_id: null,
        scope: 'report',
        label: 'Zgłoszenie przyjęte przez administratora',
        actor_id: viewer.id,
        from_status_key: fromStatusKey,
        to_status_key: report.status_key,
      });

      notify(recipientsFor(report, null), {
        kind: 'report.status_changed',
        title: 'Zgłoszenie przyjęte do obsługi',
        body: report.name,
        report_id: report.id,
      });

      return envelope(serializeReportDetail(report, viewer));
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/assign-admin$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const report = reportOrFail(Number(params[0]));
      const adminId = asNumberOrNull(context.body.admin_id);
      const admin = adminId === null ? null : findUser(adminId);

      if (admin === null || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
        throw new MockHttpError(422, 'Nieznany administrator.', {
          admin_id: ['Wskaż administratora.'],
        });
      }

      report.assigned_admin_id = admin.id;
      report.updated_at = nowIso();

      addHistory({
        report_id: report.id,
        request_id: null,
        scope: 'report',
        label: `Zmiana opiekuna zgłoszenia: ${admin.name}`,
        actor_id: viewer.id,
      });

      notify([admin.id, report.client_id], {
        kind: 'report.admin_changed',
        title: 'Zmiana opiekuna zgłoszenia',
        body: report.name,
        report_id: report.id,
      });

      return envelope(serializeReportDetail(report, viewer));
    },
  },
  {
    method: 'get',
    pattern: /^\/reports\/(\d+)$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      return envelope(serializeReportDetail(report, viewer));
    },
  },
  {
    method: 'get',
    pattern: /^\/reports\/(\d+)\/history$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      return envelope(historyOfReport(report.id).map(serializeHistoryEntry));
    },
  },
  {
    method: 'get',
    pattern: /^\/reports\/(\d+)\/attachments$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      return envelope(attachmentsOfReport(report.id).map(serializeAttachment));
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/attachments$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      const attachment = {
        id: nextId('attachment'),
        report_id: report.id,
        request_id: asNumberOrNull(context.body.request_id),
        type: (asString(context.body.type) || 'file') as 'photo' | 'file' | 'audio' | 'video',
        name: asString(context.body.name) || 'zalacznik',
        mime_type: null,
        size: null,
        uploaded_by_id: viewer.id,
        created_at: nowIso(),
      };

      mockState().attachments.push(attachment);
      report.updated_at = nowIso();

      notify(recipientsFor(report, attachment.request_id), {
        kind: 'attachment.added',
        title: 'Nowy załącznik w zgłoszeniu',
        body: report.name,
        report_id: report.id,
        request_id: attachment.request_id,
      });

      return envelope(serializeAttachment(attachment), 201);
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/notes$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      const body = asString(context.body.body).trim();

      if (body.length === 0) {
        throw new MockHttpError(422, 'Treść notatki jest wymagana.', {
          body: ['Treść notatki jest wymagana.'],
        });
      }

      const requestId = asNumberOrNull(context.body.request_id);

      addHistory({
        report_id: report.id,
        request_id: requestId,
        scope: requestId === null ? 'report' : 'request',
        label: 'Notatka',
        description: body,
        actor_id: viewer.id,
      });

      notify(recipientsFor(report, requestId), {
        kind: 'note.added',
        title: 'Nowa notatka w zgłoszeniu',
        body: report.name,
        report_id: report.id,
        request_id: requestId,
      });

      const entry = historyOfReport(report.id)[0];

      return envelope(serializeHistoryEntry(entry), 201);
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/admin-only$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const report = reportOrFail(Number(params[0]));

      report.assigned_admin_id = report.assigned_admin_id ?? viewer.id;
      report.updated_at = nowIso();

      const note = asString(context.body.note).trim();

      addHistory({
        report_id: report.id,
        request_id: null,
        scope: 'report',
        label: 'Zgłoszenie realizowane wyłącznie przez administratora',
        description: note.length > 0 ? note : null,
        actor_id: viewer.id,
      });

      notify([report.client_id], {
        kind: 'report.admin_only',
        title: 'Zgłoszenie realizowane przez administratora',
        body: report.name,
        report_id: report.id,
      });

      return envelope(serializeReportDetail(report, viewer));
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/location-stream\/stop$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      mockState()
        .mediaSessions.filter((session) => session.report_id === report.id && session.ended_at === null)
        .forEach((session) => {
          session.ended_at = nowIso();
        });

      report.location_mode = report.location === null ? 'none' : 'one_time';
      report.updated_at = nowIso();

      addHistory({
        report_id: report.id,
        request_id: null,
        scope: 'report',
        label: 'Zakończono transmisję lokalizacji',
        actor_id: viewer.id,
      });

      notify(recipientsFor(report, null), {
        kind: 'stream.ended',
        title: 'Transmisja zakończona',
        body: report.name,
        report_id: report.id,
      });

      return envelope(serializeReportDetail(report, viewer));
    },
  },
  {
    method: 'get',
    pattern: /^\/reports\/(\d+)\/available-status-transitions$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      return envelope(
        availableTransitions('report', report.status_key, roleTokensFor(viewer, report, null)),
      );
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/status$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);
      changeReportStatus(report, viewer, context.body as unknown as StatusChangePayload);

      return envelope(serializeReportDetail(report, viewer));
    },
  },
  {
    method: 'get',
    pattern: /^\/reports\/(\d+)\/position-suggestions$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      return envelope(suggestionsOfReport(report.id).map(serializeSuggestion));
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/position-suggestions$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      if (viewer.role !== 'client' || viewer.id !== report.client_id) {
        throw new MockHttpError(403, 'Propozycję stanowiska może dodać wyłącznie klient.');
      }

      const positionId = asNumberOrNull(context.body.position_id);

      if (positionId === null || positionRef(positionId) === null) {
        throw new MockHttpError(422, 'Wybierz stanowisko.', {
          position_id: ['Wybierz stanowisko.'],
        });
      }

      const suggestion = {
        id: nextId('suggestion'),
        report_id: report.id,
        request_id: asNumberOrNull(context.body.request_id),
        position_id: positionId,
        suggested_by_client_id: viewer.id,
        status: 'pending' as const,
        reviewed_by_admin_id: null,
        reviewed_at: null,
        note: asString(context.body.note).trim().length > 0 ? asString(context.body.note) : null,
        resulting_position_id: null,
        created_at: nowIso(),
      };

      mockState().suggestions.push(suggestion);

      notify(adminUserIds(), {
        kind: 'suggestion.created',
        title: 'Nowa propozycja stanowiska',
        body: `${report.name}: ${positionRef(positionId)?.name ?? ''}`,
        report_id: report.id,
        request_id: suggestion.request_id,
      });

      return envelope(serializeSuggestion(suggestion), 201);
    },
  },
  {
    method: 'post',
    pattern: /^\/position-suggestions\/(\d+)\/review$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const suggestion = mockState().suggestions.find(
        (candidate) => candidate.id === Number(params[0]),
      );

      if (suggestion === undefined) {
        throw new MockHttpError(404, 'Nie znaleziono propozycji stanowiska.');
      }

      const decision = asString(context.body.decision) as SuggestionDecision;

      if (!['accepted', 'replaced', 'rejected'].includes(decision)) {
        throw new MockHttpError(422, 'Nieznana decyzja.', { decision: ['Nieznana decyzja.'] });
      }

      suggestion.status = decision;
      suggestion.reviewed_by_admin_id = viewer.id;
      suggestion.reviewed_at = nowIso();
      suggestion.resulting_position_id =
        decision === 'accepted'
          ? suggestion.position_id
          : decision === 'replaced'
            ? asNumberOrNull(context.body.position_id)
            : null;
      suggestion.note = asString(context.body.note).trim().length > 0
        ? asString(context.body.note)
        : suggestion.note;

      const report = reportOrFail(suggestion.report_id);

      addHistory({
        report_id: report.id,
        request_id: suggestion.request_id,
        scope: 'report',
        label: `Decyzja o propozycji stanowiska: ${decision}`,
        description: suggestion.note,
        actor_id: viewer.id,
      });

      notify([report.client_id], {
        kind: 'suggestion.reviewed',
        title: 'Administrator rozpatrzył propozycję stanowiska',
        body: report.name,
        report_id: report.id,
        request_id: suggestion.request_id,
      });

      return envelope(serializeSuggestion(suggestion));
    },
  },
  {
    method: 'get',
    pattern: /^\/reports\/(\d+)\/assignments$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      const includeInactive = context.query.get('include_inactive') === '1';
      const assignments = visibleAssignments(report.id, viewer);

      return envelope(
        includeInactive ? assignments : assignments.filter((assignment) => assignment.is_active),
      );
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/assignments$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const report = reportOrFail(Number(params[0]));
      const assignment = createAssignment(
        report,
        viewer,
        context.body as unknown as CreateAssignmentPayload,
      );

      return envelope(serializeAssignment(assignment), 201);
    },
  },
  {
    method: 'get',
    pattern: /^\/assignments$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);

      if (viewer.role === 'staff') {
        return envelope(activeAssignmentsForUser(viewer.id).map(serializeAssignment));
      }

      dispatchOrFail(context);

      const onlyActive = context.query.get('active') === '1';
      const assignments = mockState().assignments.filter(
        (assignment) => !onlyActive || isAssignmentActive(assignment),
      );

      return envelope(assignments.map(serializeAssignment));
    },
  },
  {
    method: 'patch',
    pattern: /^\/assignments\/(\d+)$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const assignment = assignmentOrFail(Number(params[0]));

      if (!isAssignmentActive(assignment)) {
        throw new MockHttpError(422, 'Nieaktywnego przydziału nie można zmienić.');
      }

      const positionId = asNumberOrNull(context.body.position_id);

      if (positionId !== null) {
        assignment.position_id = positionId;
      }

      const dataScope = asString(context.body.data_scope);

      if (dataScope.length > 0) {
        assignment.data_scope = dataScope;
      }

      if ('instruction' in context.body) {
        const instruction = asString(context.body.instruction).trim();

        assignment.instruction = instruction.length > 0 ? instruction : null;
      }

      const serialized = serializeAssignment(assignment);

      addHistory({
        report_id: assignment.report_id,
        request_id: assignment.request_id,
        scope: 'assignment',
        label: `Zmieniono przydział: ${serialized.assignee.display_name}`,
        actor_id: viewer.id,
      });

      return envelope(serialized);
    },
  },
  {
    method: 'delete',
    pattern: /^\/assignments\/(\d+)$/,
    handle: (context, params) => {
      const viewer = dispatchOrFail(context);
      const assignment = assignmentOrFail(Number(params[0]));

      revokeAssignment(assignment, viewer, asString(context.body.reason) || null);

      return envelope(serializeAssignment(assignment));
    },
  },
  {
    method: 'get',
    pattern: /^\/assignments\/(\d+)\/task$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const assignment = assignmentOrFail(Number(params[0]));

      const isOwner =
        assignment.assignee_type === 'staff' && assignment.assignee_id === viewer.id;
      const isDispatch = viewer.role === 'admin' || viewer.role === 'super_admin';

      if (!isOwner && !isDispatch) {
        throw new MockHttpError(403, 'Brak dostępu do tego zadania.');
      }

      if (isOwner && !isAssignmentActive(assignment)) {
        throw new MockHttpError(403, 'Przydział został zakończony lub cofnięty.');
      }

      return envelope(serializeStaffTaskDetail(assignment, viewer));
    },
  },
  {
    method: 'post',
    pattern: /^\/assignments\/(\d+)\/notes$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const assignment = assignmentOrFail(Number(params[0]));

      if (
        assignment.assignee_type !== 'staff' ||
        assignment.assignee_id !== viewer.id ||
        !isAssignmentActive(assignment)
      ) {
        throw new MockHttpError(403, 'Brak dostępu do tego zadania.');
      }

      const body = asString(context.body.body).trim();

      if (body.length === 0) {
        throw new MockHttpError(422, 'Treść notatki jest wymagana.', {
          body: ['Treść notatki jest wymagana.'],
        });
      }

      addHistory({
        report_id: assignment.report_id,
        request_id: assignment.request_id,
        scope: assignment.request_id === null ? 'report' : 'request',
        label: 'Notatka wykonawcy',
        description: body,
        actor_id: viewer.id,
      });

      const report = reportOrFail(assignment.report_id);

      notify(recipientsFor(report, assignment.request_id), {
        kind: 'note.added',
        title: 'Nowa notatka wykonawcy',
        body: report.name,
        report_id: report.id,
        request_id: assignment.request_id,
      });

      return envelope(serializeHistoryEntry(historyOfReport(report.id)[0]), 201);
    },
  },
  {
    method: 'post',
    pattern: /^\/assignments\/(\d+)\/attachments$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const assignment = assignmentOrFail(Number(params[0]));

      if (
        assignment.assignee_type !== 'staff' ||
        assignment.assignee_id !== viewer.id ||
        !isAssignmentActive(assignment)
      ) {
        throw new MockHttpError(403, 'Brak dostępu do tego zadania.');
      }

      const attachment = {
        id: nextId('attachment'),
        report_id: assignment.report_id,
        request_id: assignment.request_id,
        type: (asString(context.body.type) || 'file') as 'photo' | 'file' | 'audio' | 'video',
        name: asString(context.body.name) || 'materiał',
        mime_type: null,
        size: null,
        uploaded_by_id: viewer.id,
        created_at: nowIso(),
      };

      mockState().attachments.push(attachment);

      const report = reportOrFail(assignment.report_id);

      notify(recipientsFor(report, assignment.request_id), {
        kind: 'attachment.added',
        title: 'Wykonawca dodał materiał',
        body: report.name,
        report_id: report.id,
        request_id: assignment.request_id,
      });

      return envelope(serializeAttachment(attachment), 201);
    },
  },
  {
    method: 'get',
    pattern: /^\/staff\/assignments$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);

      if (viewer.role !== 'staff') {
        throw new MockHttpError(403, 'Widok dostępny wyłącznie dla pracownika.');
      }

      return envelope(activeAssignmentsForUser(viewer.id).map(serializeStaffTaskSummary));
    },
  },
  {
    method: 'get',
    pattern: /^\/staff$/,
    handle: (context) => {
      dispatchOrFail(context);

      const positionId = context.query.get('position_id');
      const search = (context.query.get('search') ?? '').trim().toLowerCase();

      const staff = mockState()
        .users.filter((user) => user.role === 'staff')
        .filter((user) =>
          positionId === null || positionId.length === 0
            ? true
            : user.position_id === Number(positionId),
        )
        .filter((user) => (search.length === 0 ? true : user.name.toLowerCase().includes(search)))
        .map((user) => ({
          id: user.id,
          name: user.name,
          position: positionRef(user.position_id),
          organization_name: user.organization_name,
          is_available: true,
          active_assignments_count: activeAssignmentsForUser(user.id).length,
        }));

      return envelope(staff);
    },
  },
  {
    method: 'get',
    pattern: /^\/services$/,
    handle: (context) => {
      dispatchOrFail(context);

      const search = (context.query.get('search') ?? '').trim().toLowerCase();

      return envelope(
        mockState()
          .services.filter((service) =>
            search.length === 0 ? true : service.name.toLowerCase().includes(search),
          )
          .map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            position: positionRef(service.position_id),
            is_available: service.is_available,
          })),
      );
    },
  },
  {
    method: 'get',
    pattern: /^\/requests\/(\d+)$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const request = requestOrFail(Number(params[0]));

      assertCanViewRequest(request, viewer);

      return envelope(serializeRequestDetail(request, viewer));
    },
  },
  {
    method: 'get',
    pattern: /^\/requests\/(\d+)\/history$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const request = requestOrFail(Number(params[0]));

      assertCanViewRequest(request, viewer);

      return envelope(
        historyOfReport(request.report_id)
          .filter((entry) => entry.request_id === request.id)
          .map(serializeHistoryEntry),
      );
    },
  },
  {
    method: 'get',
    pattern: /^\/requests\/(\d+)\/available-status-transitions$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const request = requestOrFail(Number(params[0]));

      assertCanViewRequest(request, viewer);

      const report = reportOrFail(request.report_id);

      return envelope(
        availableTransitions(
          'request',
          request.status_key,
          roleTokensFor(viewer, report, request.id),
        ),
      );
    },
  },
  {
    method: 'post',
    pattern: /^\/requests\/(\d+)\/status$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const request = requestOrFail(Number(params[0]));

      assertCanViewRequest(request, viewer);
      changeRequestStatus(request, viewer, context.body as unknown as StatusChangePayload);

      return envelope(serializeRequestDetail(request, viewer));
    },
  },
  {
    method: 'post',
    pattern: /^\/reports\/(\d+)\/requests$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const report = reportOrFail(Number(params[0]));

      assertCanViewReport(report, viewer);

      const name = asString(context.body.name).trim();

      if (name.length === 0) {
        throw new MockHttpError(422, 'Podaj nazwę zadania.', { name: ['Podaj nazwę zadania.'] });
      }

      const request: MockRequest = {
        id: nextId('request'),
        report_id: report.id,
        name,
        description: asString(context.body.description).trim().length > 0
          ? asString(context.body.description).trim()
          : null,
        status_key: initialStatusKey('request'),
        created_at: nowIso(),
      };

      mockState().requests.push(request);

      const suggestedPositionId = asNumberOrNull(context.body.suggested_position_id);

      if (suggestedPositionId !== null && viewer.role === 'client') {
        mockState().suggestions.push({
          id: nextId('suggestion'),
          report_id: report.id,
          request_id: request.id,
          position_id: suggestedPositionId,
          suggested_by_client_id: viewer.id,
          status: 'pending',
          reviewed_by_admin_id: null,
          reviewed_at: null,
          note: null,
          resulting_position_id: null,
          created_at: nowIso(),
        });
      }

      addHistory({
        report_id: report.id,
        request_id: request.id,
        scope: 'request',
        label: 'Zadanie utworzone',
        actor_id: viewer.id,
        to_status_key: request.status_key,
      });

      notify(recipientsFor(report, request.id), {
        kind: 'request.created',
        title: 'Nowe zadanie w zgłoszeniu',
        body: request.name,
        report_id: report.id,
        request_id: request.id,
      });

      return envelope(serializeRequestDetail(request, viewer), 201);
    },
  },
  {
    method: 'get',
    pattern: /^\/notifications$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);
      const onlyUnread = context.query.get('unread') === '1';
      const items = mockState()
        .notifications.filter((notification) => notification.user_id === viewer.id)
        .filter((notification) => !onlyUnread || notification.read_at === null)
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .map(serializeNotification);

      return ok(paginate(items, Number(context.query.get('page') ?? '1')));
    },
  },
  {
    method: 'get',
    pattern: /^\/notifications\/unread-count$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);
      const count = mockState().notifications.filter(
        (notification) => notification.user_id === viewer.id && notification.read_at === null,
      ).length;

      return envelope({ count });
    },
  },
  {
    method: 'post',
    pattern: /^\/notifications\/read-all$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);

      mockState()
        .notifications.filter((notification) => notification.user_id === viewer.id)
        .forEach((notification) => {
          notification.read_at = notification.read_at ?? nowIso();
        });

      return ok(null, 204);
    },
  },
  {
    method: 'post',
    pattern: /^\/notifications\/([^/]+)\/read$/,
    handle: (context, params) => {
      const viewer = viewerOrFail(context);
      const notification = mockState().notifications.find(
        (candidate) => candidate.id === params[0] && candidate.user_id === viewer.id,
      );

      if (notification === undefined) {
        throw new MockHttpError(404, 'Nie znaleziono powiadomienia.');
      }

      notification.read_at = notification.read_at ?? nowIso();

      return ok(null, 204);
    },
  },
  {
    method: 'get',
    pattern: /^\/profile$/,
    handle: (context) => envelope(authUser(viewerOrFail(context))),
  },
  {
    method: 'patch',
    pattern: /^\/profile$/,
    handle: (context) => {
      const viewer = viewerOrFail(context);
      const name = asString(context.body.name).trim();

      if (name.length > 0) {
        viewer.name = name;
      }

      if ('phone' in context.body) {
        const phone = asString(context.body.phone).trim();

        viewer.phone = phone.length > 0 ? phone : null;
      }

      return envelope(authUser(viewer));
    },
  },
  {
    method: 'post',
    pattern: /^\/profile\/push-token$/,
    handle: (context) => {
      viewerOrFail(context);

      return ok(null, 204);
    },
  },
];

export function handleMockRequest(context: MockRequestContext): MockResponse {
  const route = routes.find((candidate) => {
    return candidate.method === context.method && candidate.pattern.test(context.path);
  });

  if (route === undefined) {
    throw new MockHttpError(
      404,
      `Mock API: brak obsługi ${context.method.toUpperCase()} ${context.path}`,
    );
  }

  const match = route.pattern.exec(context.path);
  const params = match === null ? [] : match.slice(1);

  return route.handle(context, params);
}
