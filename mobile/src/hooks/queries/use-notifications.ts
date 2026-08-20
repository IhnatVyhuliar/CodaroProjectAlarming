import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '@/api/endpoints/notifications';
import { queryKeys } from '@/api/query-keys';

export function useNotifications(onlyUnread = false) {
  return useQuery({
    queryKey: queryKeys.notificationList(onlyUnread),
    queryFn: () => notificationsApi.list(onlyUnread),
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notificationsUnreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
