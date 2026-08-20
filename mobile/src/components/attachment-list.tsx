import { StyleSheet, View } from 'react-native';

import type { Attachment } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { attachmentTypeLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';
import { formatDateTime, formatFileSize } from '@/utils/format';

export interface AttachmentListProps {
  attachments: Attachment[];
  /** Called when a viewer opens an attachment (temporary signed URL from the API). */
  onOpen?: (attachment: Attachment) => void;
  emptyLabel?: string;
  testID?: string;
}

export function AttachmentList({
  attachments,
  onOpen,
  emptyLabel = 'Brak materiałów.',
  testID,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return <EmptyState title={emptyLabel} testID="attachments-empty" />;
  }

  return (
    <View style={styles.list} testID={testID ?? 'attachment-list'}>
      {attachments.map((attachment) => (
        <Card key={attachment.id} testID={`attachment-${attachment.id}`}>
          <ThemedText type="smallBold">{attachment.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {attachmentTypeLabels[attachment.type]}
            {attachment.size === null ? '' : ` · ${formatFileSize(attachment.size)}`} ·{' '}
            {formatDateTime(attachment.created_at)}
          </ThemedText>
          {attachment.uploaded_by === null ? null : (
            <ThemedText type="small" themeColor="textSecondary">
              Dodał: {attachment.uploaded_by.name}
            </ThemedText>
          )}
          {onOpen === undefined ? null : (
            <Button
              label={attachment.type === 'audio' ? 'Odtwórz' : 'Otwórz'}
              variant="secondary"
              onPress={() => onOpen(attachment)}
            />
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
});
