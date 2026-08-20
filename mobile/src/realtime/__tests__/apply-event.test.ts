import { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { applyRealtimeEvent } from '@/realtime/apply-event';
import type { RealtimeEvent } from '@/realtime/events';

function event(overrides: Partial<RealtimeEvent> & Pick<RealtimeEvent, 'name'>): RealtimeEvent {
  return { report_id: null, request_id: null, assignment_id: null, ...overrides };
}

describe('applyRealtimeEvent', () => {
  // Acceptance test 13
  it('invalidates the report caches when a report status changes', () => {
    const queryClient = new QueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    applyRealtimeEvent(queryClient, event({ name: 'report.status.changed', report_id: 7 }));

    const keys = invalidate.mock.calls.map(([options]) => JSON.stringify(options?.queryKey));

    expect(keys).toContain(JSON.stringify(queryKeys.report(7)));
    expect(keys).toContain(JSON.stringify(queryKeys.reportTransitions(7)));
    expect(keys).toContain(JSON.stringify(queryKeys.reportHistory(7)));
    expect(keys).toContain(JSON.stringify(queryKeys.notifications));
  });

  it('invalidates assignment and staff task caches when an assignment is revoked', () => {
    const queryClient = new QueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    applyRealtimeEvent(
      queryClient,
      event({ name: 'assignment.revoked', report_id: 3, request_id: 4, assignment_id: 2 }),
    );

    const keys = invalidate.mock.calls.map(([options]) => JSON.stringify(options?.queryKey));

    expect(keys).toContain(JSON.stringify(queryKeys.assignments));
    expect(keys).toContain(JSON.stringify(queryKeys.staffTasks));
    expect(keys).toContain(JSON.stringify(queryKeys.request(4)));
    expect(keys).toContain(JSON.stringify(queryKeys.reportAssignments(3, true)));
  });

  it('refreshes a query that is already cached', async () => {
    const queryClient = new QueryClient();
    let fetches = 0;

    await queryClient.fetchQuery({
      queryKey: queryKeys.report(2),
      queryFn: () => {
        fetches += 1;

        return Promise.resolve({ id: 2 });
      },
    });

    expect(fetches).toBe(1);

    applyRealtimeEvent(queryClient, event({ name: 'report.status.changed', report_id: 2 }));

    expect(queryClient.getQueryState(queryKeys.report(2))?.isInvalidated).toBe(true);
  });
});
