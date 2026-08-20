import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { profileApi } from '@/api/endpoints/profile';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string };

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const id = extra?.eas?.projectId;

  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Registers the device for Expo push notifications and hands the token to the API.
 * Never throws — a missing permission or a simulator is a normal outcome here.
 */
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', reason: 'Powiadomienia push nie działają w przeglądarce.' };
  }

  if (!Device.isDevice) {
    return { status: 'unsupported', reason: 'Powiadomienia push wymagają fizycznego urządzenia.' };
  }

  const id = projectId();

  if (id === null) {
    return { status: 'unsupported', reason: 'Brak skonfigurowanego projektu EAS.' };
  }

  try {
    const current = await Notifications.getPermissionsAsync();
    const granted =
      current.granted || (await Notifications.requestPermissionsAsync()).granted;

    if (!granted) {
      return { status: 'denied' };
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId: id });

    await profileApi.registerPushToken(token.data, Platform.OS);

    return { status: 'registered', token: token.data };
  } catch (error) {
    return {
      status: 'unsupported',
      reason: error instanceof Error ? error.message : 'Nie udało się zarejestrować powiadomień.',
    };
  }
}
