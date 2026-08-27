import { describe, it, expect } from 'vitest'
import { preferredTitle, formatScore, effectiveIsAdult } from './mediaDisplay'

const FULL_TITLE = {
  romaji: 'Shingeki no Kyojin',
  english: 'Attack on Titan',
  native: '進撃の巨人',
  userPreferred: 'Attack on Titan',
}

describe('preferredTitle', () => {
  it('ACCOUNT prefers userPreferred, then romaji, english, native', () => {
    expect(preferredTitle(FULL_TITLE, 'ACCOUNT')).toBe('Attack on Titan')
    expect(preferredTitle({ romaji: 'R', english: 'E', native: 'N' }, 'ACCOUNT')).toBe('R')
    expect(preferredTitle({ english: 'E', native: 'N' }, 'ACCOUNT')).toBe('E')
    expect(preferredTitle({ native: 'N' }, 'ACCOUNT')).toBe('N')
    expect(preferredTitle({}, 'ACCOUNT')).toBe('')
  })

  it('ROMAJI prefers romaji, then userPreferred, then romaji fallback chain', () => {
    expect(preferredTitle(FULL_TITLE, 'ROMAJI')).toBe('Shingeki no Kyojin')
    expect(preferredTitle({ english: 'E', userPreferred: 'U' }, 'ROMAJI')).toBe('U')
    expect(preferredTitle({ english: 'E' }, 'ROMAJI')).toBe('')
  })

  it('ENGLISH prefers english, then userPreferred, then romaji', () => {
    expect(preferredTitle(FULL_TITLE, 'ENGLISH')).toBe('Attack on Titan')
    expect(preferredTitle({ romaji: 'R', native: 'N' }, 'ENGLISH')).toBe('R')
    expect(preferredTitle({ userPreferred: 'U', native: 'N' }, 'ENGLISH')).toBe('U')
    expect(preferredTitle({ native: 'N' }, 'ENGLISH')).toBe('')
  })

  it('NATIVE prefers native, then userPreferred, then romaji', () => {
    expect(preferredTitle(FULL_TITLE, 'NATIVE')).toBe('進撃の巨人')
    expect(preferredTitle({ romaji: 'R', english: 'E' }, 'NATIVE')).toBe('R')
    expect(preferredTitle({ userPreferred: 'U', english: 'E' }, 'NATIVE')).toBe('U')
    expect(preferredTitle({ english: 'E' }, 'NATIVE')).toBe('')
  })

  it('treats null-ish fields as empty and never returns undefined', () => {
    expect(preferredTitle({ romaji: null, english: null, native: null, userPreferred: null }, 'ACCOUNT')).toBe('')
    expect(preferredTitle({ romaji: null }, 'ROMAJI')).toBe('')
  })

  it('returns an empty string for null or undefined titles', () => {
    expect(preferredTitle(null, 'ACCOUNT')).toBe('')
    expect(preferredTitle(undefined, 'ENGLISH')).toBe('')
    expect(preferredTitle(null, 'NATIVE')).toBe('')
  })
})

describe('formatScore — ACCOUNT', () => {
  it('renders score/10 with one decimal', () => {
    expect(formatScore(84, 'ACCOUNT')).toBe('8.4')
    expect(formatScore(80, 'ACCOUNT')).toBe('8.0')
    expect(formatScore(100, 'ACCOUNT')).toBe('10.0')
  })

  it('keeps zero and handles null/undefined', () => {
    expect(formatScore(0, 'ACCOUNT')).toBe('0.0')
    expect(formatScore(null, 'ACCOUNT')).toBe('')
    expect(formatScore(undefined, 'ACCOUNT')).toBe('')
  })
})

describe('formatScore — fixed formats', () => {
  it('POINT_100 passes the raw score through', () => {
    expect(formatScore(84, 'POINT_100')).toBe('84')
    expect(formatScore(100, 'POINT_100')).toBe('100')
    expect(formatScore(0, 'POINT_100')).toBe('0')
    expect(formatScore(null, 'POINT_100')).toBe('')
  })

  it('POINT_10_DECIMAL shows one decimal, trimmed', () => {
    expect(formatScore(84, 'POINT_10_DECIMAL')).toBe('8.4')
    expect(formatScore(80, 'POINT_10_DECIMAL')).toBe('8')
    expect(formatScore(100, 'POINT_10_DECIMAL')).toBe('10')
    expect(formatScore(0, 'POINT_10_DECIMAL')).toBe('0')
    expect(formatScore(null, 'POINT_10_DECIMAL')).toBe('')
  })

  it('POINT_10 rounds to the nearest whole point', () => {
    expect(formatScore(84, 'POINT_10')).toBe('8')
    expect(formatScore(85, 'POINT_10')).toBe('9')
    expect(formatScore(80, 'POINT_10')).toBe('8')
    expect(formatScore(100, 'POINT_10')).toBe('10')
    expect(formatScore(0, 'POINT_10')).toBe('0')
    expect(formatScore(undefined, 'POINT_10')).toBe('')
  })

  it('POINT_5 maps to 1-5 stars, keeping 0 empty', () => {
    expect(formatScore(0, 'POINT_5')).toBe('')
    expect(formatScore(1, 'POINT_5')).toBe('1')
    expect(formatScore(20, 'POINT_5')).toBe('1')
    expect(formatScore(40, 'POINT_5')).toBe('2')
    expect(formatScore(60, 'POINT_5')).toBe('3')
    expect(formatScore(80, 'POINT_5')).toBe('4')
    expect(formatScore(100, 'POINT_5')).toBe('5')
    expect(formatScore(null, 'POINT_5')).toBe('')
  })

  it('POINT_3 maps to 1/2/3 buckets, keeping 0 empty', () => {
    expect(formatScore(0, 'POINT_3')).toBe('')
    expect(formatScore(1, 'POINT_3')).toBe('1')
    expect(formatScore(39, 'POINT_3')).toBe('1')
    expect(formatScore(40, 'POINT_3')).toBe('2')
    expect(formatScore(74, 'POINT_3')).toBe('2')
    expect(formatScore(75, 'POINT_3')).toBe('3')
    expect(formatScore(100, 'POINT_3')).toBe('3')
    expect(formatScore(null, 'POINT_3')).toBe('')
  })
})

describe('effectiveIsAdult', () => {
  it('null follows the AniList account value', () => {
    expect(effectiveIsAdult(null, true)).toBe(true)
    expect(effectiveIsAdult(null, false)).toBe(false)
    expect(effectiveIsAdult(null, undefined)).toBe(false)
  })

  it('an explicit setting wins over the account', () => {
    expect(effectiveIsAdult(true, false)).toBe(true)
    expect(effectiveIsAdult(false, true)).toBe(false)
    expect(effectiveIsAdult(true, undefined)).toBe(true)
    expect(effectiveIsAdult(false, undefined)).toBe(false)
  })
})
