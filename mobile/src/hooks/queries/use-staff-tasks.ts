import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { staffTasksApi } from '@/api/endpoints/staff-tasks';
import { queryKeys } from '@/api/query-keys';
import type { LocalFileRef } from '@/api/types';

/** Active assignments of the signed-in worker — the API filters, not the UI. */
export function useStaffTasks() {
  return useQuery({
    queryKey: queryKeys.staffTasks,
    queryFn: () => staffTasksApi.list(),
  });
}

export function useStaffTask(assignmentId: number | null) {
  return useQuery({
    queryKey: queryKeys.staffTask(assignmentId ?? 0),
    queryFn: () => staffTasksApi.detail(assignmentId as number),
    enabled: assignmentId !== null,
  });
}

export function useAddTaskNote(assignmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => staffTasksApi.addNote(assignmentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffTask(assignmentId) });
    },
  });
}

export function useAddTaskAttachment(assignmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: LocalFileRef) => staffTasksApi.addAttachment(assignmentId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffTask(assignmentId) });
    },
  });
}
