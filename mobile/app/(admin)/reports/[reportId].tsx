import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/ui/screen';
import { AdminReportWorkspace } from '@/features/admin/admin-report-workspace';
import { parseRouteId } from '@/utils/route-params';

export default function AdminReportRoute() {
  const params = useLocalSearchParams<{ reportId?: string }>();
  const reportId = parseRouteId(params.reportId);

  if (reportId === null) {
    return (
      <Screen title="Zgłoszenie">
        <ErrorState error={new Error('Nieprawidłowy identyfikator zgłoszenia.')} />
      </Screen>
    );
  }

  return <AdminReportWorkspace reportId={reportId} />;
}
