import { describe, expect, it } from 'vitest'

describe('vitest setup', () => {
  it('has jest-dom matchers', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    expect(div).toHaveTextContent('hello')
  })
})
