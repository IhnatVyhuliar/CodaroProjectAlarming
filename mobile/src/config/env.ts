/**
 * Runtime configuration read from EXPO_PUBLIC_* variables.
 *
 * Values are accessed statically (never through a computed key) because Expo
 * inlines `process.env.EXPO_PUBLIC_*` at build time.
 */

export type ApiMode = 'live' | 'mock';

/** `__DEV__` is not defined in every jest environment, so it is guarded. */
export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_MODE = process.env.EXPO_PUBLIC_API_MODE;
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST;
const REVERB_PORT = process.env.EXPO_PUBLIC_REVERB_PORT;
const REVERB_APP_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY;
const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL;

/**
 * The demo/mock adapter is only ever allowed in a development build. A release
 * build always talks to the real API, whatever the environment says.
 */
function resolveApiMode(): ApiMode {
  if (!isDevBuild()) {
    return 'live';
  }

  return API_MODE === 'live' ? 'live' : 'mock';
}

function nonEmpty(value: string | undefined): string | null {
  return value !== undefined && value.trim().length > 0 ? value.trim() : null;
}

export const env = {
  apiUrl: API_URL.replace(/\/+$/, ''),
  apiPrefix: '/api/v1',
  apiMode: resolveApiMode(),
  reverb: {
    host: nonEmpty(REVERB_HOST),
    port: REVERB_PORT !== undefined && REVERB_PORT.length > 0 ? Number(REVERB_PORT) : 8080,
    appKey: nonEmpty(REVERB_APP_KEY),
  },
  livekitUrl: nonEmpty(LIVEKIT_URL),
} as const;

/** True when Reverb credentials are present, so a WebSocket connection makes sense. */
export const isRealtimeConfigured = env.reverb.host !== null && env.reverb.appKey !== null;
