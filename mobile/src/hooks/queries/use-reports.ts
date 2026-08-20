import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reportsApi } from '@/api/endpoints/reports';
import { queryKeys } from '@/api/query-keys';
import type { CreateReportPayload, LocalFileRef, ReportListFilters } from '@/api/types';

export function useReportList(filters: ReportListFilters) {
  return useQuery({
    queryKey: queryKeys.reportList(filters),
    queryFn: () => reportsApi.list(filters),
  });
}

export function useReport(reportId: number | null) {
  return useQuery({
    queryKey: queryKeys.report(reportId ?? 0),
    queryFn: () => reportsApi.detail(reportId as number),
    enabled: reportId !== null,
  });
}

export function useReportHistory(reportId: number | null) {
  return useQuery({
    queryKey: queryKeys.reportHistory(reportId ?? 0),
    queryFn: () => reportsApi.history(reportId as number),
    enabled: reportId !== null,
  });
}

export function useClientDashboard() {
  return useQuery({
    queryKey: queryKeys.clientDashboard,
    queryFn: () => reportsApi.clientDashboard(),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientDashboard });
    },
  });
}

export function useAddReportNote(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { body: string; requestId?: number | null }) =>
      reportsApi.addNote(reportId, variables.body, variables.requestId ?? null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportHistory(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
    },
  });
}

export function useUploadReportAttachment(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { file: LocalFileRef; requestId?: number | null }) =>
      reportsApi.uploadAttachment(reportId, variables.file, variables.requestId ?? null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
    },
  });
}

export function useStopLocationStream(reportId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reportsApi.stopLocationStream(reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientDashboard });
    },
  });
}
