import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/errors';
import type { Attachment, StatusChangePayload, StatusTransitionOption } from '@/api/types';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionList } from '@/components/ui/option-list';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

export interface DynamicStatusActionsProps {
  /** Exactly what the API returned — the frontend adds nothing of its own. */
  transitions: StatusTransitionOption[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onSubmit: (transition: StatusTransitionOption, payload: StatusChangePayload) => Promise<void>;
  /** Attachments already present, used when a transition requires one. */
  attachments?: Attachment[];
  title?: string;
  disabled?: boolean;
  testID?: string;
}

export function DynamicStatusActions({
  transitions,
  isLoading = false,
  error,
  onSubmit,
  attachments = [],
  title = 'Zmiana statusu',
  disabled = false,
  testID,
}: DynamicStatusActionsProps) {
  const [selected, setSelected] = useState<StatusTransitionOption | null>(null);
  const [note, setNote] = useState('');
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <LoadingState label="Wczytywanie dostępnych statusów…" />;
  }

  if (error !== undefined && error !== null) {
    return <ErrorState error={error} title="Nie udało się wczytać dostępnych statusów" />;
  }

  // No transitions returned by the API → no status control at all.
  if (transitions === undefined || transitions.length === 0) {
    return null;
  }

  const close = (): void => {
    setSelected(null);
    setNote('');
    setAttachmentId(null);
    setValidationError(null);
    setSubmitError(null);
  };

  const run = async (
    transition: StatusTransitionOption,
    payload: StatusChangePayload,
  ): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(transition, payload);
      close();
    } catch (caught) {
      setSubmitError(caught);
      setValidationError(toApiError(caught).fieldError('note'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const press = (transition: StatusTransitionOption): void => {
    const needsSheet =
      transition.requires_confirmation ||
      transition.requires_note ||
      transition.requires_attachment;

    if (needsSheet) {
      setSelected(transition);
      setNote('');
      setAttachmentId(null);
      setValidationError(null);
      setSubmitError(null);

      return;
    }

    void run(transition, { to_status_id: transition.to_status_id });
  };

  const confirm = (): void => {
    if (selected === null) {
      return;
    }

    if (selected.requires_note && note.trim().length === 0) {
      setValidationError('Ta zmiana statusu wymaga notatki.');

      return;
    }

    if (selected.requires_attachment && attachmentId === null) {
      setValidationError('Ta zmiana statusu wymaga wskazania załącznika.');

      return;
    }

    void run(selected, {
      to_status_id: selected.to_status_id,
      note: note.trim().length > 0 ? note.trim() : undefined,
      attachment_ids: attachmentId === null ? undefined : [attachmentId],
    });
  };

  return (
    <View style={styles.wrapper} testID={testID ?? 'dynamic-status-actions'}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.actions}>
        {transitions.map((transition) => (
          <Button
            key={transition.id}
            label={transition.label}
            accessibilityHint={transition.description ?? undefined}
            tintColor={transition.color}
            disabled={disabled || isSubmitting}
            onPress={() => press(transition)}
            testID={`status-transition-${transition.key}`}
          />
        ))}
      </View>

      <Sheet
        visible={selected !== null}
        title={selected === null ? '' : `Zmiana statusu: ${selected.label}`}
        onClose={close}
        testID="status-transition-sheet">
        {selected === null ? null : (
          <>
            {selected.description === null ? null : (
              <ThemedText type="small" themeColor="textSecondary">
                {selected.description}
              </ThemedText>
            )}

            <TextField
              label={selected.requires_note ? 'Notatka (wymagana)' : 'Notatka (opcjonalna)'}
              value={note}
              onChangeText={(value) => {
                setNote(value);
                setValidationError(null);
              }}
              multiline
              placeholder="Opisz powód zmiany statusu"
              error={validationError}
              testID="status-transition-note"
            />

            {selected.requires_attachment ? (
              <OptionList
                label="Załącznik (wymagany)"
                options={attachments.map((attachment) => ({
                  value: attachment.id,
                  label: attachment.name,
                }))}
                value={attachmentId}
                onChange={setAttachmentId}
                emptyLabel="Brak załączników — dodaj materiał przed zmianą statusu."
              />
            ) : null}

            {submitError === null ? null : <ErrorState error={submitError} />}

            <Button
              label="Potwierdź zmianę statusu"
              onPress={confirm}
              loading={isSubmitting}
              testID="status-transition-confirm"
            />
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
});
