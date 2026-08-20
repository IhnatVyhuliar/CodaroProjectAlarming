import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queueApi } from '@/api/endpoints/queue';
import { queryKeys } from '@/api/query-keys';
import type { QueueFilters } from '@/api/types';

export function useQueue(filters: QueueFilters) {
  return useQuery({
    queryKey: queryKeys.queueList(filters),
    queryFn: () => queueApi.list(filters),
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => queueApi.dashboard(),
  });
}

export function useClaimReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: number) => queueApi.claim(reportId),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.queue });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(report.id) });
    },
  });
}

export function useAssignAdmin(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adminId: number) => queueApi.assignAdmin(reportId, adminId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.queue });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
    },
  });
}
