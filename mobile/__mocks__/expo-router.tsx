/**
 * Manual mock for expo-router used by component tests. Navigation intent is
 * recorded on `mockRouter` so tests can assert on it without a real navigator.
 */
import { Pressable, Text } from 'react-native';

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn(() => true),
};

export function useRouter() {
  return mockRouter;
}

export const router = mockRouter;

export let mockSearchParams: Record<string, string> = {};

export function setMockSearchParams(params: Record<string, string>): void {
  mockSearchParams = params;
}

export function useLocalSearchParams<T>(): T {
  return mockSearchParams as unknown as T;
}

export function useGlobalSearchParams<T>(): T {
  return mockSearchParams as unknown as T;
}

export function usePathname(): string {
  return '/';
}

export function useNavigation() {
  return { setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };
}

export function useSegments(): string[] {
  return [];
}

export function Redirect({ href }: { href: unknown }) {
  return <Text>{`redirect:${String(href)}`}</Text>;
}

export function Link({ href, children }: { href: unknown; children?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => mockRouter.push(href as never)}>
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}

export function Stack({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

Stack.Screen = function StackScreen() {
  return null;
};

export function Tabs({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

Tabs.Screen = function TabsScreen() {
  return null;
};

export function Slot({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export const DarkTheme = { dark: true, colors: {} };
export const DefaultTheme = { dark: false, colors: {} };

export function useFocusEffect(): void {
  // no-op in tests
}

export function useTheme() {
  return DefaultTheme;
}
