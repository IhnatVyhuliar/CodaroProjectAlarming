import { StyleSheet, View } from 'react-native';

import { ApiError, toApiError } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  testID?: string;
}

export function ErrorState({ error, onRetry, title, testID }: ErrorStateProps) {
  const theme = useTheme();
  const apiError: ApiError = toApiError(error);
  const heading =
    title ?? (apiError.isNetworkError ? 'Brak połączenia' : 'Nie udało się wczytać danych');

  return (
    <View
      testID={testID ?? 'error-state'}
      accessibilityRole="alert"
      style={[styles.container, { borderColor: theme.danger }]}>
      <ThemedText type="smallBold" themeColor="danger">
        {heading}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {apiError.message}
      </ThemedText>
      {onRetry === undefined ? null : (
        <Button label="Spróbuj ponownie" onPress={onRetry} variant="secondary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
