import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { env, isRealtimeConfigured } from '@/config/env';
import { roleLabels } from '@/auth/roles';
import { useSessionStore } from '@/auth/session-store';
import { useProfile, useUpdateProfile } from '@/hooks/queries/use-profile';
import { useNetworkStore } from '@/offline/network-store';
import { useOperationQueue } from '@/offline/operation-queue';
import { registerForPushNotifications } from '@/notifications/push';

export function ProfileScreen() {
  const router = useRouter();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const signOut = useSessionStore((state) => state.signOut);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const pending = useOperationQueue((state) => state.pending);

  // The form starts from server data and switches to the local draft on first edit.
  const [draft, setDraft] = useState<{ name: string; phone: string } | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const name = draft?.name ?? profile.data?.name ?? '';
  const phone = draft?.phone ?? profile.data?.phone ?? '';
  const setName = (value: string): void => setDraft({ name: value, phone });
  const setPhone = (value: string): void => setDraft({ name, phone: value });

  const registerPush = async (): Promise<void> => {
    const result = await registerForPushNotifications();

    if (result.status === 'registered') {
      setPushStatus('Powiadomienia push są włączone na tym urządzeniu.');
    } else if (result.status === 'denied') {
      setPushStatus('Brak zgody na powiadomienia — możesz ją zmienić w ustawieniach systemu.');
    } else {
      setPushStatus(result.reason);
    }
  };

  return (
    <Screen title="Profil" onRefresh={() => void profile.refetch()} refreshing={profile.isRefetching}>
      {profile.isPending ? <LoadingState /> : null}
      {profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : null}

      {profile.data === undefined ? null : (
        <>
          <Card>
            <ThemedText type="smallBold">{profile.data.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {profile.data.email} · Rola: {roleLabels[profile.data.role]}
            </ThemedText>
            {profile.data.position === null ? null : (
              <ThemedText type="small">Stanowisko: {profile.data.position.name}</ThemedText>
            )}
            {profile.data.organization_name === null ? null : (
              <ThemedText type="small" themeColor="textSecondary">
                {profile.data.organization_name}
              </ThemedText>
            )}
          </Card>

          <Section title="Dane kontaktowe">
            <TextField label="Imię i nazwisko" value={name} onChangeText={setName} />
            <TextField
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Button
              label="Zapisz zmiany"
              onPress={() => updateProfile.mutate({ name, phone: phone.length > 0 ? phone : null })}
              loading={updateProfile.isPending}
            />
            {updateProfile.isError ? <ErrorState error={updateProfile.error} /> : null}
            {updateProfile.isSuccess ? (
              <ThemedText type="small" themeColor="success">
                Dane zapisane.
              </ThemedText>
            ) : null}
          </Section>

          <Section title="Powiadomienia i połączenie">
            <ThemedText type="small">
              Połączenie: {isOnline ? 'aktywne' : 'brak — pracujesz w trybie offline'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Kanał realtime: {isRealtimeConfigured ? 'skonfigurowany' : 'nieskonfigurowany'} · Tryb
              API: {env.apiMode === 'mock' ? 'demonstracyjny' : 'produkcyjny'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Operacje oczekujące na wysłanie: {pending.length}
            </ThemedText>
            <Button
              label="Włącz powiadomienia push"
              variant="secondary"
              onPress={() => void registerPush()}
            />
            {pushStatus === null ? null : (
              <ThemedText type="small" themeColor="textSecondary">
                {pushStatus}
              </ThemedText>
            )}
          </Section>

          <Button
            label="Wyloguj się"
            variant="danger"
            onPress={() => {
              void signOut().then(() => router.replace('/(auth)/login'));
            }}
            testID="logout-button"
          />
        </>
      )}
    </Screen>
  );
}
