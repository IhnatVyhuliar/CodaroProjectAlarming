import { useState } from 'react';
import { Image, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import type { LocationSnapshot } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/utils/format';

const TILE_SIZE = 256;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 16;

/** Raster tiles — no API key, works on iOS, Android and web alike. */
const TILE_URL = (z: number, x: number, y: number): string =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

function lngToTileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * 2 ** zoom;
}

function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;

  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

interface Tile {
  key: string;
  uri: string;
  left: number;
  top: number;
}

/** Tiles covering the viewport, centred on the reported position. */
export function tilesForViewport(
  location: { lat: number; lng: number },
  zoom: number,
  width: number,
  height: number,
): Tile[] {
  const scale = 2 ** zoom;
  const centerX = lngToTileX(location.lng, zoom) * TILE_SIZE;
  const centerY = latToTileY(location.lat, zoom) * TILE_SIZE;
  const originX = centerX - width / 2;
  const originY = centerY - height / 2;

  const firstX = Math.floor(originX / TILE_SIZE);
  const lastX = Math.floor((originX + width) / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastY = Math.floor((originY + height) / TILE_SIZE);

  const tiles: Tile[] = [];

  for (let x = firstX; x <= lastX; x += 1) {
    for (let y = firstY; y <= lastY; y += 1) {
      if (y < 0 || y >= scale) {
        continue;
      }

      // Horizontal wrap-around keeps the map continuous across the date line.
      const wrappedX = ((x % scale) + scale) % scale;

      tiles.push({
        key: `${zoom}-${x}-${y}`,
        uri: TILE_URL(zoom, wrappedX, y),
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }

  return tiles;
}

export interface LocationMapProps {
  location: LocationSnapshot | null;
  address?: string | null;
  /** Wysokość podglądu; domyślnie duży kafel widoczny bez przewijania. */
  height?: number;
  caption?: string;
  testID?: string;
}

/**
 * Mapa wyświetlana od razu w ekranie — ekipa widzi miejsce zdarzenia bez
 * otwierania czegokolwiek. Nawigację uruchamia osobny przycisk pod mapą.
 */
export function LocationMap({
  location,
  address = null,
  height = 280,
  caption,
  testID,
}: LocationMapProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(320);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const onLayout = (event: LayoutChangeEvent): void => {
    const next = Math.round(event.nativeEvent.layout.width);

    if (next > 0 && next !== width) {
      setWidth(next);
    }
  };

  if (location === null) {
    return (
      <View
        testID={testID ?? 'location-map-empty'}
        style={[styles.placeholder, { height, borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.placeholderText}>
          {address === null
            ? 'Lokalizacja nie została udostępniona.'
            : `Brak współrzędnych. Adres obiektu: ${address}`}
        </ThemedText>
      </View>
    );
  }

  const tiles = tilesForViewport(location, zoom, width, height);

  return (
    <View style={styles.wrapper}>
      <View
        testID={testID ?? 'location-map'}
        accessibilityRole="image"
        accessibilityLabel={`Mapa lokalizacji: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${
          address === null ? '' : `, ${address}`
        }`}
        onLayout={onLayout}
        style={[styles.map, { height, borderColor: theme.border }]}>
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri, headers: { 'User-Agent': 'CodaroDispatch/1.0' } }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ))}

        <View style={[styles.markerAnchor, { left: width / 2, top: height / 2 }]} pointerEvents="none">
          <View style={[styles.markerPin, { backgroundColor: theme.danger, borderColor: theme.onPrimary }]} />
          <View style={[styles.markerStem, { backgroundColor: theme.danger }]} />
        </View>

        <View style={styles.zoomControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Powiększ mapę"
            onPress={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))}
            style={[styles.zoomButton, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText type="smallBold">+</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pomniejsz mapę"
            onPress={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))}
            style={[styles.zoomButton, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText type="smallBold">−</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.attribution, { backgroundColor: theme.background }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.attributionText}>
            © OpenStreetMap
          </ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {caption ??
          `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${
            location.accuracy === null ? '' : ` (±${Math.round(location.accuracy)} m)`
          } · aktualizacja: ${formatDateTime(location.recorded_at)}`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  map: {
    width: '100%',
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  markerAnchor: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -8,
    marginTop: -24,
  },
  markerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  markerStem: {
    width: 2,
    height: 10,
  },
  zoomControls: {
    position: 'absolute',
    right: Spacing.two,
    top: Spacing.two,
    gap: Spacing.one,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.one,
    borderTopLeftRadius: Spacing.one,
    opacity: 0.85,
  },
  attributionText: {
    fontSize: 10,
  },
  placeholder: {
    width: '100%',
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  placeholderText: {
    textAlign: 'center',
  },
});
