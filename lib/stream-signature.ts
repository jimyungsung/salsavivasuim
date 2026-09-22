import { createHmac, timingSafeEqual } from 'node:crypto';

/* The webhook signature check, kept apart from the rest of the Cloudflare
   client on purpose.

   lib/cloudflare.ts is marked `server-only` because it holds an API token, and
   that guard rightly refuses to be imported anywhere else — including from a
   test. These two functions touch no secret and no environment: they are pure,
   and this is the piece most worth being able to exercise directly, because it
   is the only thing standing in front of a write that bypasses row-level
   security. */

/** Cloudflare sends `Webhook-Signature: time=<unix>,sig1=<hex>` and signs the
    string `<time>.<raw body>` with HMAC-SHA256. The body must be the raw text:
    parsing and re-serialising JSON changes the bytes and the check will fail. */
export function verifyWebhook(
  secret: string,
  header: string | null,
  rawBody: string,
  toleranceSeconds = 300,
): { ok: true } | { ok: false; reason: string } {
  if (!secret) return { ok: false, reason: 'No webhook secret configured.' };
  if (!header) return { ok: false, reason: 'No Webhook-Signature header.' };

  const parts: Record<string, string> = {};
  for (const piece of header.split(',')) {
    const i = piece.indexOf('=');
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  const time = parts.time;
  const sig = parts.sig1;
  if (!time || !sig) return { ok: false, reason: 'Malformed Webhook-Signature.' };

  /* An old signature is a replay. */
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(time));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: 'Signature timestamp outside tolerance.' };
  }

  const expected = createHmac('sha256', secret).update(`${time}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  /* Length first: timingSafeEqual throws on a mismatch rather than returning false. */
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Signature does not match.' };
  }
  return { ok: true };
}

/* The customer code is the `customer-xxxx` subdomain every playback URL sits
   under. Cloudflare does not expose it as a field — it appears only inside the
   playback URLs it returns — so it is read off one of those once and stored on
   the row rather than guessed at every play. */
export function customerCodeFrom(playbackUrl: string | undefined | null): string | null {
  if (!playbackUrl) return null;
  const match = /https:\/\/(customer-[a-z0-9]+)\.cloudflarestream\.com\//i.exec(playbackUrl);
  return match ? match[1] : null;
}
