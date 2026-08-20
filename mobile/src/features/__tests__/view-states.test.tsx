import { fireEvent, waitFor } from '@testing-library/react-native';

import { apiClient } from '@/api/client';
import { createMockAdapter } from '@/api/mock/adapter';
import { ClientReportList } from '@/features/client/client-report-list';
import { StaffTaskList } from '@/features/staff/staff-task-list';
import { demoAccounts, renderWithProviders, resetTestEnvironment, signInAs } from '@/test-utils/render';

beforeEach(() => {
  resetTestEnvironment();
});

afterEach(() => {
  apiClient.defaults.adapter = createMockAdapter(0);
});

describe('view states', () => {
  // Acceptance test 14 — loading
  it('shows the loading state while the request is in flight', async () => {
    await signInAs(demoAccounts.staffTechnik);
    apiClient.defaults.adapter = createMockAdapter(400);

    const view = await renderWithProviders(<StaffTaskList />);

    expect(view.getByTestId('loading-state')).toBeTruthy();

    await waitFor(() => {
      expect(view.getByText('Wymiana rolki drzwi kabiny')).toBeTruthy();
    });

    expect(view.queryByTestId('loading-state')).toBeNull();
  });

  // Acceptance test 14 — error
  it('shows the error state when the API rejects the request', async () => {
    const view = await renderWithProviders(<ClientReportList />);

    await waitFor(() => {
      expect(view.getByTestId('error-state')).toBeTruthy();
    });

    expect(view.getByText('Sesja wygasła. Zaloguj się ponownie.')).toBeTruthy();
  });

  // Acceptance test 14 — empty
  it('shows the empty state when the worker has no active assignments', async () => {
    await signInAs(demoAccounts.staffElektryk);

    const view = await renderWithProviders(<StaffTaskList />);

    await waitFor(() => {
      expect(view.getByTestId('staff-tasks-empty')).toBeTruthy();
    });

    expect(view.getByText('Brak aktualnych zadań')).toBeTruthy();
  });

  it('shows the empty state when a client filter matches nothing', async () => {
    await signInAs(demoAccounts.client);

    const view = await renderWithProviders(<ClientReportList />);

    await waitFor(() => {
      expect(view.getByText('Uwięziona osoba w kabinie — Kwiatowa 12, winda A')).toBeTruthy();
    });

    // Filtering by a status nobody has yields the documented empty state.
    await fireEvent.press(view.getByLabelText('Odrzucone'));

    await waitFor(() => {
      expect(view.getByTestId('empty-state')).toBeTruthy();
    });
  });
});
