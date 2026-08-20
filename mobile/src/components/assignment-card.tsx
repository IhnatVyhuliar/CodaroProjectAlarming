import { StyleSheet, View } from 'react-native';

import type { Assignment } from '@/api/types';
import { AssigneeSummary } from '@/components/assignee-summary';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { assignmentScopeLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';
import { formatDateTime } from '@/utils/format';

export interface AssignmentCardProps {
  assignment: Assignment;
  /** Request name resolved by the caller, so the card stays data-only. */
  requestName?: string | null;
  onOpenReport?: () => void;
  onChange?: () => void;
  onRevoke?: () => void;
  isRevoking?: boolean;
  testID?: string;
}

export function AssignmentCard({
  assignment,
  requestName = null,
  onOpenReport,
  onChange,
  onRevoke,
  isRevoking = false,
  testID,
}: AssignmentCardProps) {
  return (
    <Card testID={testID ?? `assignment-card-${assignment.id}`}>
      <AssigneeSummary assignee={assignment.assignee} />

      <ThemedText type="small" themeColor="textSecondary">
        Zakres: {assignmentScopeLabels[assignment.scope]}
        {assignment.scope === 'request' && requestName !== null ? ` — ${requestName}` : ''}
      </ThemedText>

      {assignment.data_scope === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Udostępnione dane: {assignment.data_scope.label}
        </ThemedText>
      )}

      {assignment.instruction === null ? null : (
        <ThemedText type="small">Instrukcja: {assignment.instruction}</ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Przypisano: {formatDateTime(assignment.assigned_at)}
        {assignment.assigned_by === null ? '' : ` · ${assignment.assigned_by.name}`}
      </ThemedText>

      <ThemedText type="small" themeColor={assignment.is_active ? 'success' : 'textSecondary'}>
        {assignment.is_active
          ? 'Przydział aktywny'
          : assignment.revoked_at !== null
            ? `Cofnięty: ${formatDateTime(assignment.revoked_at)}`
            : `Zakończony: ${formatDateTime(assignment.completed_at)}`}
      </ThemedText>

      {onOpenReport === undefined && onChange === undefined && onRevoke === undefined ? null : (
        <View style={styles.actions}>
          {onOpenReport === undefined ? null : (
            <Button label="Przejdź do zgłoszenia" variant="secondary" onPress={onOpenReport} />
          )}
          {onChange === undefined ? null : (
            <Button label="Zmień przydział" variant="ghost" onPress={onChange} />
          )}
          {onRevoke === undefined ? null : (
            <Button
              label="Cofnij przydział"
              variant="danger"
              loading={isRevoking}
              onPress={onRevoke}
              testID={`assignment-revoke-${assignment.id}`}
            />
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
