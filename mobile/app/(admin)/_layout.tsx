import Tabs from 'expo-router/js-tabs';

import { RoleRouteGuard } from '@/components/role-route-guard';

export default function AdminLayout() {
  return (
    <RoleRouteGuard allow="admin">
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Pulpit' }} />
        <Tabs.Screen name="queue" options={{ title: 'Kolejka' }} />
        <Tabs.Screen name="reports/index" options={{ title: 'Zgłoszenia' }} />
        <Tabs.Screen name="assignments" options={{ title: 'Przydziały' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil' }} />

        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="reports/[reportId]" options={{ href: null }} />
        <Tabs.Screen name="requests/[requestId]" options={{ href: null }} />
      </Tabs>
    </RoleRouteGuard>
  );
}
