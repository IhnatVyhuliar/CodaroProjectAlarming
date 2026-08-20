import { StyleSheet, View } from 'react-native';

import type { HistoryEntry } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/utils/format';

export interface HistoryTimelineProps {
  entries: HistoryEntry[];
  emptyLabel?: string;
  testID?: string;
}

export function HistoryTimeline({
  entries,
  emptyLabel = 'Brak wpisów w historii.',
  testID,
}: HistoryTimelineProps) {
  const theme = useTheme();

  if (entries.length === 0) {
    return <EmptyState title={emptyLabel} testID="history-empty" />;
  }

  return (
    <View style={styles.list} testID={testID ?? 'history-timeline'}>
      {entries.map((entry) => (
        <View
          key={`${entry.scope}-${entry.id}`}
          style={[styles.item, { borderLeftColor: theme.border }]}>
          <ThemedText type="smallBold">{entry.label}</ThemedText>

          {entry.to_status === null ? null : (
            <View style={styles.statusRow}>
              {entry.from_status === null ? null : (
                <>
                  <StatusBadge status={entry.from_status} />
                  <ThemedText type="small" themeColor="textSecondary">
                    →
                  </ThemedText>
                </>
              )}
              <StatusBadge status={entry.to_status} />
            </View>
          )}

          {entry.description === null ? null : (
            <ThemedText type="small">{entry.description}</ThemedText>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(entry.created_at)}
            {entry.actor === null ? '' : ` · ${entry.actor.name}`}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  item: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.one,
    gap: Spacing.half,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
});
