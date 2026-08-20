import type { Href } from 'expo-router';

import type { UserRole } from '@/api/types';

/** Route group a role belongs to. Hiperadmin uses the dispatch (admin) panel. */
export type RoleGroup = 'client' | 'admin' | 'staff';

export function roleGroupFor(role: UserRole): RoleGroup {
  if (role === 'client') {
    return 'client';
  }

  if (role === 'staff') {
    return 'staff';
  }

  return 'admin';
}

export const homeRouteFor: Record<RoleGroup, Href> = {
  client: '/(client)',
  admin: '/(admin)',
  staff: '/(staff)',
};

export const roleLabels: Record<UserRole, string> = {
  client: 'Klient',
  admin: 'Administrator',
  super_admin: 'Hiperadministrator',
  staff: 'Pracownik',
};
