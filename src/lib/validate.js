// Number-field validation shared by every form.

/**
 * Parse a text input into a number.
 * @returns {{ value: number | null, error: string | null }}
 */
export function parseNumber(raw, { required = false, label = 'Value', max = 100000 } = {}) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (text === '') {
    return required ? { value: null, error: `${label} is required` } : { value: null, error: null }
  }
  if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) {
    return { value: null, error: text.startsWith('-') ? `${label} can't be negative` : `${label} must be a number` }
  }
  const value = Number(text)
  if (!Number.isFinite(value)) return { value: null, error: `${label} must be a number` }
  if (value < 0) return { value: null, error: `${label} can't be negative` }
  if (value > max) return { value: null, error: `${label} looks too large` }
  return { value, error: null }
}

/** Validate a whole form; returns { values, errors, ok }. */
export function validateFields(fields) {
  const values = {}
  const errors = {}
  for (const [name, [raw, opts]] of Object.entries(fields)) {
    const { value, error } = parseNumber(raw, opts)
    values[name] = value
    if (error) errors[name] = error
  }
  return { values, errors, ok: Object.keys(errors).length === 0 }
}
