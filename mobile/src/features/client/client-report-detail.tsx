import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { LocalFileRef } from '@/api/types';
import { AssignmentCard } from '@/components/assignment-card';
import { AttachmentList } from '@/components/attachment-list';
import { DynamicStatusActions } from '@/components/dynamic-status-actions';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HistoryTimeline } from '@/components/history-timeline';
import { LoadingState } from '@/components/loading-state';
import { LocationMap } from '@/components/media/location-map';
import { PhotoCapture } from '@/components/media/photo-capture';
import { VoiceNoteRecorder } from '@/components/media/voice-note-recorder';
import { PermissionGate } from '@/components/permission-gate';
import { PositionSuggestionCard } from '@/components/position-suggestion-card';
import { PositionSuggestionSelector } from '@/components/position-suggestion-selector';
import { RequestCard } from '@/components/request-card';
import { SiteInfo } from '@/components/site-info';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { locationModeLabels, urgencyLabels } from '@/constants/domain';
import { usePositions } from '@/hooks/queries/use-dictionaries';
import {
  useReport,
  useReportHistory,
  useStopLocationStream,
  useUploadReportAttachment,
} from '@/hooks/queries/use-reports';
import {
  useChangeReportStatus,
  useReportStatusTransitions,
} from '@/hooks/queries/use-status-transitions';
import { useCreateSuggestion } from '@/hooks/queries/use-suggestions';
import { useOfflineSubmit } from '@/offline/use-offline-submit';
import { formatDateTime } from '@/utils/format';

export interface ClientReportDetailProps {
  reportId: number;
}

export function ClientReportDetail({ reportId }: ClientReportDetailProps) {
  const router = useRouter();
  const report = useReport(reportId);
  const history = useReportHistory(reportId);
  const transitions = useReportStatusTransitions(reportId);
  const changeStatus = useChangeReportStatus(reportId);
  const positions = usePositions();
  const createSuggestion = useCreateSuggestion(reportId);
  const uploadAttachment = useUploadReportAttachment(reportId);
  const stopStream = useStopLocationStream(reportId);
  const { submit } = useOfflineSubmit();

  const [suggestionPositionId, setSuggestionPositionId] = useState<number | null>(null);
  const [queuedInfo, setQueuedInfo] = useState<string | null>(null);

  const addFile = async (file: LocalFileRef): Promise<void> => {
    const outcome = await submit(`Załącznik do zgłoszenia #${reportId}`, () =>
      uploadAttachment.mutateAsync({ file }),
    );

    setQueuedInfo(
      outcome === 'queued' ? 'Materiał zostanie wysłany po odzyskaniu połączenia.' : null,
    );
  };

  if (report.isPending) {
    return (
      <Screen title="Zgłoszenie">
        <LoadingState />
      </Screen>
    );
  }

  if (report.isError || report.data === undefined) {
    return (
      <Screen title="Zgłoszenie">
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      </Screen>
    );
  }

  const detail = report.data;

  return (
    <Screen
      title={detail.name}
      subtitle={`Zgłoszenie #${detail.id} · ${formatDateTime(detail.created_at)}`}
      onRefresh={() => {
        void report.refetch();
        void history.refetch();
        void transitions.refetch();
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
        {detail.assigned_admin === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            Zgłoszenie oczekuje na przyjęcie przez administratora.
          </ThemedText>
        ) : (
          <ThemedText type="small">Opiekun zgłoszenia: {detail.assigned_admin.name}</ThemedText>
        )}
        {detail.closed_at === null ? null : (
          <ThemedText type="small" themeColor="textSecondary">
            Zamknięto: {formatDateTime(detail.closed_at)}
          </ThemedText>
        )}
      </Card>

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
            outcome === 'queued'
              ? 'Zmiana statusu zostanie wysłana po odzyskaniu połączenia.'
              : null,
          );
        }}
      />

      <Section title="Zadania">
        {detail.requests.length === 0 ? (
          <EmptyState title="Brak zadań w tym zgłoszeniu" />
        ) : (
          detail.requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => router.push(`/(client)/requests/${request.id}`)}
            />
          ))
        )}
      </Section>

      <Section
        title="Przypisani wykonawcy"
        description="Dane wykonawcy widzisz dopiero po jego przypisaniu przez administratora.">
        {detail.assignments.length === 0 ? (
          <EmptyState
            title="Brak przypisanych wykonawców"
            description={
              detail.handled_by_admin_only
                ? 'Zgłoszenie jest realizowane wyłącznie przez administratora.'
                : 'Administrator jeszcze nie przypisał pracownika ani służby.'
            }
            testID="client-assignments-empty"
          />
        ) : (
          detail.assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              requestName={
                detail.requests.find((request) => request.id === assignment.request_id)?.name ?? null
              }
            />
          ))
        )}
      </Section>

      <Section
        title="Propozycje stanowisk"
        description="Propozycja to informacja dla administratora — nie daje nikomu dostępu do zgłoszenia.">
        {detail.position_suggestions.length === 0 ? (
          <EmptyState title="Brak propozycji stanowisk" />
        ) : (
          detail.position_suggestions.map((suggestion) => (
            <PositionSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              requestName={
                detail.requests.find((request) => request.id === suggestion.request_id)?.name ?? null
              }
            />
          ))
        )}

        <PermissionGate allowed={detail.capabilities.can_suggest_position}>
          <PositionSuggestionSelector
            positions={positions.data}
            isLoading={positions.isPending}
            value={suggestionPositionId}
            onChange={setSuggestionPositionId}
            label="Zaproponuj stanowisko dla zgłoszenia"
          />
          <Button
            label="Wyślij propozycję"
            variant="secondary"
            loading={createSuggestion.isPending}
            onPress={() => {
              if (suggestionPositionId === null) {
                return;
              }

              createSuggestion.mutate(
                { position_id: suggestionPositionId, request_id: null, note: null },
                { onSuccess: () => setSuggestionPositionId(null) },
              );
            }}
            testID="client-send-suggestion"
          />
          {createSuggestion.isError ? <ErrorState error={createSuggestion.error} /> : null}
        </PermissionGate>
      </Section>

      <Section title="Lokalizacja i transmisje">
        <Card>
          <ThemedText type="small">
            Tryb lokalizacji: {locationModeLabels[detail.location_mode]}
          </ThemedText>
          <LocationMap location={detail.location} address={detail.site_address} height={260} />
          {detail.media_sessions
            .filter((session) => session.is_live)
            .map((session) => (
              <ThemedText key={session.id} type="small" themeColor="warning">
                Trwa transmisja ({session.kind}) od {formatDateTime(session.started_at)}
              </ThemedText>
            ))}
          {detail.has_live_stream ? (
            <Button
              label="Zatrzymaj transmisję"
              variant="danger"
              loading={stopStream.isPending}
              onPress={() => stopStream.mutate()}
            />
          ) : null}
        </Card>
      </Section>

      <Section title="Materiały">
        <AttachmentList attachments={detail.attachments} />
        <PermissionGate allowed={detail.capabilities.can_add_attachment}>
          <PhotoCapture onCaptured={(file) => void addFile(file)} />
          <VoiceNoteRecorder onRecorded={(file) => void addFile(file)} />
          {uploadAttachment.isError ? <ErrorState error={uploadAttachment.error} /> : null}
        </PermissionGate>
      </Section>

      <Section title="Historia zgłoszenia">
        {history.isPending ? <LoadingState /> : null}
        {history.isError ? (
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : (
          <HistoryTimeline entries={history.data ?? []} />
        )}
      </Section>
    </Screen>
  );
}
