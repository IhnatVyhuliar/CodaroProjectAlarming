/** Minimal expo-location stand-in for tests. */
export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export async function requestForegroundPermissionsAsync() {
  return { granted: true, status: 'granted' };
}

export async function getForegroundPermissionsAsync() {
  return { granted: true, status: 'granted' };
}

export async function getCurrentPositionAsync() {
  return {
    coords: {
      latitude: 52.2297,
      longitude: 21.0122,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 0,
  };
}
