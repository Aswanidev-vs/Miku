import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatTime, statusLabel } from './activityFormat'

const NOW = 1_700_000_000_000 // fixed epoch in ms
const nowSec = NOW / 1000

describe('formatTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for anything under a minute old', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatTime(nowSec - 5)).toBe('just now')
    expect(formatTime(nowSec - 59)).toBe('just now')
  })

  it('returns minutes between 1m and 1h', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatTime(nowSec - 60)).toBe('1m ago')
    expect(formatTime(nowSec - 5 * 60)).toBe('5m ago')
    expect(formatTime(nowSec - 3599)).toBe('59m ago')
  })

  it('returns hours between 1h and 1d', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatTime(nowSec - 3600)).toBe('1h ago')
    expect(formatTime(nowSec - 3 * 3600)).toBe('3h ago')
    expect(formatTime(nowSec - 86399)).toBe('23h ago')
  })

  it('returns days beyond a day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatTime(nowSec - 86400)).toBe('1d ago')
    expect(formatTime(nowSec - 2 * 86400)).toBe('2d ago')
    expect(formatTime(nowSec - 30 * 86400)).toBe('30d ago')
  })
})

describe('statusLabel', () => {
  it('lowercases the status', () => {
    expect(statusLabel('CURRENT')).toBe('current')
    expect(statusLabel('DROPPED')).toBe('dropped')
  })

  it('turns underscores into spaces', () => {
    expect(statusLabel('PLANS_TO_WATCH')).toBe('plans to watch')
  })

  it('returns an empty string for null, undefined or empty input', () => {
    expect(statusLabel(undefined)).toBe('')
    expect(statusLabel('')).toBe('')
  })
})
