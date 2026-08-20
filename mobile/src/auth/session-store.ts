import { create } from 'zustand';

import { setAuthTokenProvider, setUnauthorizedHandler } from '@/api/client';
import { authApi } from '@/api/endpoints/auth';
import type { AuthenticatedUser } from '@/api/types';
import { tokenStorage } from './token-storage';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  token: string | null;
  user: AuthenticatedUser | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthenticatedUser>;
  signOut: () => Promise<void>;
  setUser: (user: AuthenticatedUser) => void;
  /** Called when the API rejects the token — drops the session without a request. */
  invalidate: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'unknown',
  token: null,
  user: null,

  async restore() {
    const token = await tokenStorage.read();

    if (token === null) {
      set({ status: 'anonymous', token: null, user: null });

      return;
    }

    set({ token });

    try {
      const user = await authApi.me();

      set({ status: 'authenticated', user, token });
    } catch {
      await tokenStorage.clear();
      set({ status: 'anonymous', token: null, user: null });
    }
  },

  async signIn(email, password) {
    const response = await authApi.login({ email, password });

    await tokenStorage.write(response.token);
    set({ status: 'authenticated', token: response.token, user: response.user });

    return response.user;
  },

  async signOut() {
    if (get().token !== null) {
      try {
        await authApi.logout();
      } catch {
        // Logging out locally matters more than the server round trip.
      }
    }

    await tokenStorage.clear();
    set({ status: 'anonymous', token: null, user: null });
  },

  setUser(user) {
    set({ user });
  },

  invalidate() {
    void tokenStorage.clear();
    set({ status: 'anonymous', token: null, user: null });
  },
}));

setAuthTokenProvider(() => useSessionStore.getState().token);
setUnauthorizedHandler(() => {
  if (useSessionStore.getState().token !== null) {
    useSessionStore.getState().invalidate();
  }
});
