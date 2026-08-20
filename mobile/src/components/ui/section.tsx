import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface SectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

export function Section({ title, description, action, children, testID }: SectionProps) {
  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" accessibilityRole="header">
            {title.toUpperCase()}
          </ThemedText>
          {description === undefined ? null : (
            <ThemedText type="small" themeColor="textSecondary">
              {description}
            </ThemedText>
          )}
        </View>
        {action}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  body: {
    gap: Spacing.two,
  },
});
