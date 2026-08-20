import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID ?? 'empty-state'}
      accessibilityRole="summary"
      style={[styles.container, { borderColor: theme.border }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {description === undefined ? null : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      )}
      {actionLabel === undefined || onAction === undefined ? null : (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  description: {
    textAlign: 'center',
  },
});
