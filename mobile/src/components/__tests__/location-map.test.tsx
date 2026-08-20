import type { LocationSnapshot } from '@/api/types';
import { LocationMap, tilesForViewport } from '@/components/media/location-map';
import { renderWithProviders, resetTestEnvironment } from '@/test-utils/render';

const LOCATION: LocationSnapshot = {
  lat: 52.2297,
  lng: 21.0122,
  accuracy: 12,
  recorded_at: '2026-08-20T08:00:00.000Z',
};

beforeEach(() => {
  resetTestEnvironment();
});

describe('LocationMap', () => {
  it('covers the whole viewport with tiles centred on the position', () => {
    const tiles = tilesForViewport(LOCATION, 16, 360, 280);

    expect(tiles.length).toBeGreaterThan(0);

    // Tiles must reach both edges of the viewport, otherwise the map has gaps.
    expect(Math.min(...tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0);
    expect(Math.max(...tiles.map((tile) => tile.left + 256))).toBeGreaterThanOrEqual(360);
    expect(Math.min(...tiles.map((tile) => tile.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...tiles.map((tile) => tile.top + 256))).toBeGreaterThanOrEqual(280);
    expect(tiles.every((tile) => tile.uri.startsWith('https://tile.openstreetmap.org/16/'))).toBe(
      true,
    );
  });

  it('renders the map inline, without any interaction', async () => {
    const view = await renderWithProviders(
      <LocationMap location={LOCATION} address="ul. Kwiatowa 12" />,
    );

    expect(view.getByTestId('location-map')).toBeTruthy();
    expect(
      view.getByLabelText('Mapa lokalizacji: 52.22970, 21.01220, ul. Kwiatowa 12'),
    ).toBeTruthy();
    expect(view.getByLabelText('Powiększ mapę')).toBeTruthy();
  });

  it('falls back to the site address when there are no coordinates', async () => {
    const view = await renderWithProviders(
      <LocationMap location={null} address="ul. Parkowa 3" />,
    );

    expect(view.queryByTestId('location-map')).toBeNull();
    expect(view.getByText('Brak współrzędnych. Adres obiektu: ul. Parkowa 3')).toBeTruthy();
  });
});
