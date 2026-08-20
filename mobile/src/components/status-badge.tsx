import { StyleSheet, View } from 'react-native';

import type { StatusRef } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface StatusBadgeProps {
  status: Pick<StatusRef, 'label' | 'color'> | null;
  /** Extra qualifier rendered next to the label, e.g. "zadanie". */
  caption?: string;
  testID?: string;
}

/** Relative luminance, so text stays readable on API-provided colours. */
function readableTextColor(background: string): '#000000' | '#FFFFFF' {
  const hex = background.replace('#', '');
  const normalised =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : hex;

  if (normalised.length !== 6) {
    return '#FFFFFF';
  }

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(normalised.slice(offset, offset + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  return luminance > 0.45 ? '#000000' : '#FFFFFF';
}

export function StatusBadge({ status, caption, testID }: StatusBadgeProps) {
  const theme = useTheme();

  if (status === null) {
    return null;
  }

  const background = status.color ?? theme.backgroundSelected;
  const color = status.color === null ? theme.text : readableTextColor(status.color);

  return (
    <View style={styles.wrapper}>
      <View
        testID={testID ?? 'status-badge'}
        accessibilityLabel={`Status: ${status.label}`}
        style={[styles.badge, { backgroundColor: background }]}>
        <ThemedText type="small" style={[styles.label, { color }]}>
          {status.label}
        </ThemedText>
      </View>
      {caption === undefined ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {caption}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  label: {
    fontWeight: 700,
  },
});
