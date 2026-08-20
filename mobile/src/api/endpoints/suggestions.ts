import { api } from '../client';
import type { Envelope, PositionSuggestion, SuggestionDecision } from '../types';

export interface CreateSuggestionPayload {
  position_id: number;
  request_id: number | null;
  note: string | null;
}

export interface ReviewSuggestionPayload {
  decision: SuggestionDecision;
  /** Required when the admin replaces the suggested position with another one. */
  position_id?: number | null;
  note?: string | null;
}

export const suggestionsApi = {
  forReport(reportId: number): Promise<PositionSuggestion[]> {
    return api
      .get<Envelope<PositionSuggestion[]>>(`/reports/${reportId}/position-suggestions`)
      .then((response) => response.data);
  },
  create(reportId: number, payload: CreateSuggestionPayload): Promise<PositionSuggestion> {
    return api
      .post<Envelope<PositionSuggestion>>(`/reports/${reportId}/position-suggestions`, payload)
      .then((response) => response.data);
  },
  review(suggestionId: number, payload: ReviewSuggestionPayload): Promise<PositionSuggestion> {
    return api
      .post<Envelope<PositionSuggestion>>(`/position-suggestions/${suggestionId}/review`, payload)
      .then((response) => response.data);
  },
};
