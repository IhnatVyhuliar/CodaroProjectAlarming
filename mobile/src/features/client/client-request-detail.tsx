import { useRouter } from 'expo-router';

import { AssignmentCard } from '@/components/assignment-card';
import { AttachmentList } from '@/components/attachment-list';
import { DynamicStatusActions } from '@/components/dynamic-status-actions';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HistoryTimeline } from '@/components/history-timeline';
import { LoadingState } from '@/components/loading-state';
import { PositionSuggestionCard } from '@/components/position-suggestion-card';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useRequest, useRequestHistory } from '@/hooks/queries/use-requests';
import {
  useChangeRequestStatus,
  useRequestStatusTransitions,
} from '@/hooks/queries/use-status-transitions';
import { formatDateTime } from '@/utils/format';

export interface ClientRequestDetailProps {
  requestId: number;
}

export function ClientRequestDetail({ requestId }: ClientRequestDetailProps) {
  const router = useRouter();
  const request = useRequest(requestId);
  const history = useRequestHistory(requestId);
  const transitions = useRequestStatusTransitions(requestId);
  const changeStatus = useChangeRequestStatus(requestId, request.data?.report_id ?? null);

  if (request.isPending) {
    return (
      <Screen title="Zadanie">
        <LoadingState />
      </Screen>
    );
  }

  if (request.isError || request.data === undefined) {
    return (
      <Screen title="Zadanie">
        <ErrorState error={request.error} onRetry={() => void request.refetch()} />
      </Screen>
    );
  }

  const detail = request.data;

  return (
    <Screen
      title={detail.name}
      subtitle={`Zadanie #${detail.id} w zgłoszeniu „${detail.report.name}”`}
      onRefresh={() => {
        void request.refetch();
        void history.refetch();
        void transitions.refetch();
      }}
      refreshing={request.isRefetching}>
      <Card>
        <StatusBadge status={detail.status} caption="status zadania" />
        {detail.description === null ? null : <ThemedText type="small">{detail.description}</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary">
          Utworzono: {formatDateTime(detail.created_at)}
        </ThemedText>
        <Button
          label="Przejdź do zgłoszenia"
          variant="secondary"
          onPress={() => router.push(`/(client)/reports/${detail.report_id}`)}
        />
      </Card>

      <DynamicStatusActions
        transitions={transitions.data}
        isLoading={transitions.isPending}
        error={transitions.isError ? transitions.error : null}
        attachments={detail.attachments}
        onSubmit={async (_transition, payload) => {
          await changeStatus.mutateAsync(payload);
        }}
      />

      <Section title="Propozycja stanowiska">
        {detail.position_suggestions.length === 0 ? (
          <EmptyState title="Brak propozycji dla tego zadania" />
        ) : (
          detail.position_suggestions.map((suggestion) => (
            <PositionSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              requestName={detail.name}
            />
          ))
        )}
      </Section>

      <Section
        title="Aktywne przydziały"
        description="Dane wykonawcy pojawiają się po przypisaniu przez administratora.">
        {detail.assignments.length === 0 ? (
          <EmptyState title="Brak przypisanych wykonawców" />
        ) : (
          detail.assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} requestName={detail.name} />
          ))
        )}
      </Section>

      <Section title="Materiały zadania">
        <AttachmentList attachments={detail.attachments} />
      </Section>

      <Section title="Historia zadania">
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
