import { api } from '../client';
import type {
  Attachment,
  ClientDashboard,
  CreateReportPayload,
  Envelope,
  HistoryEntry,
  LocalFileRef,
  Paginated,
  ReportDetail,
  ReportListFilters,
  ReportSummary,
} from '../types';

function toQuery(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();

  return query.length > 0 ? `?${query}` : '';
}

export const reportsApi = {
  list(filters: ReportListFilters = {}): Promise<Paginated<ReportSummary>> {
    return api.get<Paginated<ReportSummary>>(`/reports${toQuery({ ...filters })}`);
  },
  detail(reportId: number): Promise<ReportDetail> {
    return api.get<Envelope<ReportDetail>>(`/reports/${reportId}`).then((response) => response.data);
  },
  create(payload: CreateReportPayload): Promise<ReportDetail> {
    return api.post<Envelope<ReportDetail>>('/reports', payload).then((response) => response.data);
  },
  history(reportId: number): Promise<HistoryEntry[]> {
    return api
      .get<Envelope<HistoryEntry[]>>(`/reports/${reportId}/history`)
      .then((response) => response.data);
  },
  attachments(reportId: number): Promise<Attachment[]> {
    return api
      .get<Envelope<Attachment[]>>(`/reports/${reportId}/attachments`)
      .then((response) => response.data);
  },
  uploadAttachment(
    reportId: number,
    file: LocalFileRef,
    requestId: number | null = null,
  ): Promise<Attachment> {
    const form = new FormData();

    // React Native's FormData accepts this shape for local file URIs.
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mime_type,
    } as unknown as Blob);
    form.append('type', file.type);

    if (requestId !== null) {
      form.append('request_id', String(requestId));
    }

    return api
      .post<Envelope<Attachment>>(`/reports/${reportId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data);
  },
  addNote(reportId: number, body: string, requestId: number | null = null): Promise<HistoryEntry> {
    return api
      .post<Envelope<HistoryEntry>>(`/reports/${reportId}/notes`, {
        body,
        request_id: requestId,
      })
      .then((response) => response.data);
  },
  /**
   * Records that the report is handled by the administrator alone, without any
   * staff or service assignment (spec §10). Not an error state — an explicit
   * decision that lands in the report history.
   */
  markHandledByAdminOnly(reportId: number, note: string | null = null): Promise<ReportDetail> {
    return api
      .post<Envelope<ReportDetail>>(`/reports/${reportId}/admin-only`, { note })
      .then((response) => response.data);
  },
  stopLocationStream(reportId: number): Promise<ReportDetail> {
    return api
      .post<Envelope<ReportDetail>>(`/reports/${reportId}/location-stream/stop`)
      .then((response) => response.data);
  },
  clientDashboard(): Promise<ClientDashboard> {
    return api
      .get<Envelope<ClientDashboard>>('/client/dashboard')
      .then((response) => response.data);
  },
};
