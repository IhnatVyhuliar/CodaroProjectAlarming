import Tabs from 'expo-router/js-tabs';

import { RoleRouteGuard } from '@/components/role-route-guard';

export default function StaffLayout() {
  return (
    <RoleRouteGuard allow="staff">
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Aktualne zadania' }} />
        <Tabs.Screen name="notifications" options={{ title: 'Powiadomienia' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil' }} />

        <Tabs.Screen name="tasks/[assignmentId]" options={{ href: null }} />
      </Tabs>
    </RoleRouteGuard>
  );
}
