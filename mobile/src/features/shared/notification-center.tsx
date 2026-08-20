import { useRouter } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { NotificationItem } from '@/components/notification-item';
import { Button } from '@/components/ui/button';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/queries/use-notifications';
import type { RoleGroup } from '@/auth/roles';

export interface NotificationCenterProps {
  /** Decides where tapping a notification navigates. */
  group: RoleGroup;
}

export function NotificationCenter({ group }: NotificationCenterProps) {
  const router = useRouter();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const notifications = useNotifications(onlyUnread);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const openTarget = (reportId: number | null, requestId: number | null, assignmentId: number | null): void => {
    if (group === 'staff') {
      if (assignmentId !== null) {
        router.push(`/(staff)/tasks/${assignmentId}`);
      }

      return;
    }

    if (requestId !== null) {
      router.push(`/(${group})/requests/${requestId}`);

      return;
    }

    if (reportId !== null) {
      router.push(`/(${group})/reports/${reportId}`);
    }
  };

  return (
    <Screen
      title="Powiadomienia"
      onRefresh={() => void notifications.refetch()}
      refreshing={notifications.isRefetching}>
      <OptionList
        options={[
          { value: 'all', label: 'Wszystkie' },
          { value: 'unread', label: 'Nieodczytane' },
        ]}
        value={onlyUnread ? 'unread' : 'all'}
        onChange={(value) => setOnlyUnread(value === 'unread')}
        inline
      />

      <Button
        label="Oznacz wszystkie jako odczytane"
        variant="secondary"
        onPress={() => markAllRead.mutate()}
        loading={markAllRead.isPending}
      />

      <Section title="Lista powiadomień">
        {notifications.isPending ? <LoadingState /> : null}

        {notifications.isError ? (
          <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />
        ) : null}

        {notifications.data !== undefined && notifications.data.data.length === 0 ? (
          <EmptyState
            title="Brak powiadomień"
            description="Tutaj pojawią się informacje o Twoich zgłoszeniach i przydziałach."
          />
        ) : null}

        {(notifications.data?.data ?? []).map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onPress={() => {
              if (notification.read_at === null) {
                markRead.mutate(notification.id);
              }

              openTarget(
                notification.target?.report_id ?? null,
                notification.target?.request_id ?? null,
                notification.target?.assignment_id ?? null,
              );
            }}
          />
        ))}
      </Section>
    </Screen>
  );
}
