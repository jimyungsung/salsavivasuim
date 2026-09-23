import 'server-only';
import { createClient } from './supabase/server';
import { signPlayback, streamConfig } from './cloudflare';

/* Signed playback — every URL a browser gets for footage is minted here.

   Entitlement is not re-checked on purpose: the rows are read through the
   ordinary client as the signed-in user, so the "videos need entitlement"
   policy — private.can_access() — has already decided whether each row exists.
   A video this viewer may not watch simply is not there to sign. The browser
   never sees provider_uid or the customer subdomain on their own.

   Never videos.poster_url: the webhook stores Cloudflare's unsigned thumbnail
   there, which a requireSignedURLs video answers with 401. */

export type PlaybackResult =
  | { ok: true; hls: string; mp4: string; poster: string; expiresAt: number }
  | { ok: false; error: string };

interface DeliveryRow {
  id: string;
  provider_uid: string | null;
  hls_playback_id: string | null;
  status: string;
}

const signable = (r: DeliveryRow): r is DeliveryRow & { provider_uid: string; hls_playback_id: string } =>
  r.status === 'ready' && Boolean(r.provider_uid) && Boolean(r.hls_playback_id);

export async function playbackFor(videoId: string): Promise<PlaybackResult> {
  const cfg = streamConfig();
  if (!cfg) return { ok: false, error: 'Video delivery is not configured yet.' };

  const supabase = await createClient();
  const { data } = await supabase
    .from('videos')
    .select('id, provider_uid, hls_playback_id, status')
    .eq('id', videoId)
    .maybeSingle();

  const row = data as DeliveryRow | null;
  if (!row || !signable(row)) return { ok: false, error: 'This video is not ready to play yet.' };

  try {
    const signed = signPlayback(cfg, { uid: row.provider_uid, customerCode: row.hls_playback_id });
    return { ok: true, hls: signed.hls, mp4: signed.mp4, poster: signed.poster, expiresAt: signed.expiresAt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Signed thumbnails for several videos at once — one query, then a local RSA
    signature each. Videos that are not ready, or not visible, are left out. */
export async function signedPosters(videoIds: string[]): Promise<Record<string, string>> {
  const cfg = streamConfig();
  if (!cfg || videoIds.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from('videos')
    .select('id, provider_uid, hls_playback_id, status')
    .in('id', videoIds);

  const posters: Record<string, string> = {};
  for (const row of (data ?? []) as DeliveryRow[]) {
    if (!signable(row)) continue;
    try {
      posters[row.id] = signPlayback(cfg, { uid: row.provider_uid, customerCode: row.hls_playback_id }).poster;
    } catch {
      /* No signing key: no thumbnail, rather than no page. */
    }
  }
  return posters;
}
