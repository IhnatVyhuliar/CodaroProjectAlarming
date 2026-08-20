import { fireEvent, waitFor } from '@testing-library/react-native';

import { reportsApi } from '@/api/endpoints/reports';
import type { CreateAssignmentPayload, DataScopeOption, Position, RequestSummary } from '@/api/types';
import { AssignmentForm } from '@/components/assignment-form';
import { demoAccounts, renderWithProviders, resetTestEnvironment, signInAs } from '@/test-utils/render';

const POSITIONS: Position[] = [
  { id: 1, name: 'Technik windowy', description: null, is_active: true },
  { id: 3, name: 'Ratownik', description: null, is_active: true },
];

const DATA_SCOPES: DataScopeOption[] = [
  { key: 'minimal', label: 'Minimalny', description: null },
  { key: 'request_only', label: 'Tylko wskazane zadanie', description: null },
  { key: 'report_full', label: 'Pełne zgłoszenie', description: null },
];

const REQUESTS: RequestSummary[] = [
  {
    id: 1,
    report_id: 1,
    name: 'Uwolnienie osoby z kabiny',
    description: null,
    status: {
      id: 11,
      key: 'pending',
      label: 'Oczekuje',
      description: null,
      color: '#2563EB',
      is_final: false,
    },
    created_at: '2026-08-20T08:00:00.000Z',
    suggested_position: null,
    active_assignments_count: 0,
  },
];

beforeEach(() => {
  resetTestEnvironment();
});

describe('AssignmentForm', () => {
  // Acceptance test 4
  it('assigns a worker or a service to the whole report', async () => {
    await signInAs(demoAccounts.admin);

    const onSubmit = jest.fn(async () => undefined);
    const view = await renderWithProviders(
      <AssignmentForm
        requests={REQUESTS}
        positions={POSITIONS}
        dataScopes={DATA_SCOPES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(view.getByLabelText('Technik windowy'));
    await fireEvent.press(await view.findByLabelText('Piotr Nowak'));
    await fireEvent.press(view.getByTestId('assignment-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<CreateAssignmentPayload>>({
          request_id: null,
          assignee_type: 'staff',
          assignee_id: 3,
          position_id: 1,
        }),
      );
    });

    // The same form assigns an external service (e.g. fire brigade) to the report as well.
    await fireEvent.press(view.getByLabelText('Służba'));
    await fireEvent.press(await view.findByLabelText('Pogotowie windowe 24h'));
    await fireEvent.press(view.getByTestId('assignment-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenLastCalledWith(
        expect.objectContaining<Partial<CreateAssignmentPayload>>({
          request_id: null,
          assignee_type: 'service',
          assignee_id: 1,
        }),
      );
    });
  });

  // Acceptance test 5
  it('assigns a worker to a single request only', async () => {
    await signInAs(demoAccounts.admin);

    const onSubmit = jest.fn(async () => undefined);
    const view = await renderWithProviders(
      <AssignmentForm
        requests={REQUESTS}
        positions={POSITIONS}
        dataScopes={DATA_SCOPES}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(view.getByLabelText('Wybrane zadanie'));
    await fireEvent.press(await view.findByLabelText('Uwolnienie osoby z kabiny'));
    await fireEvent.press(view.getByLabelText('Technik windowy'));
    await fireEvent.press(await view.findByLabelText('Piotr Nowak'));
    await fireEvent.press(view.getByTestId('assignment-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<CreateAssignmentPayload>>({
          request_id: 1,
          assignee_type: 'staff',
          assignee_id: 3,
          data_scope: 'request_only',
        }),
      );
    });
  });

  // Acceptance test 6
  it('allows the administrator to keep the report without any assignee', async () => {
    await signInAs(demoAccounts.admin);

    const onSubmit = jest.fn(async () => undefined);
    const onHandleAlone = jest.fn(async () => undefined);
    const view = await renderWithProviders(
      <AssignmentForm
        requests={REQUESTS}
        positions={POSITIONS}
        dataScopes={DATA_SCOPES}
        onSubmit={onSubmit}
        onHandleAloneByAdmin={onHandleAlone}
      />,
    );

    await fireEvent.press(view.getByTestId('assignment-admin-only'));

    await waitFor(() => {
      expect(onHandleAlone).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).not.toHaveBeenCalled();
    // Missing assignee is a valid decision, not a form error.
    expect(
      view.queryByText('Wybierz pracownika lub służbę, albo zaznacz obsługę przez administratora.'),
    ).toBeNull();
  });

  it('records admin-only handling on the report itself', async () => {
    await signInAs(demoAccounts.admin);

    await reportsApi.markHandledByAdminOnly(1, 'Sprawa prowadzona przez dyspozytornię.');

    const detail = await reportsApi.detail(1);
    const history = await reportsApi.history(1);

    expect(detail.assignments).toHaveLength(0);
    expect(detail.handled_by_admin_only).toBe(true);
    expect(
      history.some((entry) => entry.label === 'Zgłoszenie realizowane wyłącznie przez administratora'),
    ).toBe(true);
  });
});
