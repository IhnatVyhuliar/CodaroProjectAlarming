import { api } from '../client';
import type { AuthenticatedUser, Envelope } from '../types';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string | null;
}

export const profileApi = {
  get(): Promise<AuthenticatedUser> {
    return api.get<Envelope<AuthenticatedUser>>('/profile').then((response) => response.data);
  },
  update(payload: UpdateProfilePayload): Promise<AuthenticatedUser> {
    return api
      .patch<Envelope<AuthenticatedUser>>('/profile', payload)
      .then((response) => response.data);
  },
  registerPushToken(token: string, platform: string): Promise<void> {
    return api.post<void>('/profile/push-token', { push_token: token, platform });
  },
};
