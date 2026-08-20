import { api } from '../client';
import type { Envelope, HistoryEntry, NewRequestDraft, RequestDetail } from '../types';

export const requestsApi = {
  detail(requestId: number): Promise<RequestDetail> {
    return api
      .get<Envelope<RequestDetail>>(`/requests/${requestId}`)
      .then((response) => response.data);
  },
  create(reportId: number, payload: NewRequestDraft): Promise<RequestDetail> {
    return api
      .post<Envelope<RequestDetail>>(`/reports/${reportId}/requests`, payload)
      .then((response) => response.data);
  },
  history(requestId: number): Promise<HistoryEntry[]> {
    return api
      .get<Envelope<HistoryEntry[]>>(`/requests/${requestId}/history`)
      .then((response) => response.data);
  },
};
