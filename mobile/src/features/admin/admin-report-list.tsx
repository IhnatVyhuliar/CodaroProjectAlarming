import { useRouter } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ReportCard } from '@/components/report-card';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useReportList } from '@/hooks/queries/use-reports';
import { useStatusDefinitions } from '@/hooks/queries/use-status-transitions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function AdminReportList() {
  const router = useRouter();
  const statuses = useStatusDefinitions('report');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [statusKey, setStatusKey] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const reports = useReportList({
    scope,
    status_key: statusKey === 'all' ? undefined : statusKey,
    search: debouncedSearch.trim().length > 0 ? debouncedSearch.trim() : undefined,
  });

  return (
    <Screen
      title="Zgłoszenia"
      onRefresh={() => void reports.refetch()}
      refreshing={reports.isRefetching}>
      <OptionList
        options={[
          { value: 'mine', label: 'Moje zgłoszenia' },
          { value: 'all', label: 'Wszystkie' },
        ]}
        value={scope}
        onChange={setScope}
        inline
      />

      <TextField label="Szukaj" value={search} onChangeText={setSearch} />

      <OptionList
        options={[
          { value: 'all', label: 'Wszystkie statusy' },
          ...(statuses.data ?? []).map((status) => ({ value: status.key, label: status.label })),
        ]}
        value={statusKey}
        onChange={setStatusKey}
        inline
      />

      {reports.isPending ? <LoadingState /> : null}
      {reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : null}

      {reports.data !== undefined && reports.data.data.length === 0 ? (
        <EmptyState title="Brak zgłoszeń" description="Zmień filtry, aby zobaczyć inne zgłoszenia." />
      ) : null}

      {(reports.data?.data ?? []).map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          showClient
          onPress={() => router.push(`/(admin)/reports/${report.id}`)}
        />
      ))}
    </Screen>
  );
}
