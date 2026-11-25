import { describe, it, expect } from 'vitest'
import { sevenDayAverage } from './history.js'

const day = (cal, pro) => ({ entries: [{ servings: 1, snapshot: { calories: cal, protein: pro } }] })

describe('sevenDayAverage', () => {
  it('averages logged days in the previous 7, ignoring today and blanks', () => {
    const days = {
      '2026-11-24': day(5000, 10), // today — ignored
      '2026-11-23': day(2000, 150),
      '2026-11-21': day(1800, 130),
      '2026-11-10': day(9999, 999), // too old
    }
    expect(sevenDayAverage(days, '2026-11-24')).toEqual({ days: 2, calories: 1900, protein: 140 })
  })
  it('returns null with no history', () => {
    expect(sevenDayAverage({}, '2026-11-24')).toBeNull()
  })
})
