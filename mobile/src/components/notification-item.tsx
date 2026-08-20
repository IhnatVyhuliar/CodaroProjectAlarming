import { StyleSheet, View } from 'react-native';

import type { AppNotification } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/utils/format';

export interface NotificationItemProps {
  notification: AppNotification;
  onPress?: () => void;
  testID?: string;
}

export function NotificationItem({ notification, onPress, testID }: NotificationItemProps) {
  const theme = useTheme();
  const isUnread = notification.read_at === null;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${isUnread ? 'Nieodczytane. ' : ''}${notification.title}`}
      testID={testID ?? `notification-${notification.id}`}>
      <View style={styles.headerRow}>
        {isUnread ? (
          <View style={[styles.dot, { backgroundColor: theme.primary }]} accessibilityLabel="Nieodczytane" />
        ) : null}
        <ThemedText type={isUnread ? 'smallBold' : 'small'} style={styles.title}>
          {notification.title}
        </ThemedText>
      </View>

      {notification.body === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {notification.body}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {formatRelative(notification.created_at)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
