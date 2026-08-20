/** Realtime event payloads broadcast by the backend (Reverb) and consumed by the app. */

export type RealtimeEventName =
  | 'report.created'
  | 'report.status.changed'
  | 'request.status.changed'
  | 'assignment.created'
  | 'assignment.changed'
  | 'assignment.revoked'
  | 'attachment.added'
  | 'note.added'
  | 'stream.started'
  | 'stream.ended'
  | 'notification.created';

export interface RealtimeEvent {
  name: RealtimeEventName;
  report_id: number | null;
  request_id: number | null;
  assignment_id: number | null;
}

export const realtimeEventNames: RealtimeEventName[] = [
  'report.created',
  'report.status.changed',
  'request.status.changed',
  'assignment.created',
  'assignment.changed',
  'assignment.revoked',
  'attachment.added',
  'note.added',
  'stream.started',
  'stream.ended',
  'notification.created',
];

export function isRealtimeEventName(value: string): value is RealtimeEventName {
  return (realtimeEventNames as string[]).includes(value);
}

export function toRealtimeEvent(name: RealtimeEventName, payload: unknown): RealtimeEvent {
  const source = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;

  const asId = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  return {
    name,
    report_id: asId(source.report_id),
    request_id: asId(source.request_id),
    assignment_id: asId(source.assignment_id),
  };
}
