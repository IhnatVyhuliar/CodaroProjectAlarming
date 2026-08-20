import { useRouter } from 'expo-router';

import { AssignmentCard } from '@/components/assignment-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PositionSuggestionCard } from '@/components/position-suggestion-card';
import { ReportCard } from '@/components/report-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { urgencyLabels, urgencyOrder } from '@/constants/domain';
import { useAdminDashboard } from '@/hooks/queries/use-queue';
import { useNetworkStore } from '@/offline/network-store';
import { useOperationQueue } from '@/offline/operation-queue';

export function AdminDashboard() {
  const router = useRouter();
  const dashboard = useAdminDashboard();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const pending = useOperationQueue((state) => state.pending);
  const lastError = useOperationQueue((state) => state.lastError);

  return (
    <Screen
      title="Pulpit administratora"
      onRefresh={() => void dashboard.refetch()}
      refreshing={dashboard.isRefetching}>
      {dashboard.isPending ? <LoadingState /> : null}
      {dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : null}

      {dashboard.data === undefined ? null : (
        <>
          <Section title="Kolejka globalna">
            <Card onPress={() => router.push('/(admin)/queue')}>
              <ThemedText type="smallBold">
                Zgłoszenia oczekujące: {dashboard.data.queue.total}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {urgencyOrder
                  .slice()
                  .reverse()
                  .map((level) => `${urgencyLabels[level]}: ${dashboard.data.queue.by_urgency[level]}`)
                  .join(' · ')}
              </ThemedText>
              {dashboard.data.queue.oldest_waiting_minutes === null ? null : (
                <ThemedText type="small" themeColor="textSecondary">
                  Najdłużej oczekujące: {dashboard.data.queue.oldest_waiting_minutes} min
                </ThemedText>
              )}
            </Card>
            <Button
              label="Przejdź do kolejki"
              variant="secondary"
              onPress={() => router.push('/(admin)/queue')}
            />
          </Section>

          <Section title="Aktualnie obsługiwane zgłoszenia">
            {dashboard.data.handled_reports.length === 0 ? (
              <EmptyState
                title="Nie obsługujesz żadnego zgłoszenia"
                description="Przyjmij zgłoszenie z kolejki globalnej."
                actionLabel="Kolejka globalna"
                onAction={() => router.push('/(admin)/queue')}
              />
            ) : (
              dashboard.data.handled_reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  showClient
                  onPress={() => router.push(`/(admin)/reports/${report.id}`)}
                />
              ))
            )}
          </Section>

          <Section
            title="Propozycje stanowisk"
            description="Propozycje klientów oczekujące na Twoją decyzję.">
            {dashboard.data.pending_suggestions.length === 0 ? (
              <EmptyState title="Brak propozycji oczekujących na decyzję" />
            ) : (
              dashboard.data.pending_suggestions.map((suggestion) => (
                <PositionSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  testID={`dashboard-suggestion-${suggestion.id}`}
                />
              ))
            )}
          </Section>

          <Section title="Aktywne przydziały">
            {dashboard.data.active_assignments.length === 0 ? (
              <EmptyState title="Brak aktywnych przydziałów" />
            ) : (
              dashboard.data.active_assignments
                .slice(0, 5)
                .map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onOpenReport={() => router.push(`/(admin)/reports/${assignment.report_id}`)}
                  />
                ))
            )}
            <Button
              label="Wszystkie przydziały"
              variant="secondary"
              onPress={() => router.push('/(admin)/assignments')}
            />
          </Section>

          <Section title="Powiadomienia i synchronizacja">
            <Card onPress={() => router.push('/(admin)/notifications')}>
              <ThemedText type="smallBold">
                Nieodczytane powiadomienia: {dashboard.data.unread_notifications}
              </ThemedText>
            </Card>
            <Card>
              <ThemedText type="small">
                Połączenie: {isOnline ? 'aktywne' : 'brak — pracujesz offline'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Operacje oczekujące na wysłanie: {pending.length}
              </ThemedText>
              {lastError === null ? null : (
                <ThemedText type="small" themeColor="danger">
                  Problem z synchronizacją: {lastError}
                </ThemedText>
              )}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}
