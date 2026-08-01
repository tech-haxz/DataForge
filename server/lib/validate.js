import { ApiError } from './errors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Tiny schema validator. Each rule: { type, required, min, max, values, default }
 * Returns a clean object containing only the declared keys.
 */
export function validate(body = {}, schema) {
  const out = {}
  const details = {}

  for (const [key, rule] of Object.entries(schema)) {
    let value = body[key]
    const missing = value === undefined || value === null || value === ''

    if (missing) {
      if (rule.required) { details[key] = 'This field is required'; continue }
      if (rule.default !== undefined) out[key] = rule.default
      continue
    }

    switch (rule.type) {
      case 'string': {
        value = String(value).trim()
        if (rule.min && value.length < rule.min) { details[key] = `Must be at least ${rule.min} characters`; continue }
        if (rule.max && value.length > rule.max) { details[key] = `Must be at most ${rule.max} characters`; continue }
        break
      }
      case 'email': {
        value = String(value).trim().toLowerCase()
        if (!EMAIL_RE.test(value)) { details[key] = 'Enter a valid email address'; continue }
        break
      }
      case 'int': {
        value = Number(value)
        if (!Number.isFinite(value)) { details[key] = 'Must be a number'; continue }
        value = Math.trunc(value)
        if (rule.min !== undefined && value < rule.min) { details[key] = `Must be at least ${rule.min}`; continue }
        if (rule.max !== undefined && value > rule.max) { details[key] = `Must be at most ${rule.max}`; continue }
        break
      }
      case 'enum': {
        value = String(value)
        if (!rule.values.includes(value)) { details[key] = `Must be one of: ${rule.values.join(', ')}`; continue }
        break
      }
      case 'array': {
        if (typeof value === 'string') value = value.split(',').map(v => v.trim()).filter(Boolean)
        if (!Array.isArray(value)) { details[key] = 'Must be a list'; continue }
        value = value.map(v => String(v).trim()).filter(Boolean).slice(0, rule.max || 20)
        break
      }
      case 'boolean': {
        value = value === true || value === 'true' || value === 1 || value === '1'
        break
      }
      default:
        throw new Error(`Unknown rule type: ${rule.type}`)
    }
    out[key] = value
  }

  if (Object.keys(details).length) throw ApiError.badRequest('Please check the highlighted fields', details)
  return out
}

export function requireFields(obj, keys) {
  const missing = keys.filter(k => obj[k] === undefined)
  if (missing.length) throw ApiError.badRequest(`Missing: ${missing.join(', ')}`)
}

export const slugify = text => String(text)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'course'
