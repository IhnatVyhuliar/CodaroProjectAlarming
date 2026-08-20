import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/ui/screen';
import { StaffTaskDetail } from '@/features/staff/staff-task-detail';
import { parseRouteId } from '@/utils/route-params';

export default function StaffTaskRoute() {
  const params = useLocalSearchParams<{ assignmentId?: string }>();
  const assignmentId = parseRouteId(params.assignmentId);

  if (assignmentId === null) {
    return (
      <Screen title="Zadanie">
        <ErrorState error={new Error('Nieprawidłowy identyfikator zadania.')} />
      </Screen>
    );
  }

  return <StaffTaskDetail assignmentId={assignmentId} />;
}
