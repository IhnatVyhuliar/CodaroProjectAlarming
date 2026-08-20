import { fireEvent, waitFor } from '@testing-library/react-native';

import { assignmentsApi } from '@/api/endpoints/assignments';
import { reportsApi } from '@/api/endpoints/reports';
import { ClientReportDetail } from '@/features/client/client-report-detail';
import { ReportWizard } from '@/features/client/report-wizard';
import { demoAccounts, renderWithProviders, resetTestEnvironment, signInAs } from '@/test-utils/render';

const REPORT_WITHOUT_ASSIGNMENT = 1;
const REPORT_WITH_ACTIVE_ASSIGNMENT = 2;
const STAFF_TECHNIK_ID = 3;

beforeEach(() => {
  resetTestEnvironment();
});

describe('client panel — assignee visibility', () => {
  // Acceptance test 1
  it('lets the client suggest a position and never shows a worker or service selector', async () => {
    await signInAs(demoAccounts.client);

    const view = await renderWithProviders(<ReportWizard />);

    await fireEvent.changeText(view.getByTestId('report-name'), 'Winda nie dojeżdża na parter');
    await fireEvent.changeText(
      view.getByTestId('report-description'),
      'Kabina zatrzymuje się pół metra nad podłogą.',
    );
    await fireEvent.changeText(view.getByTestId('report-site-address'), 'ul. Kwiatowa 12');
    await fireEvent.changeText(view.getByTestId('report-device-label'), 'Winda A');

    // Step 1 → 2 (tasks) → 3 (position + location)
    await fireEvent.press(view.getByTestId('wizard-next'));
    await fireEvent.press(view.getByTestId('wizard-next'));

    const selector = await view.findByTestId('position-suggestion-selector');

    expect(selector).toBeTruthy();

    const positionOption = view.getByLabelText('Technik windowy');

    await fireEvent.press(positionOption);

    expect(view.getByLabelText('Technik windowy').props.accessibilityState.selected).toBe(true);

    // No assignee pickers anywhere in the client flow.
    expect(view.queryByTestId('assignee-selector')).toBeNull();
    expect(view.queryByTestId('assignee-type-selector')).toBeNull();
    expect(view.queryByText('Dostępni pracownicy')).toBeNull();
    expect(view.queryByText('Dostępne służby')).toBeNull();
    expect(view.queryByText('Piotr Nowak')).toBeNull();
    expect(view.queryByText('Pogotowie windowe 24h')).toBeNull();
    expect(view.queryByText('Straż pożarna — uwolnienie z kabiny')).toBeNull();
  });

  // Track A: uwięzienie w kabinie wymusza pilność krytyczną po stronie API
  it('marks an entrapment report as critical and keeps the site data', async () => {
    await signInAs(demoAccounts.client);

    const report = await reportsApi.create({
      name: 'Uwięziona osoba — Kwiatowa 12',
      description: 'Kabina stanęła między piętrami, w środku jedna osoba.',
      category_id: 1,
      urgency: 'low',
      is_entrapment: true,
      site_address: 'ul. Kwiatowa 12, Warszawa',
      device_label: 'Winda A (kabina 1)',
      location_mode: 'one_time',
      location: { lat: 52.2297, lng: 21.0122, accuracy: 10 },
      suggested_position_id: null,
      requests: [],
    });

    expect(report.is_entrapment).toBe(true);
    expect(report.urgency).toBe('critical');
    expect(report.site_address).toBe('ul. Kwiatowa 12, Warszawa');
    expect(report.device_label).toBe('Winda A (kabina 1)');

    const view = await renderWithProviders(<ClientReportDetail reportId={report.id} />);

    await waitFor(() => {
      expect(view.getByTestId('entrapment-badge')).toBeTruthy();
    });

    expect(view.getByText('Obiekt: ul. Kwiatowa 12, Warszawa')).toBeTruthy();
    expect(view.getByText('Urządzenie: Winda A (kabina 1)')).toBeTruthy();
  });

  // Acceptance test 2
  it('does not render any worker data before an assignment exists', async () => {
    await signInAs(demoAccounts.client);

    const detail = await reportsApi.detail(REPORT_WITHOUT_ASSIGNMENT);

    expect(detail.assignments).toHaveLength(0);

    const view = await renderWithProviders(
      <ClientReportDetail reportId={REPORT_WITHOUT_ASSIGNMENT} />,
    );

    await waitFor(() => {
      expect(view.getByTestId('client-assignments-empty')).toBeTruthy();
    });

    expect(view.queryByText('Piotr Nowak')).toBeNull();
    expect(view.queryByText('Katarzyna Lis')).toBeNull();
    expect(view.queryByText('Kontakt: serwis@codaro.test')).toBeNull();

    // The client still sees the position they suggested — a position is not a person.
    expect(view.getByText('Stanowisko: Ratownik')).toBeTruthy();
  });

  // Acceptance test 3
  it('shows worker data once the administrator creates an active assignment', async () => {
    await signInAs(demoAccounts.client);

    const before = await renderWithProviders(
      <ClientReportDetail reportId={REPORT_WITHOUT_ASSIGNMENT} />,
    );

    await waitFor(() => {
      expect(before.getByTestId('client-assignments-empty')).toBeTruthy();
    });
    await before.unmount();

    await signInAs(demoAccounts.admin);
    await assignmentsApi.create(REPORT_WITHOUT_ASSIGNMENT, {
      request_id: null,
      assignee_type: 'staff',
      assignee_id: STAFF_TECHNIK_ID,
      position_id: 1,
      data_scope: 'report_full',
      instruction: null,
    });

    await signInAs(demoAccounts.client);

    const after = await renderWithProviders(
      <ClientReportDetail reportId={REPORT_WITHOUT_ASSIGNMENT} />,
    );

    await waitFor(() => {
      expect(after.getByText('Piotr Nowak')).toBeTruthy();
    });

    expect(after.getByText('Kontakt: serwis@codaro.test')).toBeTruthy();
    expect(after.queryByTestId('client-assignments-empty')).toBeNull();
  });

  it('shows the assigned maintenance worker of an existing report', async () => {
    await signInAs(demoAccounts.client);

    const view = await renderWithProviders(
      <ClientReportDetail reportId={REPORT_WITH_ACTIVE_ASSIGNMENT} />,
    );

    await waitFor(() => {
      expect(view.getByText('Katarzyna Lis')).toBeTruthy();
    });

    expect(view.getByText('Kontakt: konserwacja@codaro.test')).toBeTruthy();
  });

});
