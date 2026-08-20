import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LocalFileRef } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';

export interface PhotoCaptureProps {
  onCaptured: (file: LocalFileRef) => void;
  label?: string;
  testID?: string;
}

/** Takes a single photo and hands it over as a local file reference. */
export function PhotoCapture({ onCaptured, label = 'Zrób zdjęcie', testID }: PhotoCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  const open = async (): Promise<void> => {
    setStatus(null);

    if (permission?.granted !== true) {
      const result = await requestPermission();

      if (!result.granted) {
        setStatus('Brak zgody na dostęp do aparatu. Zmień zgodę w ustawieniach systemu.');

        return;
      }
    }

    setIsOpen(true);
  };

  const capture = async (): Promise<void> => {
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.6 });

      if (picture === undefined) {
        setStatus('Nie udało się zrobić zdjęcia.');

        return;
      }

      onCaptured({
        uri: picture.uri,
        name: `zdjecie-${Date.now()}.jpg`,
        mime_type: 'image/jpeg',
        type: 'photo',
      });
      setIsOpen(false);
      setStatus('Zdjęcie dodane.');
    } catch (error) {
      setStatus(
        error instanceof Error ? `Błąd aparatu: ${error.message}` : 'Nie udało się zrobić zdjęcia.',
      );
    }
  };

  return (
    <View style={styles.wrapper} testID={testID ?? 'photo-capture'}>
      <Button label={label} variant="secondary" onPress={() => void open()} />
      {status === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {status}
        </ThemedText>
      )}

      <Sheet visible={isOpen} title="Aparat" onClose={() => setIsOpen(false)}>
        <View style={styles.preview}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        </View>
        <Button label="Zapisz zdjęcie" onPress={() => void capture()} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  preview: {
    height: 320,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
});
