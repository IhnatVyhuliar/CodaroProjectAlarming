import { useQuery } from '@tanstack/react-query';

import { dictionariesApi } from '@/api/endpoints/dictionaries';
import { queryKeys } from '@/api/query-keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => dictionariesApi.categories(),
    staleTime: 10 * 60_000,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: queryKeys.positions,
    queryFn: () => dictionariesApi.positions(),
    staleTime: 10 * 60_000,
  });
}

export function useAssignmentDataScopes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dataScopes,
    queryFn: () => dictionariesApi.assignmentDataScopes(),
    staleTime: 10 * 60_000,
    enabled,
  });
}
