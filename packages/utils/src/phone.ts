const KG_E164_REGEX = /^\+996\d{9}$/

export function parseKgPhone(input: string): string | null {
  if (!input) return null
  const digitsOnly = input.replace(/[\s()\-+]/g, '')
  if (!/^\d+$/.test(digitsOnly)) return null

  let normalized: string
  if (digitsOnly.startsWith('996') && digitsOnly.length === 12) {
    normalized = `+${digitsOnly}`
  } else if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    normalized = `+996${digitsOnly.slice(1)}`
  } else if (digitsOnly.length === 9) {
    normalized = `+996${digitsOnly}`
  } else {
    return null
  }

  return KG_E164_REGEX.test(normalized) ? normalized : null
}

export function formatKgPhone(e164: string): string {
  if (!KG_E164_REGEX.test(e164)) return e164
  const digits = e164.slice(4)
  return `+996 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}
