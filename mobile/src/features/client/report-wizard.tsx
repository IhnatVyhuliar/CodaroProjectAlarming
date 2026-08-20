import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { reportsApi } from '@/api/endpoints/reports';
import { toApiError } from '@/api/errors';
import type { LocalFileRef, LocationMode, NewRequestDraft, UrgencyLevel } from '@/api/types';
import { ErrorState } from '@/components/error-state';
import { PhotoCapture } from '@/components/media/photo-capture';
import { LocationPicker, type LocationValue } from '@/components/media/location-picker';
import { VoiceNoteRecorder } from '@/components/media/voice-note-recorder';
import { PositionSuggestionSelector } from '@/components/position-suggestion-selector';
import { SiteInfo } from '@/components/site-info';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OptionList } from '@/components/ui/option-list';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { locationModeLabels, urgencyLabels, urgencyOrder } from '@/constants/domain';
import { Spacing } from '@/constants/theme';
import { useCategories, usePositions } from '@/hooks/queries/use-dictionaries';
import { useCreateReport } from '@/hooks/queries/use-reports';

const STEPS = ['Zgłoszenie', 'Zadania', 'Stanowisko i lokalizacja', 'Materiały', 'Podsumowanie'];

interface RequestDraftState extends NewRequestDraft {
  key: string;
}

export function ReportWizard() {
  const router = useRouter();
  const categories = useCategories();
  const positions = usePositions();
  const createReport = useCreateReport();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [isEntrapment, setIsEntrapment] = useState(false);
  const [siteAddress, setSiteAddress] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [requests, setRequests] = useState<RequestDraftState[]>([]);
  const [reportPositionId, setReportPositionId] = useState<number | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>('none');
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [files, setFiles] = useState<LocalFileRef[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiError = error === null ? null : toApiError(error);

  const addRequest = (): void => {
    setRequests((previous) => [
      ...previous,
      { key: `draft-${previous.length + 1}-${Date.now()}`, name: '', description: null, suggested_position_id: null },
    ]);
  };

  const updateRequest = (key: string, patch: Partial<NewRequestDraft>): void => {
    setRequests((previous) =>
      previous.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  };

  const removeRequest = (key: string): void => {
    setRequests((previous) => previous.filter((draft) => draft.key !== key));
  };

  const canGoNext = ((): boolean => {
    if (step === 0) {
      return name.trim().length > 0 && description.trim().length > 0;
    }
    if (step === 1) {
      return requests.every((draft) => draft.name.trim().length > 0);
    }

    return true;
  })();

  const submit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    setUploadWarning(null);

    try {
      const report = await createReport.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId,
        urgency,
        is_entrapment: isEntrapment,
        site_address: siteAddress.trim().length > 0 ? siteAddress.trim() : null,
        device_label: deviceLabel.trim().length > 0 ? deviceLabel.trim() : null,
        location_mode: locationMode,
        location: locationMode === 'none' ? null : location,
        suggested_position_id: reportPositionId,
        requests: requests.map((draft) => ({
          name: draft.name.trim(),
          description: draft.description,
          suggested_position_id: draft.suggested_position_id,
        })),
      });

      const failed: string[] = [];

      for (const file of files) {
        try {
          await reportsApi.uploadAttachment(report.id, file);
        } catch {
          failed.push(file.name);
        }
      }

      if (failed.length > 0) {
        setUploadWarning(
          `Zgłoszenie zostało utworzone, ale nie udało się wysłać materiałów: ${failed.join(', ')}. Możesz dodać je ponownie w szczegółach zgłoszenia.`,
        );
      }

      router.replace(`/(client)/reports/${report.id}`);
    } catch (caught) {
      setError(caught);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      title="Nowe zgłoszenie serwisowe"
      subtitle={`Krok ${step + 1} z ${STEPS.length}: ${STEPS[step]}`}
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <Button label="Wstecz" variant="ghost" onPress={() => setStep(step - 1)} />
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button
              label="Dalej"
              onPress={() => setStep(step + 1)}
              disabled={!canGoNext}
              testID="wizard-next"
            />
          ) : (
            <Button
              label="Wyślij zgłoszenie"
              onPress={() => void submit()}
              loading={isSubmitting}
              testID="wizard-submit"
            />
          )}
        </View>
      }>
      {apiError === null ? null : <ErrorState error={apiError} title="Nie udało się zapisać zgłoszenia" />}
      {uploadWarning === null ? null : (
        <ThemedText type="small" themeColor="warning">
          {uploadWarning}
        </ThemedText>
      )}

      {step === 0 ? (
        <Section title="Opis sprawy">
          <OptionList
            label="Czy ktoś jest uwięziony w kabinie?"
            hint="Zgłoszenie ratunkowe trafia na czoło kolejki dyspozytora."
            options={[
              { value: 'no', label: 'Nie' },
              {
                value: 'yes',
                label: 'Tak — osoba w kabinie',
                description: 'Pilność zostanie ustawiona na krytyczną, poprosimy też o lokalizację.',
              },
            ]}
            value={isEntrapment ? 'yes' : 'no'}
            onChange={(value) => {
              const entrapment = value === 'yes';

              setIsEntrapment(entrapment);

              if (entrapment) {
                setUrgency('critical');

                if (locationMode === 'none') {
                  setLocationMode('one_time');
                }
              }
            }}
            inline
            testID="entrapment-selector"
          />

          <TextField
            label="Adres obiektu"
            value={siteAddress}
            onChangeText={setSiteAddress}
            placeholder="np. ul. Kwiatowa 12, Warszawa"
            hint="Adres budynku wspólnoty lub spółdzielni."
            testID="report-site-address"
          />

          <TextField
            label="Oznaczenie windy"
            value={deviceLabel}
            onChangeText={setDeviceLabel}
            placeholder="np. Winda A (kabina 1), klatka II"
            testID="report-device-label"
          />

          <TextField
            label="Nazwa zgłoszenia"
            value={name}
            onChangeText={setName}
            placeholder="Krótko, o co chodzi"
            error={apiError?.fieldError('name') ?? null}
            testID="report-name"
          />
          <TextField
            label="Opis"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Opisz sytuację, tak jak ją widzisz"
            error={apiError?.fieldError('description') ?? null}
            testID="report-description"
          />
          <OptionList
            label="Kategoria"
            options={(categories.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
              description: category.description,
            }))}
            value={categoryId}
            onChange={setCategoryId}
            emptyLabel="Brak kategorii do wyboru."
          />
          <OptionList
            label="Deklarowana pilność"
            hint={
              isEntrapment
                ? 'Przy uwięzieniu w kabinie serwis traktuje zgłoszenie jako krytyczne.'
                : undefined
            }
            options={urgencyOrder.map((level) => ({ value: level, label: urgencyLabels[level] }))}
            value={urgency}
            onChange={setUrgency}
            inline
          />
        </Section>
      ) : null}

      {step === 1 ? (
        <Section
          title="Zadania w zgłoszeniu"
          description="Podziel sprawę na mniejsze zadania, jeśli to potrzebne. Dla każdego możesz zaproponować stanowisko.">
          {requests.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Brak zadań — zgłoszenie zostanie wysłane jako jedna sprawa.
            </ThemedText>
          ) : null}

          {requests.map((draft, index) => (
            <Card key={draft.key}>
              <ThemedText type="smallBold">Zadanie {index + 1}</ThemedText>
              <TextField
                label="Nazwa zadania"
                value={draft.name}
                onChangeText={(value) => updateRequest(draft.key, { name: value })}
                testID={`request-name-${index}`}
              />
              <TextField
                label="Opis zadania (opcjonalny)"
                value={draft.description ?? ''}
                onChangeText={(value) =>
                  updateRequest(draft.key, { description: value.length > 0 ? value : null })
                }
                multiline
              />
              <PositionSuggestionSelector
                positions={positions.data}
                isLoading={positions.isPending}
                value={draft.suggested_position_id}
                onChange={(value) => updateRequest(draft.key, { suggested_position_id: value })}
                label="Proponowane stanowisko dla tego zadania"
                testID={`request-position-selector-${index}`}
              />
              <Button
                label="Usuń zadanie"
                variant="ghost"
                onPress={() => removeRequest(draft.key)}
              />
            </Card>
          ))}

          <Button label="Dodaj zadanie" variant="secondary" onPress={addRequest} testID="add-request" />
        </Section>
      ) : null}

      {step === 2 ? (
        <Section title="Stanowisko i lokalizacja">
          <PositionSuggestionSelector
            positions={positions.data}
            isLoading={positions.isPending}
            value={reportPositionId}
            onChange={setReportPositionId}
            label="Proponowane stanowisko dla całego zgłoszenia"
          />
          <LocationPicker
            mode={locationMode}
            onModeChange={setLocationMode}
            value={location}
            onValueChange={setLocation}
          />
        </Section>
      ) : null}

      {step === 3 ? (
        <Section
          title="Materiały"
          description="Zdjęcia i wiadomości głosowe pomagają szybciej zrozumieć sprawę.">
          <PhotoCapture onCaptured={(file) => setFiles((previous) => [...previous, file])} />
          <VoiceNoteRecorder onRecorded={(file) => setFiles((previous) => [...previous, file])} />

          {files.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Brak materiałów.
            </ThemedText>
          ) : (
            files.map((file, index) => (
              <Card key={`${file.uri}-${index}`}>
                <ThemedText type="small">{file.name}</ThemedText>
                <Button
                  label="Usuń"
                  variant="ghost"
                  onPress={() =>
                    setFiles((previous) => previous.filter((candidate) => candidate !== file))
                  }
                />
              </Card>
            ))
          )}
        </Section>
      ) : null}

      {step === 4 ? (
        <Section title="Podsumowanie">
          <Card>
            <ThemedText type="smallBold">{name.trim().length > 0 ? name : '(brak nazwy)'}</ThemedText>
            <SiteInfo
              isEntrapment={isEntrapment}
              siteAddress={siteAddress.trim().length > 0 ? siteAddress.trim() : null}
              deviceLabel={deviceLabel.trim().length > 0 ? deviceLabel.trim() : null}
            />
            <ThemedText type="small">{description}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Kategoria:{' '}
              {categories.data?.find((category) => category.id === categoryId)?.name ?? 'nie wybrano'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Pilność: {urgencyLabels[urgency]}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Proponowane stanowisko:{' '}
              {positions.data?.find((position) => position.id === reportPositionId)?.name ??
                'bez propozycji'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Lokalizacja: {locationModeLabels[locationMode]}
              {location === null
                ? ''
                : ` (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Zadania: {requests.length} · Materiały: {files.length}
            </ThemedText>
          </Card>

          {requests.map((draft, index) => (
            <Card key={draft.key}>
              <ThemedText type="small">
                {index + 1}. {draft.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Proponowane stanowisko:{' '}
                {positions.data?.find((position) => position.id === draft.suggested_position_id)
                  ?.name ?? 'bez propozycji'}
              </ThemedText>
            </Card>
          ))}

          <ThemedText type="small" themeColor="textSecondary">
            O tym, kto realizuje zgłoszenie, decyduje administrator. Propozycja stanowiska nie daje
            nikomu dostępu do zgłoszenia.
          </ThemedText>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.two,
  },
});
