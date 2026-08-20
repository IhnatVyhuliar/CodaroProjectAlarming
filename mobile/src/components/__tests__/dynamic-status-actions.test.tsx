import { fireEvent, waitFor } from '@testing-library/react-native';

import { statusesApi } from '@/api/endpoints/statuses';
import type { StatusTransitionOption } from '@/api/types';
import { DynamicStatusActions } from '@/components/dynamic-status-actions';
import { demoAccounts, renderWithProviders, resetTestEnvironment, signInAs } from '@/test-utils/render';

beforeEach(() => {
  resetTestEnvironment();
});

function transition(overrides: Partial<StatusTransitionOption> = {}): StatusTransitionOption {
  return {
    id: 1,
    to_status_id: 10,
    key: 'done',
    label: 'Zrealizowane',
    description: null,
    color: '#15803D',
    requires_confirmation: false,
    requires_note: false,
    requires_attachment: false,
    ...overrides,
  };
}

describe('DynamicStatusActions', () => {
  // Acceptance test 9
  it('renders one button per transition returned by the API', async () => {
    await signInAs(demoAccounts.admin);

    const transitions = await statusesApi.reportTransitions(1);

    expect(transitions.length).toBeGreaterThan(0);

    const view = await renderWithProviders(
      <DynamicStatusActions transitions={transitions} onSubmit={async () => undefined} />,
    );

    transitions.forEach((option) => {
      expect(view.getByTestId(`status-transition-${option.key}`)).toBeTruthy();
      expect(view.getByLabelText(option.label)).toBeTruthy();
    });

    // Nothing is invented locally: exactly as many buttons as the API returned.
    expect(view.getAllByRole('button').length).toBe(transitions.length);
  });

  // Acceptance test 10
  it('renders no status control when the API returns an empty list', async () => {
    const view = await renderWithProviders(
      <DynamicStatusActions transitions={[]} onSubmit={async () => undefined} />,
    );

    expect(view.queryByTestId('dynamic-status-actions')).toBeNull();
    expect(view.queryByText('Zmiana statusu')).toBeNull();
  });

  // Acceptance test 11
  it('blocks a transition that requires a note until the note is provided', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const requiresNote = transition({ key: 'rejected', label: 'Odrzucone', requires_note: true });

    const view = await renderWithProviders(
      <DynamicStatusActions transitions={[requiresNote]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(view.getByTestId('status-transition-rejected'));

    await waitFor(() => {
      expect(view.getByTestId('status-transition-confirm')).toBeTruthy();
    });

    await fireEvent.press(view.getByTestId('status-transition-confirm'));

    await waitFor(() => {
      expect(view.getByText('Ta zmiana statusu wymaga notatki.')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(view.getByTestId('status-transition-note'), 'Duplikat zgłoszenia');
    await fireEvent.press(view.getByTestId('status-transition-confirm'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        requiresNote,
        expect.objectContaining({
          to_status_id: requiresNote.to_status_id,
          note: 'Duplikat zgłoszenia',
        }),
      );
    });
  });
});
