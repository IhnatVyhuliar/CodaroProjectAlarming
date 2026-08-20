import { useQuery } from '@tanstack/react-query';

import { directoryApi } from '@/api/endpoints/directory';
import { queryKeys } from '@/api/query-keys';

/** Dispatch-only directory of workers. Never rendered in the client panel. */
export function useDirectoryStaff(positionId: number | null, search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.directoryStaff(positionId, search),
    queryFn: () => directoryApi.staff(positionId, search),
    enabled,
  });
}

export function useDirectoryServices(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.directoryServices(search),
    queryFn: () => directoryApi.services(search),
    enabled,
  });
}
