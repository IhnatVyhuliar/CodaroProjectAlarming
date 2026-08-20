import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { installMockApi } from '@/api/mock/install';
import { AppProviders } from '@/providers/app-providers';

// Development-only demo backend; a no-op in release builds and in `live` mode.
installMockApi({ latencyMs: 250 });

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </ThemeProvider>
  );
}
