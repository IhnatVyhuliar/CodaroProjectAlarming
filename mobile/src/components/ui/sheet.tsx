import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

/** Modal used for confirmations and short forms (status change, assignment). */
export function Sheet({ visible, title, onClose, children, testID }: SheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <View
          testID={testID}
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.header}>
            <ThemedText type="smallBold" accessibilityRole="header" style={styles.title}>
              {title}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zamknij"
              onPress={onClose}
              style={styles.close}>
              <ThemedText type="smallBold">Zamknij</ThemedText>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  close: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
