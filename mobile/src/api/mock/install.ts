import { apiClient } from '../client';
import { env, isDevBuild } from '@/config/env';
import { createMockAdapter } from './adapter';
import { resetMockData } from './dataset';

let installed = false;

export interface InstallMockApiOptions {
  /** Restore the pristine demo dataset (used by tests). */
  reset?: boolean;
  /** Simulated latency so loading states are visible while developing. */
  latencyMs?: number;
}

/**
 * Attaches the demo adapter to the shared axios instance.
 *
 * Refuses to run outside a development build, so a release build can never
 * serve demo data. Returns `true` when the adapter is active.
 */
export function installMockApi(options: InstallMockApiOptions = {}): boolean {
  if (!isDevBuild() || env.apiMode !== 'mock') {
    return false;
  }

  if (options.reset === true) {
    resetMockData();
  }

  if (!installed) {
    apiClient.defaults.adapter = createMockAdapter(options.latencyMs ?? 0);
    installed = true;
  }

  return true;
}

export function isMockApiInstalled(): boolean {
  return installed;
}
