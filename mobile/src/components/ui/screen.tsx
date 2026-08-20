import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pull-to-refresh handler; omit to disable. */
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollable?: boolean;
  /** Sticky footer (forms, primary actions). */
  footer?: React.ReactNode;
  testID?: string;
}

/**
 * Common page frame: safe area, offline banner, capped content width so the
 * admin panel stays readable on tablets and web.
 */
export function Screen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  scrollable = true,
  footer,
  testID,
}: ScreenProps) {
  const header =
    title === undefined ? null : (
      <View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.headerTitle}>
          {title}
        </ThemedText>
        {subtitle === undefined ? null : (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
    );

  const body = (
    <View style={styles.contentInner}>
      {header}
      {children}
    </View>
  );

  return (
    <ThemedView style={styles.root} testID={testID}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <OfflineBanner />
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh === undefined ? undefined : (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              )
            }>
            {body}
          </ScrollView>
        ) : (
          <View style={styles.staticContent}>{body}</View>
        )}
        {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  staticContent: {
    flex: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  contentInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  footer: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
