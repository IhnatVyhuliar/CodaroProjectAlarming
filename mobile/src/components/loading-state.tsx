import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface LoadingStateProps {
  label?: string;
  testID?: string;
}

export function LoadingState({ label = 'Wczytywanie…', testID }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID ?? 'loading-state'}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.container}>
      <ActivityIndicator color={theme.primary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
});
