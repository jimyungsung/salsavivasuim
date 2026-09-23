/* Where to send someone after they sign in.

   `next` arrives in a query string, so it is attacker-controlled: an open
   redirect here would let a phishing link borrow the sign-in flow. Only a path
   on this site passes — not "//evil.com", and not "/\evil.com", which browsers
   read as the same thing in a Location header. */

export const DEFAULT_NEXT = '/masterplan';

export const safeNext = (value: string | null | undefined): string =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : DEFAULT_NEXT;

/** A link to the sign-in (or register) screen that comes back here afterwards. */
export const signInHref = (next: string, screen: 'signin' | 'register' = 'signin'): string =>
  next === DEFAULT_NEXT ? `/${screen}` : `/${screen}?next=${encodeURIComponent(next)}`;
