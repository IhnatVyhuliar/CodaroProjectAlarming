import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SiteInfoProps {
  /** Ktoś jest uwięziony w kabinie — wyróżniamy to najmocniej w całym UI. */
  isEntrapment: boolean;
  siteAddress: string | null;
  deviceLabel: string | null;
  compact?: boolean;
  testID?: string;
}

/**
 * Adres obiektu i oznaczenie urządzenia — dane, bez których ekipa nie ruszy
 * na miejsce. Renderuje tylko to, co zwróciło API dla danego zakresu dostępu.
 */
export function SiteInfo({
  isEntrapment,
  siteAddress,
  deviceLabel,
  compact = false,
  testID,
}: SiteInfoProps) {
  const theme = useTheme();

  if (!isEntrapment && siteAddress === null && deviceLabel === null) {
    return null;
  }

  return (
    <View style={styles.wrapper} testID={testID ?? 'site-info'}>
      {isEntrapment ? (
        <View
          testID="entrapment-badge"
          accessibilityRole="alert"
          accessibilityLabel="Uwięzienie w kabinie"
          style={[styles.banner, { backgroundColor: theme.danger }]}>
          <ThemedText type="smallBold" themeColor="onPrimary">
            UWIĘZIENIE W KABINIE — priorytet ratunkowy
          </ThemedText>
        </View>
      ) : null}

      {siteAddress === null ? null : (
        <ThemedText type={compact ? 'small' : 'smallBold'}>Obiekt: {siteAddress}</ThemedText>
      )}

      {deviceLabel === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Urządzenie: {deviceLabel}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.half,
  },
  banner: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
