import { api } from '../client';
import type {
  Assignment,
  CreateAssignmentPayload,
  Envelope,
  UpdateAssignmentPayload,
} from '../types';

export const assignmentsApi = {
  /** Assignments of a report; `includeInactive` adds the revoked/completed audit trail. */
  forReport(reportId: number, includeInactive = false): Promise<Assignment[]> {
    const query = includeInactive ? '?include_inactive=1' : '';

    return api
      .get<Envelope<Assignment[]>>(`/reports/${reportId}/assignments${query}`)
      .then((response) => response.data);
  },
  /** All active assignments visible to the current user (admin overview). */
  active(): Promise<Assignment[]> {
    return api
      .get<Envelope<Assignment[]>>('/assignments?active=1')
      .then((response) => response.data);
  },
  create(reportId: number, payload: CreateAssignmentPayload): Promise<Assignment> {
    return api
      .post<Envelope<Assignment>>(`/reports/${reportId}/assignments`, payload)
      .then((response) => response.data);
  },
  update(assignmentId: number, payload: UpdateAssignmentPayload): Promise<Assignment> {
    return api
      .patch<Envelope<Assignment>>(`/assignments/${assignmentId}`, payload)
      .then((response) => response.data);
  },
  revoke(assignmentId: number, reason: string | null = null): Promise<Assignment> {
    return api
      .delete<Envelope<Assignment>>(`/assignments/${assignmentId}`, {
        data: { reason },
      })
      .then((response) => response.data);
  },
};
