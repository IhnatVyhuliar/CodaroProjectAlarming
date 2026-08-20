import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/ui/screen';
import { AdminRequestDetail } from '@/features/admin/admin-request-detail';
import { parseRouteId } from '@/utils/route-params';

export default function AdminRequestRoute() {
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = parseRouteId(params.requestId);

  if (requestId === null) {
    return (
      <Screen title="Zadanie">
        <ErrorState error={new Error('Nieprawidłowy identyfikator zadania.')} />
      </Screen>
    );
  }

  return <AdminRequestDetail requestId={requestId} />;
}
