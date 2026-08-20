import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/errors';
import { homeRouteFor, roleGroupFor } from '@/auth/roles';
import { useSessionStore } from '@/auth/session-store';
import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { env } from '@/config/env';
import { Spacing } from '@/constants/theme';

export function LoginScreen() {
  const router = useRouter();
  const signIn = useSessionStore((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiError = error === null ? null : toApiError(error);

  const submit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await signIn(email.trim(), password);

      router.replace(homeRouteFor[roleGroupFor(user.role)]);
    } catch (caught) {
      setError(caught);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen title="Zaloguj się" subtitle="Codaro — system zgłoszeń">
      <View style={styles.form}>
        <TextField
          label="Adres e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="jan.kowalski@example.com"
          error={apiError?.fieldError('email') ?? null}
          testID="login-email"
        />

        <TextField
          label="Hasło"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          error={apiError?.fieldError('password') ?? null}
          testID="login-password"
        />

        {apiError === null || Object.keys(apiError.errors).length > 0 ? null : (
          <ErrorState error={apiError} title="Nie udało się zalogować" />
        )}

        <Button
          label="Zaloguj się"
          onPress={() => void submit()}
          loading={isSubmitting}
          testID="login-submit"
        />

        <Button
          label="Nie pamiętam hasła"
          variant="ghost"
          onPress={() => router.push('/(auth)/forgot-password')}
        />

        {env.apiMode === 'mock' ? (
          <View style={styles.demoBox}>
            <ThemedText type="smallBold">Tryb demonstracyjny (bez backendu)</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Konta testowe — hasło haslo123:{'\n'}klient@codaro.test · admin@codaro.test ·
              technik@codaro.test · prawnik@codaro.test · hiperadmin@codaro.test
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  demoBox: {
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
});
