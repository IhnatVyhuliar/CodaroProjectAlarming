import { api } from '../client';
import type { AdminDashboard, Envelope, Paginated, QueueFilters, ReportDetail, ReportSummary } from '../types';

function toQuery(filters: QueueFilters): string {
  const params = new URLSearchParams();

  if (filters.sort !== undefined) {
    params.append('sort', filters.sort);
  }
  if (filters.urgency !== undefined) {
    params.append('urgency', filters.urgency);
  }
  if (filters.category_id !== undefined) {
    params.append('category_id', String(filters.category_id));
  }
  if (filters.search !== undefined && filters.search.length > 0) {
    params.append('search', filters.search);
  }
  if (filters.page !== undefined) {
    params.append('page', String(filters.page));
  }

  const query = params.toString();

  return query.length > 0 ? `?${query}` : '';
}

export const queueApi = {
  list(filters: QueueFilters = {}): Promise<Paginated<ReportSummary>> {
    return api.get<Paginated<ReportSummary>>(`/queue${toQuery(filters)}`);
  },
  /** "Przyjęcie zgłoszenia" — the admin takes the report from the global queue. */
  claim(reportId: number): Promise<ReportDetail> {
    return api
      .post<Envelope<ReportDetail>>(`/queue/${reportId}/claim`)
      .then((response) => response.data);
  },
  assignAdmin(reportId: number, adminId: number): Promise<ReportDetail> {
    return api
      .post<Envelope<ReportDetail>>(`/reports/${reportId}/assign-admin`, { admin_id: adminId })
      .then((response) => response.data);
  },
  dashboard(): Promise<AdminDashboard> {
    return api.get<Envelope<AdminDashboard>>('/admin/dashboard').then((response) => response.data);
  },
};
