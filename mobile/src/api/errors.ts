import axios from 'axios';

export type ApiValidationErrors = Record<string, string[]>;

type ApiErrorOptions = {
  status?: number | null;
  errors?: ApiValidationErrors;
  isNetworkError?: boolean;
};

/** Normalised error shape used across the app — never leaks axios internals into UI code. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly errors: ApiValidationErrors;
  readonly isNetworkError: boolean;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? null;
    this.errors = options.errors ?? {};
    this.isNetworkError = options.isNetworkError ?? false;
  }

  fieldError(field: string): string | null {
    return this.errors[field]?.[0] ?? null;
  }
}

function isValidationErrors(value: unknown): value is ApiValidationErrors {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.values(value).every(
    (item) => Array.isArray(item) && item.every((entry) => typeof entry === 'string'),
  );
}

/** Maps anything thrown by the HTTP layer into an {@link ApiError} with a Polish message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const payload = error.response?.data as { message?: unknown; errors?: unknown } | undefined;
    const errors = isValidationErrors(payload?.errors) ? payload.errors : {};

    if (status === null) {
      return new ApiError('Brak połączenia z serwerem. Sprawdź sieć i spróbuj ponownie.', {
        status: null,
        isNetworkError: true,
      });
    }

    const message =
      typeof payload?.message === 'string' && payload.message.length > 0
        ? payload.message
        : defaultMessageForStatus(status);

    return new ApiError(message, { status, errors });
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('Wystąpił nieoczekiwany błąd.');
}

function defaultMessageForStatus(status: number): string {
  if (status === 401) {
    return 'Sesja wygasła. Zaloguj się ponownie.';
  }
  if (status === 403) {
    return 'Brak uprawnień do tej operacji.';
  }
  if (status === 404) {
    return 'Nie znaleziono zasobu.';
  }
  if (status === 422) {
    return 'Dane w formularzu są nieprawidłowe.';
  }
  if (status === 429) {
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';
  }
  if (status >= 500) {
    return 'Błąd serwera. Spróbuj ponownie za chwilę.';
  }

  return 'Nie udało się wykonać operacji.';
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isOfflineError(error: unknown): boolean {
  return error instanceof ApiError && error.isNetworkError;
}
