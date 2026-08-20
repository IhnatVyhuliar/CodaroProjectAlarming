import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  suggestionsApi,
  type CreateSuggestionPayload,
  type ReviewSuggestionPayload,
} from '@/api/endpoints/suggestions';
import { queryKeys } from '@/api/query-keys';

export function useReportSuggestions(reportId: number | null) {
  return useQuery({
    queryKey: queryKeys.reportSuggestions(reportId ?? 0),
    queryFn: () => suggestionsApi.forReport(reportId as number),
    enabled: reportId !== null,
  });
}

export function useCreateSuggestion(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSuggestionPayload) => suggestionsApi.create(reportId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportSuggestions(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
    },
  });
}

export function useReviewSuggestion(reportId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { suggestionId: number; payload: ReviewSuggestionPayload }) =>
      suggestionsApi.review(variables.suggestionId, variables.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });

      if (reportId !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.reportSuggestions(reportId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.reportHistory(reportId) });
      }
    },
  });
}
