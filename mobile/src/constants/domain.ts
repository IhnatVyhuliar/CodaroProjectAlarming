import type {
  AssigneeType,
  AssignmentScope,
  LocationMode,
  QueueSort,
  SuggestionStatus,
  UrgencyLevel,
  AttachmentType,
} from '@/api/types';

/**
 * Polish labels for *configuration* enums (urgency, scopes, suggestion states).
 * Operational statuses are never listed here — they come from the API.
 */

export const urgencyLabels: Record<UrgencyLevel, string> = {
  low: 'Niska',
  medium: 'Średnia',
  high: 'Wysoka',
  critical: 'Krytyczna',
};

export const urgencyOrder: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

export const suggestionStatusLabels: Record<SuggestionStatus, string> = {
  pending: 'Oczekuje na decyzję',
  accepted: 'Zaakceptowana',
  replaced: 'Zmieniona przez administratora',
  rejected: 'Odrzucona',
};

export const assigneeTypeLabels: Record<AssigneeType, string> = {
  staff: 'Pracownik',
  service: 'Służba',
};

export const assignmentScopeLabels: Record<AssignmentScope, string> = {
  report: 'Całe zgłoszenie',
  request: 'Wybrane zadanie',
};

export const locationModeLabels: Record<LocationMode, string> = {
  none: 'Bez lokalizacji',
  one_time: 'Jednorazowo',
  streaming: 'Transmisja ciągła',
};

export const queueSortLabels: Record<QueueSort, string> = {
  fifo: 'Po kolei',
  client_priority: 'Pilność klienta',
  ai_priority: 'Ocena AI',
};

export const attachmentTypeLabels: Record<AttachmentType, string> = {
  photo: 'Zdjęcie',
  file: 'Plik',
  audio: 'Wiadomość głosowa',
  video: 'Nagranie wideo',
};
