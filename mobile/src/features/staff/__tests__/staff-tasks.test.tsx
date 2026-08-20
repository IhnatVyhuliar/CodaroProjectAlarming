import { waitFor } from '@testing-library/react-native';

import { assignmentsApi } from '@/api/endpoints/assignments';
import { staffTasksApi } from '@/api/endpoints/staff-tasks';
import { StaffTaskDetail } from '@/features/staff/staff-task-detail';
import { StaffTaskList } from '@/features/staff/staff-task-list';
import { demoAccounts, renderWithProviders, resetTestEnvironment, signInAs } from '@/test-utils/render';

const REQUEST_SCOPED_ASSIGNMENT = 2;

beforeEach(() => {
  resetTestEnvironment();
});

describe('staff panel', () => {
  // Acceptance test 7
  it('lists only the current assignments of the signed-in worker', async () => {
    await signInAs(demoAccounts.staffTechnik);

    const tasks = await staffTasksApi.list();

    expect(tasks).toHaveLength(1);

    const view = await renderWithProviders(<StaffTaskList />);

    await waitFor(() => {
      expect(view.getByText('Wymiana rolki drzwi kabiny')).toBeTruthy();
    });

    // The site address and the elevator label must be on the list — the crew has to know where to go.
    expect(view.getByText('Obiekt: ul. Kwiatowa 12, 00-950 Warszawa')).toBeTruthy();
    expect(view.getByText('Urządzenie: Winda B (kabina 2)')).toBeTruthy();

    // Another worker's assignment must not leak into this list.
    expect(view.queryByText('Winda staje między piętrami — Słoneczna 5')).toBeNull();
    expect(view.queryByText('Wymiana czujnika pozycji')).toBeNull();
  });

  // Acceptance test 8
  it('hides data of sibling requests from a request-scoped assignee', async () => {
    await signInAs(demoAccounts.staffTechnik);

    const view = await renderWithProviders(
      <StaffTaskDetail assignmentId={REQUEST_SCOPED_ASSIGNMENT} />,
    );

    await waitFor(() => {
      expect(view.getByText('drzwi-kabiny.jpg')).toBeTruthy();
    });

    expect(view.getByText('Wybrane zadanie · Technik windowy')).toBeTruthy();
    // Request #5 of the same report is out of scope.
    expect(view.queryByText('Wpis do dziennika konserwacji')).toBeNull();
    expect(view.queryByText('dziennik-konserwacji.pdf')).toBeNull();
  });

  // Acceptance test 12
  it('drops a revoked assignment from the active list and blocks its data', async () => {
    await signInAs(demoAccounts.admin);
    await assignmentsApi.revoke(REQUEST_SCOPED_ASSIGNMENT, 'Zadanie przekazane innej ekipie.');

    await signInAs(demoAccounts.staffTechnik);

    await expect(staffTasksApi.list()).resolves.toHaveLength(0);
    await expect(staffTasksApi.detail(REQUEST_SCOPED_ASSIGNMENT)).rejects.toThrow();

    const view = await renderWithProviders(<StaffTaskList />);

    await waitFor(() => {
      expect(view.getByTestId('staff-tasks-empty')).toBeTruthy();
    });

    expect(view.queryByText('Wymiana rolki drzwi kabiny')).toBeNull();
  });

  it('blocks entry into a revoked task detail screen', async () => {
    await signInAs(demoAccounts.admin);
    await assignmentsApi.revoke(REQUEST_SCOPED_ASSIGNMENT);
    await signInAs(demoAccounts.staffTechnik);

    const view = await renderWithProviders(
      <StaffTaskDetail assignmentId={REQUEST_SCOPED_ASSIGNMENT} />,
    );

    await waitFor(() => {
      expect(view.getByText('Brak dostępu do tego zadania')).toBeTruthy();
    });

    expect(view.queryByText('drzwi-kabiny.jpg')).toBeNull();
    expect(view.getByTestId('staff-task-back')).toBeTruthy();
  });
});
