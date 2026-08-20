import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { SiteInfo } from '@/components/site-info';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { assignmentScopeLabels, urgencyLabels } from '@/constants/domain';
import { useStaffTasks } from '@/hooks/queries/use-staff-tasks';
import { formatRelative } from '@/utils/format';

/**
 * Only currently active assignments — the API returns nothing else, and a
 * revoked or finished task disappears from this list.
 */
export function StaffTaskList() {
  const router = useRouter();
  const tasks = useStaffTasks();

  return (
    <Screen
      title="Aktualne zadania"
      subtitle="Zadania przypisane do Ciebie — całe zgłoszenia i pojedyncze zadania serwisowe."
      onRefresh={() => void tasks.refetch()}
      refreshing={tasks.isRefetching}>
      {tasks.isPending ? <LoadingState /> : null}
      {tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /> : null}

      {tasks.data !== undefined && tasks.data.length === 0 ? (
        <EmptyState
          title="Brak aktualnych zadań"
          description="Gdy administrator przypisze Ci zadanie, pojawi się ono tutaj."
          testID="staff-tasks-empty"
        />
      ) : null}

      {(tasks.data ?? []).map((task) => (
        <Card
          key={task.assignment.id}
          onPress={() => router.push(`/(staff)/tasks/${task.assignment.id}`)}
          accessibilityLabel={`Zadanie ${task.title}`}
          testID={`staff-task-${task.assignment.id}`}>
          <ThemedText type="smallBold">{task.title}</ThemedText>
          <StatusBadge status={task.status} />
          <SiteInfo
            isEntrapment={task.report.is_entrapment}
            siteAddress={task.report.site_address}
            deviceLabel={task.report.device_label}
            compact
          />
          <ThemedText type="small" themeColor="textSecondary">
            Zakres: {assignmentScopeLabels[task.scope]}
            {task.position_name === null ? '' : ` · Stanowisko: ${task.position_name}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Zgłoszenie: {task.report.name} · Pilność: {urgencyLabels[task.report.urgency]}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Aktualizacja: {formatRelative(task.updated_at)}
          </ThemedText>
        </Card>
      ))}
    </Screen>
  );
}
