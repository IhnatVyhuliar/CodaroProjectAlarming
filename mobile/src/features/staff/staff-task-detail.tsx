import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { LocalFileRef } from '@/api/types';
import { AttachmentList } from '@/components/attachment-list';
import { DynamicStatusActions } from '@/components/dynamic-status-actions';
import { ErrorState } from '@/components/error-state';
import { HistoryTimeline } from '@/components/history-timeline';
import { LoadingState } from '@/components/loading-state';
import { LocationMap } from '@/components/media/location-map';
import { PhotoCapture } from '@/components/media/photo-capture';
import { VoiceNoteRecorder } from '@/components/media/voice-note-recorder';
import { NavigateButton } from '@/components/navigate-button';
import { PermissionGate } from '@/components/permission-gate';
import { SiteInfo } from '@/components/site-info';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { assignmentScopeLabels, urgencyLabels } from '@/constants/domain';
import { useAddTaskAttachment, useAddTaskNote, useStaffTask } from '@/hooks/queries/use-staff-tasks';
import {
  useChangeReportStatus,
  useChangeRequestStatus,
  useReportStatusTransitions,
  useRequestStatusTransitions,
} from '@/hooks/queries/use-status-transitions';
import { useOfflineSubmit } from '@/offline/use-offline-submit';
import { formatDateTime } from '@/utils/format';

export interface StaffTaskDetailProps {
  assignmentId: number;
}

export function StaffTaskDetail({ assignmentId }: StaffTaskDetailProps) {
  const router = useRouter();
  const task = useStaffTask(assignmentId);
  const addNote = useAddTaskNote(assignmentId);
  const addAttachment = useAddTaskAttachment(assignmentId);
  const { submit } = useOfflineSubmit();

  const scope = task.data?.scope ?? null;
  const reportId = task.data?.report.id ?? null;
  const requestId = task.data?.request?.id ?? null;

  const reportTransitions = useReportStatusTransitions(scope === 'report' ? reportId : null);
  const requestTransitions = useRequestStatusTransitions(scope === 'request' ? requestId : null);
  const changeReportStatus = useChangeReportStatus(reportId ?? 0);
  const changeRequestStatus = useChangeRequestStatus(requestId ?? 0, reportId);

  const [note, setNote] = useState('');
  const [queuedInfo, setQueuedInfo] = useState<string | null>(null);

  if (task.isPending) {
    return (
      <Screen title="Zadanie">
        <LoadingState />
      </Screen>
    );
  }

  // A revoked or completed assignment loses access to operational data.
  if (task.isError || task.data === undefined) {
    return (
      <Screen title="Zadanie">
        <ErrorState
          error={task.error}
          title="Brak dostępu do tego zadania"
          onRetry={() => void task.refetch()}
        />
        <Button
          label="Wróć do listy zadań"
          onPress={() => router.replace('/(staff)')}
          testID="staff-task-back"
        />
      </Screen>
    );
  }

  const detail = task.data;

  const submitFile = async (file: LocalFileRef): Promise<void> => {
    const outcome = await submit(`Materiał do zadania #${assignmentId}`, () =>
      addAttachment.mutateAsync(file),
    );

    setQueuedInfo(outcome === 'queued' ? 'Materiał zostanie wysłany po odzyskaniu połączenia.' : null);
  };

  return (
    <Screen
      title={detail.title}
      subtitle={`${assignmentScopeLabels[detail.scope]}${
        detail.position_name === null ? '' : ` · ${detail.position_name}`
      }`}
      onRefresh={() => void task.refetch()}
      refreshing={task.isRefetching}>
      <Card>
        <StatusBadge status={detail.status} />
        <SiteInfo
          isEntrapment={detail.report.is_entrapment}
          siteAddress={detail.report.site_address}
          deviceLabel={detail.report.device_label}
        />
        <NavigateButton location={detail.location} address={detail.report.site_address} />
        {detail.description === null ? null : <ThemedText type="small">{detail.description}</ThemedText>}
        {detail.assignment.instruction === null ? null : (
          <ThemedText type="small">Instrukcja: {detail.assignment.instruction}</ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          Przypisano: {formatDateTime(detail.assignment.assigned_at)}
          {detail.assignment.assigned_by === null
            ? ''
            : ` · ${detail.assignment.assigned_by.name}`}
        </ThemedText>
        {detail.assignment.data_scope === null ? null : (
          <ThemedText type="small" themeColor="textSecondary">
            Udostępniony zakres danych: {detail.assignment.data_scope.label}
          </ThemedText>
        )}
      </Card>

      {queuedInfo === null ? null : (
        <ThemedText type="small" themeColor="warning">
          {queuedInfo}
        </ThemedText>
      )}

      <Section title="Dane zgłoszenia">
        <Card>
          <ThemedText type="smallBold">{detail.report.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Kategoria: {detail.report.category?.name ?? 'brak'} · Pilność:{' '}
            {urgencyLabels[detail.report.urgency]}
          </ThemedText>
          {detail.report.description === null ? null : (
            <ThemedText type="small">{detail.report.description}</ThemedText>
          )}
          {detail.report.client === null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Dane kontaktowe klienta nie są udostępnione w tym zakresie przydziału.
            </ThemedText>
          ) : (
            <>
              <ThemedText type="small">Klient: {detail.report.client.name}</ThemedText>
              {detail.report.client.phone === null ? null : (
                <ThemedText type="small">Telefon: {detail.report.client.phone}</ThemedText>
              )}
            </>
          )}
        </Card>
      </Section>

      <DynamicStatusActions
        transitions={scope === 'report' ? reportTransitions.data : requestTransitions.data}
        isLoading={scope === 'report' ? reportTransitions.isPending : requestTransitions.isPending}
        error={
          scope === 'report'
            ? reportTransitions.isError
              ? reportTransitions.error
              : null
            : requestTransitions.isError
              ? requestTransitions.error
              : null
        }
        attachments={detail.attachments}
        onSubmit={async (_transition, payload) => {
          const outcome = await submit(`Zmiana statusu zadania #${assignmentId}`, async () => {
            if (scope === 'report') {
              await changeReportStatus.mutateAsync(payload);

              return;
            }

            await changeRequestStatus.mutateAsync(payload);
          });

          setQueuedInfo(
            outcome === 'queued' ? 'Zmiana statusu zostanie wysłana po odzyskaniu połączenia.' : null,
          );

          await task.refetch();
        }}
      />

      <Section title="Lokalizacja obiektu">
        <LocationMap
          location={detail.location}
          address={detail.report.site_address}
          height={320}
        />
        <NavigateButton
          location={detail.location}
          address={detail.report.site_address}
          label="Nawiguj do obiektu"
        />
      </Section>

      <Section title="Udostępnione materiały">
        <AttachmentList attachments={detail.attachments} />
      </Section>

      <Section title="Notatki i materiały">
        <PermissionGate allowed={detail.capabilities.can_add_note}>
          <TextField
            label="Nowa notatka"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Zapisz ustalenia, wynik działania, przekazane informacje"
            testID="staff-note-input"
          />
          <Button
            label="Dodaj notatkę"
            loading={addNote.isPending}
            onPress={() => {
              if (note.trim().length === 0) {
                return;
              }

              void submit(`Notatka do zadania #${assignmentId}`, () =>
                addNote.mutateAsync(note.trim()),
              ).then((outcome) => {
                setNote('');
                setQueuedInfo(
                  outcome === 'queued' ? 'Notatka zostanie wysłana po odzyskaniu połączenia.' : null,
                );
              });
            }}
            testID="staff-note-submit"
          />
          {addNote.isError ? <ErrorState error={addNote.error} /> : null}
        </PermissionGate>

        <PermissionGate allowed={detail.capabilities.can_add_attachment}>
          <PhotoCapture onCaptured={(file) => void submitFile(file)} label="Dodaj zdjęcie" />
          <VoiceNoteRecorder onRecorded={(file) => void submitFile(file)} />
          {addAttachment.isError ? <ErrorState error={addAttachment.error} /> : null}
        </PermissionGate>
      </Section>

      <Section title="Historia w zakresie zadania">
        <HistoryTimeline entries={detail.history} />
      </Section>
    </Screen>
  );
}
