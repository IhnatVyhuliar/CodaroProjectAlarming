import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LocalFileRef } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';

const MAX_SECONDS = 60;

export interface VoiceNoteRecorderProps {
  onRecorded: (file: LocalFileRef) => void;
  testID?: string;
}

/**
 * Single short recording sent as a normal attachment (`type=audio`) — works on a
 * weak connection, unlike the live microphone stream.
 */
export function VoiceNoteRecorder({ onRecorded, testID }: VoiceNoteRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = (): void => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const stop = async (): Promise<void> => {
    clearTimer();
    setIsRecording(false);

    try {
      await recorder.stop();

      const uri = recorder.uri;

      if (uri === null) {
        setStatus('Nagranie nie zostało zapisane.');

        return;
      }

      onRecorded({
        uri,
        name: `wiadomosc-glosowa-${Date.now()}.m4a`,
        mime_type: 'audio/m4a',
        type: 'audio',
      });
      setStatus('Wiadomość głosowa gotowa do wysłania.');
    } catch (error) {
      setStatus(
        error instanceof Error ? `Nie udało się zapisać nagrania: ${error.message}` : 'Błąd nagrywania.',
      );
    }
  };

  const start = async (): Promise<void> => {
    setStatus(null);

    try {
      const permission = await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setStatus('Brak zgody na dostęp do mikrofonu. Zmień zgodę w ustawieniach systemu.');

        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setSeconds(0);
      setIsRecording(true);

      timer.current = setInterval(() => {
        setSeconds((previous) => {
          if (previous + 1 >= MAX_SECONDS) {
            void stop();

            return MAX_SECONDS;
          }

          return previous + 1;
        });
      }, 1000);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Nie udało się rozpocząć nagrywania: ${error.message}`
          : 'Nie udało się rozpocząć nagrywania.',
      );
    }
  };

  return (
    <View style={styles.wrapper} testID={testID ?? 'voice-note-recorder'}>
      <Button
        label={isRecording ? `Zatrzymaj nagrywanie (${seconds}s)` : 'Nagraj wiadomość głosową'}
        variant={isRecording ? 'danger' : 'secondary'}
        onPress={() => void (isRecording ? stop() : start())}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Maksymalna długość nagrania: {MAX_SECONDS} s.
      </ThemedText>
      {status === null ? null : <ThemedText type="small">{status}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
});
