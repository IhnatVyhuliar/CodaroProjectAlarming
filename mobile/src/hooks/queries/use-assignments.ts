import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { assignmentsApi } from '@/api/endpoints/assignments';
import { queryKeys } from '@/api/query-keys';
import type { CreateAssignmentPayload, UpdateAssignmentPayload } from '@/api/types';

export function useReportAssignments(reportId: number | null, includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.reportAssignments(reportId ?? 0, includeInactive),
    queryFn: () => assignmentsApi.forReport(reportId as number, includeInactive),
    enabled: reportId !== null,
  });
}

export function useActiveAssignments() {
  return useQuery({
    queryKey: queryKeys.activeAssignments,
    queryFn: () => assignmentsApi.active(),
  });
}

function useAssignmentInvalidation() {
  const queryClient = useQueryClient();

  return (reportId: number | null) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.assignments });
    void queryClient.invalidateQueries({ queryKey: queryKeys.staffTasks });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.reports });

    if (reportId !== null) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportHistory(reportId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reportAssignments(reportId, true),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reportAssignments(reportId, false),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportSuggestions(reportId) });
    }
  };
}

export function useCreateAssignment(reportId: number) {
  const invalidate = useAssignmentInvalidation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => assignmentsApi.create(reportId, payload),
    onSuccess: (assignment) => {
      invalidate(reportId);

      if (assignment.request_id !== null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.request(assignment.request_id) });
      }
    },
  });
}

export function useUpdateAssignment(reportId: number | null) {
  const invalidate = useAssignmentInvalidation();

  return useMutation({
    mutationFn: (variables: { assignmentId: number; payload: UpdateAssignmentPayload }) =>
      assignmentsApi.update(variables.assignmentId, variables.payload),
    onSuccess: () => invalidate(reportId),
  });
}

export function useRevokeAssignment(reportId: number | null) {
  const invalidate = useAssignmentInvalidation();

  return useMutation({
    mutationFn: (variables: { assignmentId: number; reason?: string | null }) =>
      assignmentsApi.revoke(variables.assignmentId, variables.reason ?? null),
    onSuccess: () => invalidate(reportId),
  });
}
