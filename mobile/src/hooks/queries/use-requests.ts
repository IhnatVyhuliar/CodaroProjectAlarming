import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requestsApi } from '@/api/endpoints/requests';
import { queryKeys } from '@/api/query-keys';
import type { NewRequestDraft } from '@/api/types';

export function useRequest(requestId: number | null) {
  return useQuery({
    queryKey: queryKeys.request(requestId ?? 0),
    queryFn: () => requestsApi.detail(requestId as number),
    enabled: requestId !== null,
  });
}

export function useRequestHistory(requestId: number | null) {
  return useQuery({
    queryKey: queryKeys.requestHistory(requestId ?? 0),
    queryFn: () => requestsApi.history(requestId as number),
    enabled: requestId !== null,
  });
}

export function useCreateRequest(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NewRequestDraft) => requestsApi.create(reportId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportHistory(reportId) });
    },
  });
}
