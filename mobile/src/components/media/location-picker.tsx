import * as Location from 'expo-location';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LocationMode } from '@/api/types';
import { LocationMap } from '@/components/media/location-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionList } from '@/components/ui/option-list';
import { locationModeLabels } from '@/constants/domain';
import { Spacing } from '@/constants/theme';

export interface LocationValue {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export interface LocationPickerProps {
  mode: LocationMode;
  onModeChange: (mode: LocationMode) => void;
  value: LocationValue | null;
  onValueChange: (value: LocationValue | null) => void;
}

/**
 * One-time location capture with an explicit choice of sharing mode.
 * Permission refusal is surfaced as a readable message, never a silent failure.
 */
export function LocationPicker({ mode, onModeChange, value, onValueChange }: LocationPickerProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const capture = async (): Promise<void> => {
    setIsReading(true);
    setStatus(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setStatus(
          'Brak zgody na dostęp do lokalizacji. Możesz kontynuować bez lokalizacji lub zmienić zgodę w ustawieniach systemu.',
        );
        onModeChange('none');

        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      onValueChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setStatus('Lokalizacja pobrana.');
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Nie udało się pobrać lokalizacji: ${error.message}`
          : 'Nie udało się pobrać lokalizacji.',
      );
    } finally {
      setIsReading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <OptionList
        label="Udostępnianie lokalizacji"
        options={[
          { value: 'none', label: locationModeLabels.none },
          {
            value: 'one_time',
            label: locationModeLabels.one_time,
            description: 'Jednorazowy odczyt dołączony do zgłoszenia.',
          },
          {
            value: 'streaming',
            label: locationModeLabels.streaming,
            description: 'Twoja lokalizacja będzie aktualizowana do zamknięcia zgłoszenia.',
          },
        ]}
        value={mode}
        onChange={(next) => {
          onModeChange(next);

          if (next === 'none') {
            onValueChange(null);
          }
        }}
      />

      {mode === 'none' ? null : (
        <>
          <Button
            label={value === null ? 'Pobierz moją lokalizację' : 'Odczytaj ponownie'}
            variant="secondary"
            onPress={() => void capture()}
            loading={isReading}
          />
          {value === null ? null : (
            <LocationMap
              location={{ ...value, recorded_at: new Date().toISOString() }}
              height={220}
              caption={`Współrzędne: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}${
                value.accuracy === null ? '' : ` (±${Math.round(value.accuracy)} m)`
              }`}
            />
          )}
          {mode === 'streaming' ? (
            <ThemedText type="small" themeColor="warning">
              Transmisja lokalizacji będzie oznaczona w zgłoszeniu i możesz ją zatrzymać w każdej
              chwili.
            </ThemedText>
          ) : null}
        </>
      )}

      {status === null ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {status}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
});
