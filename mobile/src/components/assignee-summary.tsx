import { StyleSheet, View } from 'react-native';

import type { AssigneeSummary as AssigneeSummaryData } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { assigneeTypeLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';

export interface AssigneeSummaryProps {
  assignee: AssigneeSummaryData;
  testID?: string;
}

/**
 * Renders only what the API returned about the assignee. Nothing is displayed
 * before an assignment exists, because the API simply does not send it.
 */
export function AssigneeSummary({ assignee, testID }: AssigneeSummaryProps) {
  return (
    <View style={styles.wrapper} testID={testID ?? `assignee-${assignee.type}-${assignee.id}`}>
      <ThemedText type="smallBold">{assignee.display_name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {assigneeTypeLabels[assignee.type]}
        {assignee.position === null ? '' : ` · ${assignee.position.name}`}
      </ThemedText>
      {assignee.organization_name === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {assignee.organization_name}
        </ThemedText>
      )}
      {assignee.contact_channel === null ? null : (
        <ThemedText type="small">Kontakt: {assignee.contact_channel}</ThemedText>
      )}
      {assignee.participation_status === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Udział: {assignee.participation_status}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.half,
  },
});
