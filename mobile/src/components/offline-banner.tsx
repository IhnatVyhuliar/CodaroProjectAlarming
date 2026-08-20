import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNetworkStore } from '@/offline/network-store';
import { useOperationQueue } from '@/offline/operation-queue';

/** Connection state plus the number of operations waiting to be sent. */
export function OfflineBanner() {
  const theme = useTheme();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const pendingCount = useOperationQueue((state) => state.pending.length);
  const lastError = useOperationQueue((state) => state.lastError);

  if (isOnline && pendingCount === 0 && lastError === null) {
    return null;
  }

  const background = isOnline ? theme.backgroundElement : theme.warning;
  const message = isOnline
    ? pendingCount > 0
      ? `Wysyłanie oczekujących operacji: ${pendingCount}`
      : (lastError ?? '')
    : pendingCount > 0
      ? `Brak połączenia. Oczekujące operacje: ${pendingCount}`
      : 'Brak połączenia. Dane mogą być nieaktualne.';

  return (
    <View
      testID="offline-banner"
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: background, borderColor: theme.border }]}>
      <ThemedText type="small" themeColor={isOnline ? 'text' : 'onPrimary'}>
        {message}
      </ThemedText>
      {isOnline && lastError !== null && pendingCount > 0 ? (
        <ThemedText type="small" themeColor="danger">
          {lastError}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
  },
});
