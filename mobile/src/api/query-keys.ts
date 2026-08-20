import type { QueueFilters, ReportListFilters } from './types';

/** Single source of truth for TanStack Query cache keys. */
export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,

  statusDefinitions: (entityType: 'report' | 'request') =>
    ['status-definitions', entityType] as const,

  categories: ['categories'] as const,
  positions: ['positions'] as const,
  dataScopes: ['data-scopes'] as const,

  clientDashboard: ['client', 'dashboard'] as const,
  adminDashboard: ['admin', 'dashboard'] as const,

  reports: ['reports'] as const,
  reportList: (filters: ReportListFilters) => ['reports', 'list', filters] as const,
  report: (reportId: number) => ['reports', 'detail', reportId] as const,
  reportHistory: (reportId: number) => ['reports', 'history', reportId] as const,
  reportTransitions: (reportId: number) => ['reports', 'transitions', reportId] as const,
  reportAssignments: (reportId: number, includeInactive: boolean) =>
    ['reports', 'assignments', reportId, includeInactive] as const,
  reportSuggestions: (reportId: number) => ['reports', 'suggestions', reportId] as const,

  requests: ['requests'] as const,
  request: (requestId: number) => ['requests', 'detail', requestId] as const,
  requestHistory: (requestId: number) => ['requests', 'history', requestId] as const,
  requestTransitions: (requestId: number) => ['requests', 'transitions', requestId] as const,

  queue: ['queue'] as const,
  queueList: (filters: QueueFilters) => ['queue', 'list', filters] as const,

  assignments: ['assignments'] as const,
  activeAssignments: ['assignments', 'active'] as const,

  staffTasks: ['staff', 'tasks'] as const,
  staffTask: (assignmentId: number) => ['staff', 'tasks', assignmentId] as const,

  directoryStaff: (positionId: number | null, search: string) =>
    ['directory', 'staff', positionId, search] as const,
  directoryServices: (search: string) => ['directory', 'services', search] as const,

  notifications: ['notifications'] as const,
  notificationList: (onlyUnread: boolean) => ['notifications', 'list', onlyUnread] as const,
  notificationsUnreadCount: ['notifications', 'unread-count'] as const,
} as const;
