import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform } from 'react-native';

import type { LocationSnapshot } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';

export interface NavigateButtonProps {
  location: LocationSnapshot | null;
  address: string | null;
  label?: string;
}

function buildMapsUrl(location: LocationSnapshot | null, address: string | null): string | null {
  if (location !== null) {
    const destination = `${location.lat},${location.lng}`;

    return Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });
  }

  if (address !== null && address.trim().length > 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }

  return null;
}

/** Deep link do nawigacji — po współrzędnych, a gdy ich brak, po adresie obiektu. */
export function NavigateButton({ location, address, label = 'Nawiguj' }: NavigateButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const url = buildMapsUrl(location, address);

  if (url === null) {
    return null;
  }

  return (
    <>
      <Button
        label={label}
        variant="secondary"
        onPress={() => {
          setError(null);
          void Linking.openURL(url).catch(() =>
            setError('Nie udało się otworzyć aplikacji z mapami.'),
          );
        }}
      />
      {error === null ? null : (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </>
  );
}
