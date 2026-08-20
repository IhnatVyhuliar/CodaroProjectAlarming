import { Redirect } from 'expo-router';

import { homeRouteFor, roleGroupFor } from '@/auth/roles';
import { useSessionStore } from '@/auth/session-store';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/ui/screen';

/** Entry point: checks the restored session and routes to the matching panel. */
export default function BootstrapScreen() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);

  if (status === 'unknown') {
    return (
      <Screen title="Codaro">
        <LoadingState label="Sprawdzanie sesji…" />
      </Screen>
    );
  }

  if (status === 'anonymous' || user === null) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={homeRouteFor[roleGroupFor(user.role)]} />;
}
