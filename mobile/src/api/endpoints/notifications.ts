import { api } from '../client';
import type { AppNotification, Paginated } from '../types';

export const notificationsApi = {
  list(onlyUnread = false, page = 1): Promise<Paginated<AppNotification>> {
    const params = new URLSearchParams({ page: String(page) });

    if (onlyUnread) {
      params.append('unread', '1');
    }

    return api.get<Paginated<AppNotification>>(`/notifications?${params.toString()}`);
  },
  unreadCount(): Promise<number> {
    return api
      .get<{ data: { count: number } }>('/notifications/unread-count')
      .then((response) => response.data.count);
  },
  markRead(notificationId: string): Promise<void> {
    return api.post<void>(`/notifications/${notificationId}/read`);
  },
  markAllRead(): Promise<void> {
    return api.post<void>('/notifications/read-all');
  },
};
