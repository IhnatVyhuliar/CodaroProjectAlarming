import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/ui/screen';
import { ClientRequestDetail } from '@/features/client/client-request-detail';
import { parseRouteId } from '@/utils/route-params';

export default function ClientRequestDetailRoute() {
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = parseRouteId(params.requestId);

  if (requestId === null) {
    return (
      <Screen title="Zadanie">
        <ErrorState error={new Error('Nieprawidłowy identyfikator zadania.')} />
      </Screen>
    );
  }

  return <ClientRequestDetail requestId={requestId} />;
}
