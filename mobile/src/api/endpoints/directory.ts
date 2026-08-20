import { api } from '../client';
import type { DirectoryService, DirectoryStaffMember, Envelope } from '../types';

/**
 * Assignee directories. The API only exposes these to dispatch roles — a client
 * request must be rejected server-side, and the client UI never calls them.
 */
export const directoryApi = {
  staff(positionId: number | null = null, search = ''): Promise<DirectoryStaffMember[]> {
    const params = new URLSearchParams();

    if (positionId !== null) {
      params.append('position_id', String(positionId));
    }
    if (search.length > 0) {
      params.append('search', search);
    }

    const query = params.toString();

    return api
      .get<Envelope<DirectoryStaffMember[]>>(`/staff${query.length > 0 ? `?${query}` : ''}`)
      .then((response) => response.data);
  },
  services(search = ''): Promise<DirectoryService[]> {
    const query = search.length > 0 ? `?search=${encodeURIComponent(search)}` : '';

    return api
      .get<Envelope<DirectoryService[]>>(`/services${query}`)
      .then((response) => response.data);
  },
};
