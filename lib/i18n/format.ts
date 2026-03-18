import { de } from './de'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '–'
  return d.toLocaleDateString(de.locale, de.dateFormat as Intl.DateTimeFormatOptions)
  // → "14. Mär. 2026"
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '–'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '–'
  return d.toLocaleTimeString(de.locale, de.timeFormat as Intl.DateTimeFormatOptions)
  // → "09:43"
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '–'
  return d.toLocaleString(de.locale, de.dateTimeFormat as Intl.DateTimeFormatOptions)
  // → "14. Mär., 09:43"
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} Min.`
  if (m === 0) return `${h} Std.`
  return `${h} Std. ${m} Min.`
}

export function formatDelay(minutes: number): string {
  if (minutes <= 0) return 'Pünktlich'
  return `+${minutes} Min.`
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString('de-DE')} km`
}

export function formatDurationMs(ms: number): string {
  return formatDuration(Math.round(ms / 60000))
}
