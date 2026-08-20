import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Codaro',
  slug: 'codaro',
  scheme: 'codaro',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    icon: './assets/expo.icon',
    bundleIdentifier: 'com.codaro.app',
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Aplikacja potrzebuje dostępu do lokalizacji, aby przesłać ją wraz ze zgłoszeniem.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Aplikacja potrzebuje dostępu do lokalizacji w tle, aby transmitować ją podczas trwania zgłoszenia.',
      NSCameraUsageDescription:
        'Aplikacja potrzebuje dostępu do aparatu, aby transmitować obraz podczas interwencji.',
      NSMicrophoneUsageDescription:
        'Aplikacja potrzebuje dostępu do mikrofonu, aby nagrywać wiadomości głosowe i transmitować dźwięk.',
      UIBackgroundModes: ['location', 'audio'],
    },
  },
  android: {
    ...config.android,
    package: 'com.codaro.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'RECORD_AUDIO',
    ],
  },
  web: {
    ...config.web,
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-dev-client',
    'expo-secure-store',
    [
      'expo-camera',
      {
        cameraPermission:
          'Aplikacja potrzebuje dostępu do aparatu, aby transmitować obraz podczas interwencji.',
        microphonePermission:
          'Aplikacja potrzebuje dostępu do mikrofonu, aby nagrywać wiadomości głosowe.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Aplikacja potrzebuje dostępu do lokalizacji, aby przesyłać ją do służb podczas zgłoszenia.',
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    'expo-notifications',
    '@livekit/react-native-expo-plugin',
    '@config-plugins/react-native-webrtc',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
});
