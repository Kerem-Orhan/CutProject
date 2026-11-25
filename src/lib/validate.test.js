import { describe, it, expect } from 'vitest'
import { parseNumber } from './validate.js'

describe('parseNumber', () => {
  it('accepts whole and decimal numbers', () => {
    expect(parseNumber('250').value).toBe(250)
    expect(parseNumber('12.5').value).toBe(12.5)
    expect(parseNumber('12,5').value).toBe(12.5)
  })
  it('rejects blanks only when required', () => {
    expect(parseNumber('', { required: true, label: 'Calories' }).error).toBe('Calories is required')
    expect(parseNumber('').error).toBeNull()
  })
  it('rejects negatives and junk', () => {
    expect(parseNumber('-5', { label: 'Protein' }).error).toBe("Protein can't be negative")
    expect(parseNumber('abc').error).toMatch(/number/)
  })
})
