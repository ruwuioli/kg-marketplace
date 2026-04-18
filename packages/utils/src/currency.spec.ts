import { describe, it, expect } from 'vitest'

import { formatKgs } from './currency'

describe('formatKgs', () => {
  it('formats whole-som amounts with thousand separators', () => {
    expect(formatKgs(1500)).toBe('1 500 с')
    expect(formatKgs(1_234_567)).toBe('1 234 567 с')
  })

  it('formats zero', () => {
    expect(formatKgs(0)).toBe('0 с')
  })

  it('rounds to two decimals when amount has fractional part', () => {
    expect(formatKgs(1500.5)).toBe('1 500.50 с')
    expect(formatKgs(1500.125)).toBe('1 500.13 с')
  })

  it('hides decimals when amount is a whole number', () => {
    expect(formatKgs(100)).toBe('100 с')
  })

  it('handles negative amounts', () => {
    expect(formatKgs(-1500)).toBe('-1 500 с')
  })
})
