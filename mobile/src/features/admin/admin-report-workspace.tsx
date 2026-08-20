import { useRouter } from 'expo-router';
import { useState } from 'react';

import { reportsApi } from '@/api/endpoints/reports';
import type { Assignment, LocalFileRef } from '@/api/types';
import { AssignmentCard } from '@/components/assignment-card';
import { AssignmentForm } from '@/components/assignment-form';
import { AttachmentList } from '@/components/attachment-list';
import { DynamicStatusActions } from '@/components/dynamic-status-actions';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HistoryTimeline } from '@/components/history-timeline';
import { LoadingState } from '@/components/loading-state';
import { LocationMap } from '@/components/media/location-map';
import { PhotoCapture } from '@/components/media/photo-capture';
import { NavigateButton } from '@/components/navigate-button';
import { PermissionGate } from '@/components/permission-gate';
import { PositionSuggestionCard } from '@/components/position-suggestion-card';
import { RequestCard } from '@/components/request-card';
import { SiteInfo } from '@/components/site-info';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { locationModeLabels, urgencyLabels } from '@/constants/domain';
import { useSessionStore } from '@/auth/session-store';
import {
  useCreateAssignment,
  useReportAssignments,
  useRevokeAssignment,
  useUpdateAssignment,
} from '@/hooks/queries/use-assignments';
import { useAssignmentDataScopes, usePositions } from '@/hooks/queries/use-dictionaries';
import { useClaimReport } from '@/hooks/queries/use-queue';
import {
  useReport,
  useReportHistory,
  useUploadReportAttachment,
} from '@/hooks/queries/use-reports';
import {
  useChangeReportStatus,
  useReportStatusTransitions,
} from '@/hooks/queries/use-status-transitions';
import { useReviewSuggestion } from '@/hooks/queries/use-suggestions';
import { useOfflineSubmit } from '@/offline/use-offline-submit';
import { formatDateTime } from '@/utils/format';

export interface AdminReportWorkspaceProps {
  reportId: number;
}

export function AdminReportWorkspace({ reportId }: AdminReportWorkspaceProps) {
  const router = useRouter();
  const currentUser = useSessionStore((state) => state.user);

  const report = useReport(reportId);
  const history = useReportHistory(reportId);
  const assignmentHistory = useReportAssignments(reportId, true);
  const transitions = useReportStatusTransitions(reportId);
  const positions = usePositions();
  const dataScopes = useAssignmentDataScopes();

  const changeStatus = useChangeReportStatus(reportId);
  const createAssignment = useCreateAssignment(reportId);
  const updateAssignment = useUpdateAssignment(reportId);
  const revokeAssignment = useRevokeAssignment(reportId);
  const reviewSuggestion = useReviewSuggestion(reportId);
  const uploadAttachment = useUploadReportAttachment(reportId);
  const claim = useClaimReport();
  const { submit } = useOfflineSubmit();

  const [assignmentSheetRequestId, setAssignmentSheetRequestId] = useState<number | null>(null);
  const [isAssignmentSheetOpen, setIsAssignmentSheetOpen] = useState(false);
  const [replaceSuggestionId, setReplaceSuggestionId] = useState<number | null>(null);
  const [replacementPositionId, setReplacementPositionId] = useState<number | null>(null);
  const [editedAssignment, setEditedAssignment] = useState<Assignment | null>(null);
  const [editPositionId, setEditPositionId] = useState<number | null>(null);
  const [editDataScope, setEditDataScope] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [queuedInfo, setQueuedInfo] = useState<string | null>(null);

  if (report.isPending) {
    return (
      <Screen title="Stanowisko obsługi">
        <LoadingState />
      </Screen>
    );
  }

  if (report.isError || report.data === undefined) {
    return (
      <Screen title="Stanowisko obsługi">
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      </Screen>
    );
  }

  const detail = report.data;
  const activeAssignments = detail.assignments.filter((assignment) => assignment.is_active);
  const requestName = (requestId: number | null): string | null =>
    detail.requests.find((request) => request.id === requestId)?.name ?? null;

  const openAssignmentSheet = (requestId: number | null): void => {
    setAssignmentSheetRequestId(requestId);
    setIsAssignmentSheetOpen(true);
  };

  const openEditSheet = (assignment: Assignment): void => {
    setEditedAssignment(assignment);
    setEditPositionId(assignment.position?.id ?? null);
    setEditDataScope(assignment.data_scope?.key ?? null);
    setEditInstruction(assignment.instruction ?? '');
  };

  const addFile = async (file: LocalFileRef): Promise<void> => {
    const outcome = await submit(`Załącznik do zgłoszenia #${reportId}`, () =>
      uploadAttachment.mutateAsync({ file }),
    );

    setQueuedInfo(outcome === 'queued' ? 'Materiał zostanie wysłany po odzyskaniu połączenia.' : null);
  };

  return (
    <Screen
      title={detail.name}
      subtitle={`Zgłoszenie #${detail.id} · ${formatDateTime(detail.created_at)}`}
      onRefresh={() => {
        void report.refetch();
        void history.refetch();
        void transitions.refetch();
        void assignmentHistory.refetch();
      }}
      refreshing={report.isRefetching}>
      <Card>
        <StatusBadge status={detail.status} />
        <SiteInfo
          isEntrapment={detail.is_entrapment}
          siteAddress={detail.site_address}
          deviceLabel={detail.device_label}
        />
        <ThemedText type="small">{detail.description}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Kategoria: {detail.category?.name ?? 'brak'} · Pilność: {urgencyLabels[detail.urgency]}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Opiekun: {detail.assigned_admin?.name ?? 'brak'}
        </ThemedText>
        {detail.assigned_admin?.id === currentUser?.id ? null : (
          <Button
            label="Przypisz zgłoszenie do siebie"
            loading={claim.isPending}
            onPress={() => claim.mutate(reportId)}
            testID="workspace-claim"
          />
        )}
        {claim.isError ? <ErrorState error={claim.error} /> : null}
      </Card>

      <Section title="Dane klienta">
        {detail.client === null ? (
          <EmptyState title="Brak danych klienta" />
        ) : (
          <Card>
            <ThemedText type="smallBold">{detail.client.name}</ThemedText>
            {detail.client.phone === null ? null : (
              <ThemedText type="small">Telefon: {detail.client.phone}</ThemedText>
            )}
            {detail.client.email === null ? null : (
              <ThemedText type="small">E-mail: {detail.client.email}</ThemedText>
            )}
          </Card>
        )}
      </Section>

      {queuedInfo === null ? null : (
        <ThemedText type="small" themeColor="warning">
          {queuedInfo}
        </ThemedText>
      )}

      <DynamicStatusActions
        transitions={transitions.data}
        isLoading={transitions.isPending}
        error={transitions.isError ? transitions.error : null}
        attachments={detail.attachments}
        onSubmit={async (_transition, payload) => {
          const outcome = await submit(`Zmiana statusu zgłoszenia #${reportId}`, () =>
            changeStatus.mutateAsync(payload),
          );

          setQueuedInfo(
            outcome === 'queued' ? 'Zmiana statusu zostanie wysłana po odzyskaniu połączenia.' : null,
          );
        }}
      />

      <Section title="Zadania w zgłoszeniu">
        {detail.requests.length === 0 ? (
          <EmptyState title="Zgłoszenie nie ma zadań" />
        ) : (
          detail.requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => router.push(`/(admin)/requests/${request.id}`)}
              footer={
                <PermissionGate allowed={detail.capabilities.can_manage_assignments}>
                  <Button
                    label="Przypisz wykonawcę do zadania"
                    variant="secondary"
                    onPress={() => openAssignmentSheet(request.id)}
                    testID={`assign-request-${request.id}`}
                  />
                </PermissionGate>
              }
            />
          ))
        )}
      </Section>

      <Section
        title="Propozycje stanowisk klienta"
        description="Propozycja nie tworzy uprawnień — decyzja należy do Ciebie.">
        {detail.position_suggestions.length === 0 ? (
          <EmptyState title="Klient nie zaproponował stanowiska" />
        ) : (
          detail.position_suggestions.map((suggestion) => (
            <PositionSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              requestName={requestName(suggestion.request_id)}
              isBusy={reviewSuggestion.isPending}
              onAccept={
                suggestion.status === 'pending'
                  ? () =>
                      reviewSuggestion.mutate({
                        suggestionId: suggestion.id,
                        payload: { decision: 'accepted' },
                      })
                  : undefined
              }
              onReplace={
                suggestion.status === 'pending'
                  ? () => {
                      setReplaceSuggestionId(suggestion.id);
                      setReplacementPositionId(null);
                    }
                  : undefined
              }
              onReject={
                suggestion.status === 'pending'
                  ? () =>
                      reviewSuggestion.mutate({
                        suggestionId: suggestion.id,
                        payload: { decision: 'rejected' },
                      })
                  : undefined
              }
            />
          ))
        )}
        {reviewSuggestion.isError ? <ErrorState error={reviewSuggestion.error} /> : null}
      </Section>

      <Section
        title="Aktualne przydziały"
        description={
          activeAssignments.length === 0
            ? 'Zgłoszenie jest realizowane wyłącznie przez administratora.'
            : undefined
        }>
        {activeAssignments.length === 0 ? (
          <EmptyState
            title="Brak pracownika i służby"
            description="To poprawny stan — całą obsługę prowadzi administrator."
            testID="workspace-no-assignments"
          />
        ) : (
          activeAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              requestName={requestName(assignment.request_id)}
              onChange={() => openEditSheet(assignment)}
              onRevoke={() => revokeAssignment.mutate({ assignmentId: assignment.id })}
              isRevoking={revokeAssignment.isPending}
            />
          ))
        )}

        <PermissionGate allowed={detail.capabilities.can_manage_assignments}>
          <Button
            label="Przypisz pracownika lub służbę"
            onPress={() => openAssignmentSheet(null)}
            testID="open-assignment-form"
          />
        </PermissionGate>

        {revokeAssignment.isError ? <ErrorState error={revokeAssignment.error} /> : null}
      </Section>

      <Section title="Historia przydziałów">
        {assignmentHistory.isPending ? <LoadingState /> : null}
        {assignmentHistory.isError ? (
          <ErrorState error={assignmentHistory.error} onRetry={() => void assignmentHistory.refetch()} />
        ) : (assignmentHistory.data ?? []).filter((assignment) => !assignment.is_active).length === 0 ? (
          <EmptyState title="Brak zakończonych przydziałów" />
        ) : (
          (assignmentHistory.data ?? [])
            .filter((assignment) => !assignment.is_active)
            .map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                requestName={requestName(assignment.request_id)}
              />
            ))
        )}
      </Section>

      <Section title="Obiekt, lokalizacja i transmisje">
        <Card>
          <SiteInfo
            isEntrapment={detail.is_entrapment}
            siteAddress={detail.site_address}
            deviceLabel={detail.device_label}
          />
          <ThemedText type="small">
            Tryb lokalizacji: {locationModeLabels[detail.location_mode]}
          </ThemedText>
          <LocationMap location={detail.location} address={detail.site_address} height={300} />
          <NavigateButton
            location={detail.location}
            address={detail.site_address}
            label="Pokaż dojazd na mapie"
          />
          {detail.media_sessions
            .filter((session) => session.is_live)
            .map((session) => (
              <ThemedText key={session.id} type="small" themeColor="warning">
                Transmisja na żywo ({session.kind}) od {formatDateTime(session.started_at)}
              </ThemedText>
            ))}
        </Card>
      </Section>

      <Section title="Załączniki">
        <AttachmentList attachments={detail.attachments} />
        <PermissionGate allowed={detail.capabilities.can_add_attachment}>
          <PhotoCapture onCaptured={(file) => void addFile(file)} label="Dodaj zdjęcie" />
        </PermissionGate>
      </Section>

      <Section title="Historia zmian">
        {history.isPending ? <LoadingState /> : null}
        {history.isError ? (
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : (
          <HistoryTimeline entries={history.data ?? []} />
        )}
      </Section>

      <Sheet
        visible={isAssignmentSheetOpen}
        title="Nowy przydział"
        onClose={() => setIsAssignmentSheetOpen(false)}
        testID="assignment-sheet">
        <AssignmentForm
          requests={detail.requests}
          positions={positions.data}
          dataScopes={dataScopes.data}
          initialRequestId={assignmentSheetRequestId}
          initialPositionId={
            detail.position_suggestions.find(
              (suggestion) =>
                suggestion.request_id === assignmentSheetRequestId && suggestion.status === 'pending',
            )?.position.id ?? null
          }
          onSubmit={async (payload) => {
            await createAssignment.mutateAsync(payload);
          }}
          onHandleAloneByAdmin={async () => {
            await reportsApi.markHandledByAdminOnly(reportId);
            await report.refetch();
            await history.refetch();
            setIsAssignmentSheetOpen(false);
          }}
        />
      </Sheet>

      <Sheet
        visible={replaceSuggestionId !== null}
        title="Wskaż inne stanowisko"
        onClose={() => setReplaceSuggestionId(null)}>
        <OptionList
          label="Stanowisko"
          options={(positions.data ?? []).map((position) => ({
            value: position.id,
            label: position.name,
            description: position.description,
          }))}
          value={replacementPositionId}
          onChange={setReplacementPositionId}
        />
        <Button
          label="Zapisz decyzję"
          loading={reviewSuggestion.isPending}
          onPress={() => {
            if (replaceSuggestionId === null || replacementPositionId === null) {
              return;
            }

            reviewSuggestion.mutate(
              {
                suggestionId: replaceSuggestionId,
                payload: { decision: 'replaced', position_id: replacementPositionId },
              },
              { onSuccess: () => setReplaceSuggestionId(null) },
            );
          }}
        />
      </Sheet>

      <Sheet
        visible={editedAssignment !== null}
        title="Zmiana przydziału"
        onClose={() => setEditedAssignment(null)}>
        <OptionList
          label="Stanowisko"
          options={(positions.data ?? []).map((position) => ({
            value: position.id,
            label: position.name,
          }))}
          value={editPositionId}
          onChange={setEditPositionId}
        />
        <OptionList
          label="Zakres udostępnionych danych"
          options={(dataScopes.data ?? []).map((scope) => ({
            value: scope.key,
            label: scope.label,
            description: scope.description,
          }))}
          value={editDataScope}
          onChange={setEditDataScope}
        />
        <TextField
          label="Instrukcja"
          value={editInstruction}
          onChangeText={setEditInstruction}
          multiline
        />
        <Button
          label="Zapisz zmiany"
          loading={updateAssignment.isPending}
          onPress={() => {
            if (editedAssignment === null) {
              return;
            }

            updateAssignment.mutate(
              {
                assignmentId: editedAssignment.id,
                payload: {
                  position_id: editPositionId,
                  data_scope: editDataScope ?? undefined,
                  instruction: editInstruction.trim().length > 0 ? editInstruction.trim() : null,
                },
              },
              { onSuccess: () => setEditedAssignment(null) },
            );
          }}
        />
        {updateAssignment.isError ? <ErrorState error={updateAssignment.error} /> : null}
      </Sheet>
    </Screen>
  );
}
