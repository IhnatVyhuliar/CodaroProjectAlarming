import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import type { RealtimeEvent } from './events';

/**
 * Maps a realtime event onto cache invalidations. Pure and side-effect free
 * beyond the query client, so it can be unit tested without a socket.
 */
export function applyRealtimeEvent(queryClient: QueryClient, event: RealtimeEvent): void {
  const invalidate = (queryKey: readonly unknown[]): void => {
    void queryClient.invalidateQueries({ queryKey });
  };

  // Every event may produce a notification for the current user.
  invalidate(queryKeys.notifications);

  if (event.report_id !== null) {
    invalidate(queryKeys.report(event.report_id));
    invalidate(queryKeys.reportHistory(event.report_id));
    invalidate(queryKeys.reportTransitions(event.report_id));
  }

  if (event.request_id !== null) {
    invalidate(queryKeys.request(event.request_id));
    invalidate(queryKeys.requestHistory(event.request_id));
    invalidate(queryKeys.requestTransitions(event.request_id));
  }

  switch (event.name) {
    case 'report.created':
      invalidate(queryKeys.queue);
      invalidate(queryKeys.reports);
      invalidate(queryKeys.adminDashboard);
      break;

    case 'report.status.changed':
    case 'request.status.changed':
      invalidate(queryKeys.reports);
      invalidate(queryKeys.queue);
      invalidate(queryKeys.clientDashboard);
      invalidate(queryKeys.adminDashboard);
      invalidate(queryKeys.staffTasks);
      break;

    case 'assignment.created':
    case 'assignment.changed':
    case 'assignment.revoked':
      invalidate(queryKeys.assignments);
      invalidate(queryKeys.staffTasks);
      invalidate(queryKeys.adminDashboard);
      invalidate(queryKeys.clientDashboard);
      invalidate(queryKeys.reports);

      if (event.report_id !== null) {
        invalidate(queryKeys.reportAssignments(event.report_id, true));
        invalidate(queryKeys.reportAssignments(event.report_id, false));
      }
      break;

    case 'attachment.added':
    case 'note.added':
      invalidate(queryKeys.staffTasks);
      invalidate(queryKeys.clientDashboard);
      break;

    case 'stream.started':
    case 'stream.ended':
      invalidate(queryKeys.clientDashboard);
      invalidate(queryKeys.reports);
      break;

    case 'notification.created':
      break;
  }
}
