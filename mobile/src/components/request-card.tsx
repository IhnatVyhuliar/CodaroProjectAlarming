import { StyleSheet, View } from 'react-native';

import type { RequestSummary } from '@/api/types';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

export interface RequestCardProps {
  request: RequestSummary;
  onPress?: () => void;
  footer?: React.ReactNode;
  testID?: string;
}

export function RequestCard({ request, onPress, footer, testID }: RequestCardProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Zadanie ${request.name}`}
      testID={testID ?? `request-card-${request.id}`}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.title}>
          {request.name}
        </ThemedText>
        <StatusBadge status={request.status} />
      </View>

      {request.description === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {request.description}
        </ThemedText>
      )}

      {request.suggested_position === null ? null : (
        <ThemedText type="small">
          Proponowane stanowisko: {request.suggested_position.name}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Aktywne przydziały: {request.active_assignments_count}
      </ThemedText>

      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
});
