import { StyleSheet, View } from 'react-native';

import type { PositionSuggestion } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { suggestionStatusLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';
import { formatDateTime } from '@/utils/format';

export interface PositionSuggestionCardProps {
  suggestion: PositionSuggestion;
  /** Request name resolved by the caller when the suggestion targets a request. */
  requestName?: string | null;
  onAccept?: () => void;
  onReject?: () => void;
  onReplace?: () => void;
  isBusy?: boolean;
  testID?: string;
}

export function PositionSuggestionCard({
  suggestion,
  requestName = null,
  onAccept,
  onReject,
  onReplace,
  isBusy = false,
  testID,
}: PositionSuggestionCardProps) {
  return (
    <Card testID={testID ?? `position-suggestion-${suggestion.id}`}>
      <ThemedText type="smallBold">Stanowisko: {suggestion.position.name}</ThemedText>

      {suggestion.position.description === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {suggestion.position.description}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Dotyczy: {suggestion.request_id === null ? 'całego zgłoszenia' : (requestName ?? 'zadania')}
      </ThemedText>

      <ThemedText type="small">Status propozycji: {suggestionStatusLabels[suggestion.status]}</ThemedText>

      {suggestion.resulting_position === null ? null : (
        <ThemedText type="small">
          Decyzja administratora: {suggestion.resulting_position.name}
        </ThemedText>
      )}

      {suggestion.note === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Uwagi: {suggestion.note}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Zgłoszono: {formatDateTime(suggestion.created_at)}
        {suggestion.reviewed_at === null
          ? ''
          : ` · Rozpatrzono: ${formatDateTime(suggestion.reviewed_at)}`}
        {suggestion.reviewed_by === null ? '' : ` (${suggestion.reviewed_by.name})`}
      </ThemedText>

      {onAccept === undefined && onReject === undefined && onReplace === undefined ? null : (
        <View style={styles.actions}>
          {onAccept === undefined ? null : (
            <Button
              label="Zaakceptuj stanowisko"
              onPress={onAccept}
              loading={isBusy}
              testID={`suggestion-accept-${suggestion.id}`}
            />
          )}
          {onReplace === undefined ? null : (
            <Button label="Wskaż inne stanowisko" variant="secondary" onPress={onReplace} />
          )}
          {onReject === undefined ? null : (
            <Button label="Odrzuć propozycję" variant="ghost" onPress={onReject} />
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
