import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { QueueSort, UrgencyLevel } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ReportCard } from '@/components/report-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { queueSortLabels, urgencyLabels, urgencyOrder } from '@/constants/domain';
import { useCategories } from '@/hooks/queries/use-dictionaries';
import { useClaimReport, useQueue } from '@/hooks/queries/use-queue';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

export function AdminQueue() {
  const router = useRouter();
  const [sort, setSort] = useState<QueueSort>('fifo');
  const [urgency, setUrgency] = useState<UrgencyLevel | 'all'>('all');
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const categories = useCategories();
  const queue = useQueue({
    sort,
    urgency: urgency === 'all' ? undefined : urgency,
    category_id: categoryId === 'all' ? undefined : categoryId,
    search: debouncedSearch.trim().length > 0 ? debouncedSearch.trim() : undefined,
  });
  const claim = useClaimReport();

  return (
    <Screen
      title="Kolejka globalna"
      subtitle="Nowe zgłoszenia z budynków. Uwięzienia w kabinie mają najwyższy priorytet w sortowaniu AI."
      onRefresh={() => void queue.refetch()}
      refreshing={queue.isRefetching}>
      <OptionList
        label="Sortowanie"
        options={(['fifo', 'client_priority', 'ai_priority'] satisfies QueueSort[]).map((value) => ({
          value,
          label: queueSortLabels[value],
        }))}
        value={sort}
        onChange={setSort}
        inline
        testID="queue-sort"
      />

      <OptionList
        label="Pilność"
        options={[
          { value: 'all', label: 'Wszystkie' },
          ...urgencyOrder
            .slice()
            .reverse()
            .map((level) => ({ value: level, label: urgencyLabels[level] })),
        ]}
        value={urgency}
        onChange={setUrgency}
        inline
      />

      <OptionList
        label="Kategoria"
        options={[
          { value: 'all' as number | 'all', label: 'Wszystkie' },
          ...(categories.data ?? []).map((category) => ({
            value: category.id as number | 'all',
            label: category.name,
          })),
        ]}
        value={categoryId}
        onChange={setCategoryId}
        inline
      />

      <TextField label="Szukaj" value={search} onChangeText={setSearch} placeholder="Nazwa zgłoszenia" />

      {queue.isPending ? <LoadingState /> : null}
      {queue.isError ? <ErrorState error={queue.error} onRetry={() => void queue.refetch()} /> : null}

      {queue.data !== undefined && queue.data.data.length === 0 ? (
        <EmptyState title="Kolejka jest pusta" description="Brak zgłoszeń dla wybranych filtrów." />
      ) : null}

      {(queue.data?.data ?? []).map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          showClient
          onPress={() => router.push(`/(admin)/reports/${report.id}`)}
          footer={
            <>
              <Button
                label="Podgląd zgłoszenia"
                variant="secondary"
                onPress={() => router.push(`/(admin)/reports/${report.id}`)}
              />
              <Button
                label="Przyjmij zgłoszenie"
                loading={claim.isPending && claim.variables === report.id}
                onPress={() =>
                  claim.mutate(report.id, {
                    onSuccess: () => router.push(`/(admin)/reports/${report.id}`),
                  })
                }
                testID={`queue-claim-${report.id}`}
              />
            </>
          }
        />
      ))}

      {claim.isError ? <ErrorState error={claim.error} /> : null}

      {queue.data === undefined ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          W kolejce: {queue.data.meta.total} zgłoszeń.
        </ThemedText>
      )}
    </Screen>
  );
}
