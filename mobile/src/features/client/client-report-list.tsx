import { useRouter } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ReportCard } from '@/components/report-card';
import { ThemedText } from '@/components/themed-text';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useReportList } from '@/hooks/queries/use-reports';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useStatusDefinitions } from '@/hooks/queries/use-status-transitions';

/**
 * Client's own reports. The status filter is built from the API status
 * dictionary, so no operational status is hardcoded in the frontend.
 */
export function ClientReportList() {
  const router = useRouter();
  const statuses = useStatusDefinitions('report');
  const [statusKey, setStatusKey] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const reports = useReportList({
    scope: 'mine',
    status_key: statusKey === 'all' ? undefined : statusKey,
    search: debouncedSearch.trim().length > 0 ? debouncedSearch.trim() : undefined,
  });

  const options = [
    { value: 'all', label: 'Wszystkie' },
    ...(statuses.data ?? []).map((status) => ({
      value: status.key,
      label: status.label,
    })),
  ];

  return (
    <Screen
      title="Moje zgłoszenia"
      onRefresh={() => void reports.refetch()}
      refreshing={reports.isRefetching}>
      <TextField
        label="Szukaj"
        value={search}
        onChangeText={setSearch}
        placeholder="Nazwa lub opis zgłoszenia"
        testID="report-search"
      />

      <OptionList options={options} value={statusKey} onChange={setStatusKey} inline />

      {reports.isPending ? <LoadingState /> : null}
      {reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : null}

      {reports.data !== undefined && reports.data.data.length === 0 ? (
        <EmptyState
          title="Brak zgłoszeń dla wybranych filtrów"
          description="Zmień filtry albo utwórz nowe zgłoszenie."
        />
      ) : null}

      {(reports.data?.data ?? []).map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onPress={() => router.push(`/(client)/reports/${report.id}`)}
        />
      ))}

      {reports.data === undefined ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Wyświetlono {reports.data.data.length} z {reports.data.meta.total} zgłoszeń.
        </ThemedText>
      )}
    </Screen>
  );
}
