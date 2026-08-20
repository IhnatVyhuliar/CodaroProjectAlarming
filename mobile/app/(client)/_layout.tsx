import Tabs from 'expo-router/js-tabs';

import { RoleRouteGuard } from '@/components/role-route-guard';

export default function ClientLayout() {
  return (
    <RoleRouteGuard allow="client">
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Pulpit' }} />
        <Tabs.Screen name="reports/index" options={{ title: 'Zgłoszenia' }} />
        <Tabs.Screen name="notifications" options={{ title: 'Powiadomienia' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil' }} />

        <Tabs.Screen name="reports/new" options={{ href: null }} />
        <Tabs.Screen name="reports/[reportId]" options={{ href: null }} />
        <Tabs.Screen name="requests/[requestId]" options={{ href: null }} />
      </Tabs>
    </RoleRouteGuard>
  );
}
