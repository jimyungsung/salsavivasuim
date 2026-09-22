import 'server-only';
import { createSign } from 'node:crypto';

export { customerCodeFrom, verifyWebhook } from './stream-signature';

/* Cloudflare Stream.

   Everything that talks to Cloudflare lives here, so the rest of the app deals
   in "give me a place to upload" and "give me a URL I can play" rather than in
   account ids and JWTs.

   Three things this file is responsible for getting right:

   1. Files never pass through Vercel. The server asks Cloudflare for a one-time
      upload URL and the browser POSTs the file straight there — a request body
      through a Vercel function is capped at 4.5 MB, which no drill video will
      respect.

   2. Every video is uploaded with requireSignedURLs, so there is no such thing
      as a public playback URL. Playback needs a short-lived RS256 token that
      only the server can mint, and the server only mints one after
      private.can_access() has said yes.

   3. The webhook is signed, and the signature is checked in constant time. That
      endpoint writes to the database with the secret key, bypassing RLS, so an
      unverified caller must never reach the write. */

const API = 'https://api.cloudflare.com/client/v4';

export interface StreamConfig {
  accountId: string;
  apiToken: string;
  signingKeyId: string;
  /** Base64 of a PKCS#8 PEM, exactly as /stream/keys returns it. */
  signingKeyPem: string;
  webhookSecret: string;
}

/** Null rather than throwing, so a screen can say "not configured yet". */
export function streamConfig(): StreamConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return {
    accountId,
    apiToken,
    signingKeyId: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID ?? '',
    signingKeyPem: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM ?? '',
    webhookSecret: process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET ?? '',
  };
}

export const isStreamConfigured = (): boolean => streamConfig() !== null;

/* ------------------------------------------------------------------ api ---- */

interface CfEnvelope<T> {
  success: boolean;
  result: T;
  errors: { code: number; message: string }[];
}

async function cf<T>(
  cfg: StreamConfig,
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const response = await fetch(`${API}/accounts/${cfg.accountId}/stream${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  const json = (await response.json()) as CfEnvelope<T>;
  if (!response.ok || !json.success) {
    const detail = json.errors?.map(e => `${e.code} ${e.message}`).join('; ');
    throw new Error(detail || `Cloudflare Stream: HTTP ${response.status}`);
  }
  return json.result;
}

/* --------------------------------------------------------------- upload ---- */

export interface DirectUpload {
  /** One-time URL the browser POSTs the file to. Expires quickly. */
  uploadURL: string;
  /** Cloudflare's id for the video. Becomes videos.provider_uid. */
  uid: string;
}

/** Asks for somewhere to put one file.

    `maxDurationSeconds` is a guard rail, not a promise: Cloudflare rejects the
    upload if the video turns out longer. An hour is far beyond any session
    video and stops a wrong file quietly costing storage. */
export async function createDirectUpload(
  cfg: StreamConfig,
  opts: { videoId: string; origin: string; maxDurationSeconds?: number },
): Promise<DirectUpload> {
  return cf<DirectUpload>(cfg, '/direct_upload', {
    method: 'POST',
    body: {
      maxDurationSeconds: opts.maxDurationSeconds ?? 3600,
      /* No public URL, ever. */
      requireSignedURLs: true,
      /* The browser posts from our origin; anything else is not our upload. */
      allowedOrigins: [new URL(opts.origin).host],
      /* Our own id travels with the file, so the webhook can find the row it
         belongs to without keeping a second lookup table. */
      meta: { videoId: opts.videoId, name: opts.videoId },
    },
  });
}

/** Cloudflare's view of one video, as the webhook and polling both return it. */
export interface StreamVideo {
  uid: string;
  status?: { state?: string; errorReasonText?: string };
  duration?: number;
  thumbnail?: string;
  readyToStream?: boolean;
  playback?: { hls?: string; dash?: string };
  meta?: Record<string, string>;
}

export const getVideo = (cfg: StreamConfig, uid: string) =>
  cf<StreamVideo>(cfg, `/${uid}`);

/** MP4 renditions are opt-in per video, and the player needs them: a short,
    fully-downloaded progressive file is what makes a tight A-B loop seek
    without rebuffering, which an HLS segment boundary cannot promise. */
export const enableDownloads = (cfg: StreamConfig, uid: string) =>
  cf<unknown>(cfg, `/${uid}/downloads`, { method: 'POST', body: {} });

export const deleteVideo = (cfg: StreamConfig, uid: string) =>
  cf<unknown>(cfg, `/${uid}`, { method: 'DELETE' });

/** Points Cloudflare at our callback and returns the signing secret. Run once
    per environment; the secret then lives in CLOUDFLARE_STREAM_WEBHOOK_SECRET. */
export const registerWebhook = (cfg: StreamConfig, notificationUrl: string) =>
  cf<{ notificationUrl: string; secret: string }>(cfg, '/webhook', {
    method: 'PUT',
    body: { notificationUrl },
  });

/* -------------------------------------------------------- signed playback --- */

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export interface SignedPlayback {
  token: string;
  hls: string;
  mp4: string;
  poster: string;
  expiresAt: number;
}

/** Mints a short-lived RS256 token for one video.

    Two hours, because a member may leave a session open while they practise,
    and the player refreshes before expiry rather than dying mid-drill.
    `downloadable` is what unlocks the MP4 rendition the loop needs. */
export function signPlayback(
  cfg: StreamConfig,
  opts: { uid: string; customerCode: string; ttlSeconds?: number },
): SignedPlayback {
  if (!cfg.signingKeyId || !cfg.signingKeyPem) {
    throw new Error(
      'No Stream signing key. Create one with POST /stream/keys and set ' +
        'CLOUDFLARE_STREAM_SIGNING_KEY_ID and CLOUDFLARE_STREAM_SIGNING_KEY_PEM.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (opts.ttlSeconds ?? 2 * 60 * 60);

  const header = b64url(JSON.stringify({ alg: 'RS256', kid: cfg.signingKeyId }));
  const payload = b64url(
    JSON.stringify({
      sub: opts.uid,
      kid: cfg.signingKeyId,
      exp,
      nbf: now - 60, // a little slack for clock skew
      downloadable: true,
    }),
  );

  /* Cloudflare hands the private key back base64-encoded; decoding gives the
     PEM text that node's signer expects. */
  const pem = Buffer.from(cfg.signingKeyPem, 'base64').toString('utf8');
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).end().sign(pem);

  const token = `${header}.${payload}.${b64url(signature)}`;
  const base = `https://${opts.customerCode}.cloudflarestream.com/${token}`;

  return {
    token,
    hls: `${base}/manifest/video.m3u8`,
    mp4: `${base}/downloads/default.mp4`,
    poster: `${base}/thumbnails/thumbnail.jpg`,
    expiresAt: exp * 1000,
  };
}
