import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HistoryTimeline } from '@/components/history-timeline';
import { LoadingState } from '@/components/loading-state';
import { ReportCard } from '@/components/report-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { isRealtimeConfigured } from '@/config/env';
import { useClientDashboard } from '@/hooks/queries/use-reports';
import { useNetworkStore } from '@/offline/network-store';
import { useOperationQueue } from '@/offline/operation-queue';

export function ClientDashboard() {
  const router = useRouter();
  const dashboard = useClientDashboard();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const pending = useOperationQueue((state) => state.pending);

  return (
    <Screen
      title="Zgłoszenia serwisowe"
      subtitle="Zgłoś awarię windy lub uwięzienie w kabinie i śledź realizację."
      onRefresh={() => void dashboard.refetch()}
      refreshing={dashboard.isRefetching}>
      <Button
        label="Zgłoś awarię lub uwięzienie"
        onPress={() => router.push('/(client)/reports/new')}
        testID="create-report-button"
      />

      {dashboard.isPending ? <LoadingState /> : null}
      {dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : null}

      {dashboard.data === undefined ? null : (
        <>
          <Section title="Aktywne zgłoszenia">
            {dashboard.data.active_reports.length === 0 ? (
              <EmptyState
                title="Brak aktywnych zgłoszeń"
                description="Awarię windy zgłosisz przyciskiem powyżej."
                actionLabel="Zgłoś awarię lub uwięzienie"
                onAction={() => router.push('/(client)/reports/new')}
              />
            ) : (
              dashboard.data.active_reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onPress={() => router.push(`/(client)/reports/${report.id}`)}
                />
              ))
            )}
          </Section>

          <Section title="Powiadomienia">
            <Card onPress={() => router.push('/(client)/notifications')}>
              <ThemedText type="smallBold">
                Nieodczytane powiadomienia: {dashboard.data.unread_notifications}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Otrzymujesz informacje o każdej zmianie w Twoich zgłoszeniach.
              </ThemedText>
            </Card>
          </Section>

          <Section title="Stan transmisji i połączenia">
            <Card>
              <ThemedText type="small">
                Połączenie: {isOnline ? 'aktywne' : 'brak — dane mogą być nieaktualne'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Kanał powiadomień na bieżąco:{' '}
                {isRealtimeConfigured ? 'skonfigurowany' : 'nieskonfigurowany'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Operacje oczekujące na wysłanie: {pending.length}
              </ThemedText>
              {dashboard.data.live_streams.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Brak aktywnych transmisji.
                </ThemedText>
              ) : (
                dashboard.data.live_streams.map((session) => (
                  <ThemedText key={session.id} type="small" themeColor="warning">
                    Trwa transmisja w zgłoszeniu #{session.report_id}
                  </ThemedText>
                ))
              )}
            </Card>
          </Section>

          <Section title="Ostatnie zmiany">
            <HistoryTimeline
              entries={dashboard.data.recent_changes}
              emptyLabel="Brak zmian w Twoich zgłoszeniach."
            />
          </Section>
        </>
      )}
    </Screen>
  );
}
