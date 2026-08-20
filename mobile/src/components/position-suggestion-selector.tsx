import type { Position } from '@/api/types';
import { LoadingState } from '@/components/loading-state';
import { OptionList } from '@/components/ui/option-list';

export interface PositionSuggestionSelectorProps {
  positions: Position[] | undefined;
  isLoading?: boolean;
  value: number | null;
  onChange: (positionId: number | null) => void;
  label?: string;
  hint?: string;
  testID?: string;
}

/**
 * Client-facing picker of a *position* ("stanowisko"). It intentionally never
 * lists workers or services — the client may only suggest a role, and the
 * decision belongs to the administrator.
 */
export function PositionSuggestionSelector({
  positions,
  isLoading = false,
  value,
  onChange,
  label = 'Proponowane stanowisko (opcjonalnie)',
  hint = 'Widzisz wyłącznie nazwy stanowisk. O tym, kto realizuje zgłoszenie, decyduje administrator.',
  testID,
}: PositionSuggestionSelectorProps) {
  if (isLoading) {
    return <LoadingState label="Wczytywanie stanowisk…" />;
  }

  const options = [
    { value: 0, label: 'Bez propozycji', description: 'Decyzję pozostawiam administratorowi.' },
    ...(positions ?? []).map((position) => ({
      value: position.id,
      label: position.name,
      description: position.description,
    })),
  ];

  return (
    <OptionList
      label={label}
      hint={hint}
      options={options}
      value={value ?? 0}
      onChange={(next) => onChange(next === 0 ? null : next)}
      testID={testID ?? 'position-suggestion-selector'}
    />
  );
}
