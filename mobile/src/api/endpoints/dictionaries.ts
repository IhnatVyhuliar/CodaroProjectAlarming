import { api } from '../client';
import type { Category, DataScopeOption, Envelope, Position } from '../types';

export const dictionariesApi = {
  categories(): Promise<Category[]> {
    return api.get<Envelope<Category[]>>('/categories').then((response) => response.data);
  },
  /** Positions ("stanowiska") — the only assignee-related dictionary a client may read. */
  positions(): Promise<Position[]> {
    return api.get<Envelope<Position[]>>('/positions').then((response) => response.data);
  },
  /** Data-sharing scopes offered when an admin creates an assignment. */
  assignmentDataScopes(): Promise<DataScopeOption[]> {
    return api
      .get<Envelope<DataScopeOption[]>>('/assignment-data-scopes')
      .then((response) => response.data);
  },
};
