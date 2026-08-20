import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { authApi } from '@/api/endpoints/auth';
import { toApiError } from '@/api/errors';
import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authApi.requestPasswordReset(email.trim());

      setMessage(response.message);
    } catch (caught) {
      setError(caught);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      title="Odzyskiwanie hasła"
      subtitle="Wyślemy link do ustawienia nowego hasła na podany adres.">
      <View style={styles.form}>
        <TextField
          label="Adres e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={error === null ? null : toApiError(error).fieldError('email')}
          testID="forgot-email"
        />

        {message === null ? null : (
          <ThemedText type="small" themeColor="success">
            {message}
          </ThemedText>
        )}

        {error === null ? null : <ErrorState error={error} title="Nie udało się wysłać wiadomości" />}

        <Button
          label="Wyślij link"
          onPress={() => void submit()}
          loading={isSubmitting}
          testID="forgot-submit"
        />
        <Button label="Wróć do logowania" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
});
