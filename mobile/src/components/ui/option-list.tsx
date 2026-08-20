import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Option<TValue> {
  value: TValue;
  label: string;
  description?: string | null;
}

export interface OptionListProps<TValue> {
  label?: string;
  hint?: string;
  options: Option<TValue>[];
  value: TValue | null;
  onChange: (value: TValue) => void;
  /** Renders options side by side (filters, short enums). */
  inline?: boolean;
  error?: string | null;
  emptyLabel?: string;
  testID?: string;
}

/** Accessible radio-style selector used for every single-choice field. */
export function OptionList<TValue extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  inline = false,
  error = null,
  emptyLabel = 'Brak dostępnych opcji.',
  testID,
}: OptionListProps<TValue>) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper} testID={testID}>
      {label === undefined ? null : <ThemedText type="smallBold">{label}</ThemedText>}
      {hint === undefined ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
      {options.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      ) : (
        <View style={inline ? styles.inlineList : styles.list}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => onChange(option.value)}
                style={[
                  inline ? styles.inlineItem : styles.item,
                  {
                    backgroundColor: selected ? theme.backgroundSelected : theme.background,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText type={selected ? 'smallBold' : 'small'}>{option.label}</ThemedText>
                {option.description === undefined || option.description === null ? null : (
                  <ThemedText type="small" themeColor="textSecondary">
                    {option.description}
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
      {error === null ? null : (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  inlineList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  item: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  inlineItem: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
