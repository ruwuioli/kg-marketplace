import { describe, it, expect } from 'vitest'

import { parseKgPhone, formatKgPhone } from './phone'

describe('parseKgPhone', () => {
  it('parses numbers with country code and various separators', () => {
    expect(parseKgPhone('+996 555 123 456')).toBe('+996555123456')
    expect(parseKgPhone('996-555-123-456')).toBe('+996555123456')
    expect(parseKgPhone('+996(555)123456')).toBe('+996555123456')
  })

  it('parses 9-digit local format by prepending +996', () => {
    expect(parseKgPhone('555123456')).toBe('+996555123456')
    expect(parseKgPhone('0555123456')).toBe('+996555123456')
  })

  it('returns null for invalid input', () => {
    expect(parseKgPhone('12345')).toBeNull()
    expect(parseKgPhone('+1 555 123 4567')).toBeNull()
    expect(parseKgPhone('')).toBeNull()
    expect(parseKgPhone('abc')).toBeNull()
  })
})

describe('formatKgPhone', () => {
  it('formats E.164 into human-readable KG form', () => {
    expect(formatKgPhone('+996555123456')).toBe('+996 555 123 456')
  })

  it('returns input unchanged if not a valid KG number', () => {
    expect(formatKgPhone('invalid')).toBe('invalid')
  })
})
