import DOMPurify from 'dompurify'

/**
 * Strips all HTML tags from user input, returning plain text only.
 * Safe to call from both client components (uses DOMPurify) and SSR (uses regex fallback).
 */
export function sanitize(dirty: string): string {
  if (!dirty) return ''
  if (typeof window === 'undefined') {
    // SSR fallback — strip tags with regex (no DOM available)
    return dirty.replace(/<[^>]*>/g, '').trim()
  }
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}

/** Sanitize and truncate to maxLen characters */
export function sanitizeField(dirty: string, maxLen = 500): string {
  return sanitize(dirty).slice(0, maxLen)
}
