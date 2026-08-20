import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { Assignment } from '@/api/types';
import { AssignmentCard } from '@/components/assignment-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { assigneeTypeLabels } from '@/constants/domain';
import {
  useActiveAssignments,
  useRevokeAssignment,
  useUpdateAssignment,
} from '@/hooks/queries/use-assignments';
import { useAssignmentDataScopes, usePositions } from '@/hooks/queries/use-dictionaries';
import { formatDateTime } from '@/utils/format';

export function AdminAssignments() {
  const router = useRouter();
  const assignments = useActiveAssignments();
  const positions = usePositions();
  const dataScopes = useAssignmentDataScopes();
  const updateAssignment = useUpdateAssignment(null);
  const revokeAssignment = useRevokeAssignment(null);

  const [scopeFilter, setScopeFilter] = useState<'all' | 'report' | 'request'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'staff' | 'service'>('all');
  const [edited, setEdited] = useState<Assignment | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [dataScope, setDataScope] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');

  const visible = (assignments.data ?? []).filter((assignment) => {
    const scopeMatches = scopeFilter === 'all' || assignment.scope === scopeFilter;
    const typeMatches = typeFilter === 'all' || assignment.assignee.type === typeFilter;

    return scopeMatches && typeMatches;
  });

  return (
    <Screen
      title="Aktywne przydziały"
      onRefresh={() => void assignments.refetch()}
      refreshing={assignments.isRefetching}>
      <OptionList
        label="Zakres"
        options={[
          { value: 'all', label: 'Wszystkie' },
          { value: 'report', label: 'Zgłoszenie' },
          { value: 'request', label: 'Zadanie' },
        ]}
        value={scopeFilter}
        onChange={setScopeFilter}
        inline
      />

      <OptionList
        label="Typ wykonawcy"
        options={[
          { value: 'all', label: 'Wszyscy' },
          { value: 'staff', label: assigneeTypeLabels.staff },
          { value: 'service', label: assigneeTypeLabels.service },
        ]}
        value={typeFilter}
        onChange={setTypeFilter}
        inline
      />

      {assignments.isPending ? <LoadingState /> : null}
      {assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />
      ) : null}

      {assignments.data !== undefined && visible.length === 0 ? (
        <EmptyState
          title="Brak aktywnych przydziałów"
          description="Zgłoszenia mogą być realizowane wyłącznie przez administratorów."
        />
      ) : null}

      {visible.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          onOpenReport={() => router.push(`/(admin)/reports/${assignment.report_id}`)}
          onChange={() => {
            setEdited(assignment);
            setPositionId(assignment.position?.id ?? null);
            setDataScope(assignment.data_scope?.key ?? null);
            setInstruction(assignment.instruction ?? '');
          }}
          onRevoke={() => revokeAssignment.mutate({ assignmentId: assignment.id })}
          isRevoking={revokeAssignment.isPending}
        />
      ))}

      {revokeAssignment.isError ? <ErrorState error={revokeAssignment.error} /> : null}

      <Sheet visible={edited !== null} title="Zmiana przydziału" onClose={() => setEdited(null)}>
        {edited === null ? null : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {edited.assignee.display_name} · przypisano {formatDateTime(edited.assigned_at)}
            </ThemedText>
            <OptionList
              label="Stanowisko"
              options={(positions.data ?? []).map((position) => ({
                value: position.id,
                label: position.name,
              }))}
              value={positionId}
              onChange={setPositionId}
            />
            <OptionList
              label="Zakres udostępnionych danych"
              options={(dataScopes.data ?? []).map((scope) => ({
                value: scope.key,
                label: scope.label,
                description: scope.description,
              }))}
              value={dataScope}
              onChange={setDataScope}
            />
            <TextField
              label="Instrukcja"
              value={instruction}
              onChangeText={setInstruction}
              multiline
            />
            <Button
              label="Zapisz zmiany"
              loading={updateAssignment.isPending}
              onPress={() =>
                updateAssignment.mutate(
                  {
                    assignmentId: edited.id,
                    payload: {
                      position_id: positionId,
                      data_scope: dataScope ?? undefined,
                      instruction: instruction.trim().length > 0 ? instruction.trim() : null,
                    },
                  },
                  { onSuccess: () => setEdited(null) },
                )
              }
            />
            {updateAssignment.isError ? <ErrorState error={updateAssignment.error} /> : null}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
