import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileApi, type UpdateProfilePayload } from '@/api/endpoints/profile';
import { queryKeys } from '@/api/query-keys';
import { useSessionStore } from '@/auth/session-store';

export function useProfile() {
  const user = useSessionStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => profileApi.get(),
    initialData: user ?? undefined,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useSessionStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.profile, user);
    },
  });
}
