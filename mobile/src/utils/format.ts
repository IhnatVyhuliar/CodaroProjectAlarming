/** Date/size formatting helpers with Polish output. */

export function formatDateTime(iso: string | null): string {
  if (iso === null) {
    return '—';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelative(iso: string | null, now: number = Date.now()): string {
  if (iso === null) {
    return '—';
  }

  const timestamp = Date.parse(iso);

  if (Number.isNaN(timestamp)) {
    return '—';
  }

  const minutes = Math.round((now - timestamp) / 60_000);

  if (minutes < 1) {
    return 'przed chwilą';
  }
  if (minutes < 60) {
    return `${minutes} min temu`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours} godz. temu`;
  }

  const days = Math.round(hours / 24);

  return `${days} dni temu`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) {
    return '';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} kB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
