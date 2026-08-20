import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { statusesApi } from '@/api/endpoints/statuses';
import { queryKeys } from '@/api/query-keys';
import type { StatusChangePayload } from '@/api/types';

export function useStatusDefinitions(entityType: 'report' | 'request') {
  return useQuery({
    queryKey: queryKeys.statusDefinitions(entityType),
    queryFn: () => statusesApi.definitions(entityType),
    staleTime: 10 * 60_000,
  });
}

export function useReportStatusTransitions(reportId: number | null) {
  return useQuery({
    queryKey: queryKeys.reportTransitions(reportId ?? 0),
    queryFn: () => statusesApi.reportTransitions(reportId as number),
    enabled: reportId !== null,
  });
}

export function useRequestStatusTransitions(requestId: number | null) {
  return useQuery({
    queryKey: queryKeys.requestTransitions(requestId ?? 0),
    queryFn: () => statusesApi.requestTransitions(requestId as number),
    enabled: requestId !== null,
  });
}

export function useChangeReportStatus(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StatusChangePayload) =>
      statusesApi.changeReportStatus(reportId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportTransitions(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportHistory(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.queue });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientDashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffTasks });
    },
  });
}

export function useChangeRequestStatus(requestId: number, reportId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StatusChangePayload) =>
      statusesApi.changeRequestStatus(requestId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.request(requestId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.requestTransitions(requestId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.requestHistory(requestId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientDashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });

      if (reportId !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.reportHistory(reportId) });
      }
    },
  });
}
