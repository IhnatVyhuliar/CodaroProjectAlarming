import { Redirect } from 'expo-router';

import { useSessionStore } from '@/auth/session-store';
import { homeRouteFor, roleGroupFor, type RoleGroup } from '@/auth/roles';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/ui/screen';

export interface RoleRouteGuardProps {
  allow: RoleGroup;
  children: React.ReactNode;
}

/**
 * Keeps a route group reachable only for its role. The API enforces access as
 * well — this simply avoids showing a panel the user cannot use.
 */
export function RoleRouteGuard({ allow, children }: RoleRouteGuardProps) {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);

  if (status === 'unknown') {
    return (
      <Screen>
        <LoadingState label="Sprawdzanie sesji…" />
      </Screen>
    );
  }

  if (status === 'anonymous' || user === null) {
    return <Redirect href="/(auth)/login" />;
  }

  const group = roleGroupFor(user.role);

  if (group !== allow) {
    return <Redirect href={homeRouteFor[group]} />;
  }

  return children;
}
