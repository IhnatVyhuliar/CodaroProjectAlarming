import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/errors';
import type {
  AssigneeType,
  AssignmentScope,
  CreateAssignmentPayload,
  DataScopeOption,
  Position,
  RequestSummary,
} from '@/api/types';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionList } from '@/components/ui/option-list';
import { TextField } from '@/components/ui/text-field';
import { assigneeTypeLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';
import { useDirectoryServices, useDirectoryStaff } from '@/hooks/queries/use-directory';

export interface AssignmentFormProps {
  requests: RequestSummary[];
  positions: Position[] | undefined;
  dataScopes: DataScopeOption[] | undefined;
  /** Preselects the scope, e.g. when opened from a specific request. */
  initialRequestId?: number | null;
  initialPositionId?: number | null;
  onSubmit: (payload: CreateAssignmentPayload) => Promise<void>;
  /** Explicit "no additional assignee" decision — never a validation error. */
  onHandleAloneByAdmin?: () => Promise<void>;
  submitLabel?: string;
  testID?: string;
}

export function AssignmentForm({
  requests,
  positions,
  dataScopes,
  initialRequestId = null,
  initialPositionId = null,
  onSubmit,
  onHandleAloneByAdmin,
  submitLabel = 'Przypisz wykonawcę',
  testID,
}: AssignmentFormProps) {
  const [scope, setScope] = useState<AssignmentScope>(
    initialRequestId === null ? 'report' : 'request',
  );
  const [requestId, setRequestId] = useState<number | null>(initialRequestId);
  const [assigneeType, setAssigneeType] = useState<AssigneeType>('staff');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(initialPositionId);
  const [dataScope, setDataScope] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedLabel, setLastCreatedLabel] = useState<string | null>(null);

  const staffQuery = useDirectoryStaff(positionId, '', assigneeType === 'staff');
  const servicesQuery = useDirectoryServices('', assigneeType === 'service');

  // Request-scoped assignments default to the narrowest scope the API offers for them.
  const preferredScope =
    scope === 'request'
      ? dataScopes?.find((option) => option.key === 'request_only')
      : undefined;
  const effectiveDataScope =
    dataScope ?? preferredScope?.key ?? dataScopes?.[0]?.key ?? 'minimal';

  const submit = async (): Promise<void> => {
    if (assigneeId === null) {
      setValidationError('Wybierz pracownika lub służbę, albo zaznacz obsługę przez administratora.');

      return;
    }

    if (scope === 'request' && requestId === null) {
      setValidationError('Wskaż zadanie, którego dotyczy przydział.');

      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setValidationError(null);

    try {
      await onSubmit({
        request_id: scope === 'request' ? requestId : null,
        assignee_type: assigneeType,
        assignee_id: assigneeId,
        position_id: positionId,
        data_scope: effectiveDataScope,
        instruction: instruction.trim().length > 0 ? instruction.trim() : null,
      });

      setLastCreatedLabel(assigneeTypeLabels[assigneeType]);
      setAssigneeId(null);
      setInstruction('');
    } catch (error) {
      setSubmitError(error);
      setValidationError(toApiError(error).fieldError('assignee_id'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAlone = async (): Promise<void> => {
    if (onHandleAloneByAdmin === undefined) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setValidationError(null);

    try {
      await onHandleAloneByAdmin();
      setLastCreatedLabel(null);
    } catch (error) {
      setSubmitError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assigneeOptions =
    assigneeType === 'staff'
      ? (staffQuery.data ?? []).map((member) => ({
          value: member.id,
          label: member.name,
          description: [
            member.position?.name ?? null,
            member.organization_name,
            `aktywne zadania: ${member.active_assignments_count}`,
          ]
            .filter((part): part is string => part !== null)
            .join(' · '),
        }))
      : (servicesQuery.data ?? []).map((service) => ({
          value: service.id,
          label: service.name,
          description: [
            service.description,
            service.position?.name ?? null,
            service.is_available ? 'dostępna' : 'niedostępna',
          ]
            .filter((part): part is string => part !== null)
            .join(' · '),
        }));

  const isLoadingAssignees =
    assigneeType === 'staff' ? staffQuery.isLoading : servicesQuery.isLoading;

  return (
    <View style={styles.form} testID={testID ?? 'assignment-form'}>
      <OptionList
        label="Zakres przydziału"
        options={[
          { value: 'report', label: 'Całe zgłoszenie' },
          { value: 'request', label: 'Wybrane zadanie' },
        ]}
        value={scope}
        onChange={(next) => {
          setScope(next);

          if (next === 'report') {
            setRequestId(null);
          }
        }}
        inline
      />

      {scope === 'request' ? (
        <OptionList
          label="Zadanie"
          options={requests.map((request) => ({
            value: request.id,
            label: request.name,
            description: request.suggested_position === null
              ? null
              : `Propozycja klienta: ${request.suggested_position.name}`,
          }))}
          value={requestId}
          onChange={setRequestId}
          emptyLabel="To zgłoszenie nie ma jeszcze zadań."
        />
      ) : null}

      <OptionList
        label="Typ wykonawcy"
        options={[
          { value: 'staff', label: assigneeTypeLabels.staff },
          { value: 'service', label: assigneeTypeLabels.service },
        ]}
        value={assigneeType}
        onChange={(next) => {
          setAssigneeType(next);
          setAssigneeId(null);
        }}
        inline
        testID="assignee-type-selector"
      />

      <OptionList
        label="Stanowisko, w jakim występuje wykonawca"
        hint="Możesz zaakceptować stanowisko proponowane przez klienta lub wybrać inne."
        options={(positions ?? []).map((position) => ({
          value: position.id,
          label: position.name,
          description: position.description,
        }))}
        value={positionId}
        onChange={(next) => {
          setPositionId(next);
          setAssigneeId(null);
        }}
      />

      {isLoadingAssignees ? (
        <LoadingState label="Wczytywanie dostępnych wykonawców…" />
      ) : (
        <OptionList
          label={assigneeType === 'staff' ? 'Dostępni pracownicy' : 'Dostępne służby'}
          options={assigneeOptions}
          value={assigneeId}
          onChange={(next) => {
            setAssigneeId(next);
            setValidationError(null);
          }}
          emptyLabel="Brak wykonawców spełniających kryteria."
          testID="assignee-selector"
        />
      )}

      <OptionList
        label="Zakres udostępnionych danych"
        options={(dataScopes ?? []).map((option) => ({
          value: option.key,
          label: option.label,
          description: option.description,
        }))}
        value={effectiveDataScope}
        onChange={setDataScope}
      />

      <TextField
        label="Instrukcja (opcjonalna)"
        value={instruction}
        onChangeText={setInstruction}
        multiline
        placeholder="Informacje potrzebne wykonawcy"
      />

      {validationError === null ? null : (
        <ThemedText type="small" themeColor="danger">
          {validationError}
        </ThemedText>
      )}

      {submitError === null ? null : <ErrorState error={submitError} />}

      {lastCreatedLabel === null ? null : (
        <ThemedText type="small" themeColor="success">
          Przydział zapisany. Możesz dodać kolejnego wykonawcę — pracownika i służbę jednocześnie.
        </ThemedText>
      )}

      <Button
        label={submitLabel}
        onPress={() => void submit()}
        loading={isSubmitting}
        testID="assignment-submit"
      />

      {onHandleAloneByAdmin === undefined ? null : (
        <Button
          label="Realizowane tylko przez administratora"
          variant="ghost"
          onPress={() => void handleAlone()}
          accessibilityHint="Zgłoszenie pozostaje bez pracownika i służby."
          testID="assignment-admin-only"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
});
