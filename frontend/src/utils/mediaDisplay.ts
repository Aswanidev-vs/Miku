import type { Settings } from '../composables/useSettings'

export interface MediaTitleLike {
  romaji?: string | null
  english?: string | null
  native?: string | null
  userPreferred?: string | null
}

/** Resolve which title to display for a media item given the user's preference. */
export function preferredTitle(
  title: MediaTitleLike | null | undefined,
  pref: Settings['titleLanguage']
): string {
  if (!title) return ''
  if (pref === 'ACCOUNT') {
    return title.userPreferred || title.romaji || title.english || title.native || ''
  }
  const field = pref === 'ENGLISH' ? title.english : pref === 'NATIVE' ? title.native : title.romaji
  return field || title.userPreferred || title.romaji || ''
}

/**
 * Render an AniList 0-100 integer score in the requested display format.
 * ACCOUNT and POINT_10_DECIMAL both show score/10 — ACCOUNT keeps the decimal
 * digit ("8.0") while POINT_10_DECIMAL trims it ("8").
 */
export function formatScore(
  rawScore: number | null | undefined,
  format: Settings['scoreFormat']
): string {
  if (rawScore == null) return ''
  switch (format) {
    case 'POINT_100':
      return String(rawScore)
    case 'POINT_10_DECIMAL': {
      const tenth = (rawScore / 10).toFixed(1)
      return tenth.endsWith('.0') ? tenth.slice(0, -2) : tenth
    }
    case 'POINT_10':
      return String(Math.round(rawScore / 10))
    case 'POINT_5':
      return rawScore === 0 ? '' : String(Math.max(1, Math.round(rawScore / 20)))
    case 'POINT_3':
      if (rawScore === 0) return ''
      if (rawScore <= 39) return '1'
      if (rawScore <= 74) return '2'
      return '3'
    default: // ACCOUNT
      return (rawScore / 10).toFixed(1)
  }
}

/** Resolve the adult-content filter: an explicit app setting wins, null follows the AniList account. */
export function effectiveIsAdult(setting: boolean | null, account: boolean | undefined): boolean {
  return setting === null ? !!account : setting
}
