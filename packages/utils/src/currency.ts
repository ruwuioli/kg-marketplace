export function formatKgs(amount: number): string {
  const hasFraction = amount % 1 !== 0
  const fixed = hasFraction ? amount.toFixed(2) : amount.toFixed(0)
  const [intPart, fracPart] = fixed.split('.')
  const isNegative = intPart!.startsWith('-')
  const digits = isNegative ? intPart!.slice(1) : intPart!
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const signedInt = isNegative ? `-${withSeparators}` : withSeparators
  const numberStr = fracPart ? `${signedInt}.${fracPart}` : signedInt
  return `${numberStr} с`
}
