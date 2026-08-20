/** Minimal expo-audio stand-in: no native recorder in the test environment. */
export const RecordingPresets = {
  HIGH_QUALITY: {},
  LOW_QUALITY: {},
};

export function useAudioRecorder() {
  return {
    uri: 'file:///tmp/test-recording.m4a',
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    prepareToRecordAsync: jest.fn(async () => undefined),
  };
}

export async function requestRecordingPermissionsAsync() {
  return { granted: true, status: 'granted' };
}

export async function getRecordingPermissionsAsync() {
  return { granted: true, status: 'granted' };
}
