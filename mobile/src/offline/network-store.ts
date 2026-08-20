import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  /** True until the first NetInfo result arrives. */
  isUnknown: boolean;
  setOnline: (isOnline: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  isUnknown: true,
  setOnline: (isOnline) => set({ isOnline, isUnknown: false }),
}));

export function isOnlineNow(): boolean {
  return useNetworkStore.getState().isOnline;
}
