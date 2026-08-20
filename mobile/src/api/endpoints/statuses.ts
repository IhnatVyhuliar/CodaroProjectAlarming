import { api } from '../client';
import type {
  Envelope,
  ReportDetail,
  RequestDetail,
  StatusChangePayload,
  StatusRef,
  StatusTransitionOption,
} from '../types';

/**
 * Operational statuses live entirely on the backend. The frontend only asks
 * "what can this user do with this entity right now?" and renders the answer.
 */
export const statusesApi = {
  /** Status dictionary used to build filters — labels and colours come from the API. */
  definitions(entityType: 'report' | 'request'): Promise<StatusRef[]> {
    return api
      .get<Envelope<StatusRef[]>>(`/status-definitions?entity_type=${entityType}`)
      .then((response) => response.data);
  },
  reportTransitions(reportId: number): Promise<StatusTransitionOption[]> {
    return api
      .get<Envelope<StatusTransitionOption[]>>(`/reports/${reportId}/available-status-transitions`)
      .then((response) => response.data);
  },
  requestTransitions(requestId: number): Promise<StatusTransitionOption[]> {
    return api
      .get<Envelope<StatusTransitionOption[]>>(`/requests/${requestId}/available-status-transitions`)
      .then((response) => response.data);
  },
  changeReportStatus(reportId: number, payload: StatusChangePayload): Promise<ReportDetail> {
    return api
      .post<Envelope<ReportDetail>>(`/reports/${reportId}/status`, payload)
      .then((response) => response.data);
  },
  changeRequestStatus(requestId: number, payload: StatusChangePayload): Promise<RequestDetail> {
    return api
      .post<Envelope<RequestDetail>>(`/requests/${requestId}/status`, payload)
      .then((response) => response.data);
  },
};
