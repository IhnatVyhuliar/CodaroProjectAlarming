/** Minimal expo-camera stand-in for tests: renders a placeholder view. */
import { View } from 'react-native';

export function CameraView() {
  return <View testID="camera-view" />;
}

export function useCameraPermissions(): [
  { granted: boolean },
  () => Promise<{ granted: boolean }>,
  () => Promise<{ granted: boolean }>,
] {
  const request = async () => ({ granted: true });

  return [{ granted: true }, request, request];
}
