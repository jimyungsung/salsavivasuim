'use server';

/* Signed playback — the server half of the player.

   The client never sees provider_uid or the customer-code subdomain; it asks
   here for a video by id and gets back URLs that already carry a signature.
   Entitlement is not re-checked here on purpose: selecting from `videos` runs
   as the signed-in user through the ordinary client, so the "videos need
   entitlement" policy — private.can_access() — has already decided whether the
   row exists at all. A video this viewer may not watch simply isn't there to
   sign. */

import { createClient } from '@/lib/supabase/server';
import { signPlayback, streamConfig } from '@/lib/cloudflare';

export type PlaybackResult =
  | { ok: true; hls: string; mp4: string; poster: string; expiresAt: number }
  | { ok: false; error: string };

export async function getPlayback(videoId: string): Promise<PlaybackResult> {
  const cfg = streamConfig();
  if (!cfg) return { ok: false, error: 'Video delivery is not configured yet.' };

  const supabase = await createClient();
  const { data } = await supabase
    .from('videos')
    .select('provider_uid, hls_playback_id, status')
    .eq('id', videoId)
    .maybeSingle();

  const row = data as {
    provider_uid: string | null;
    hls_playback_id: string | null;
    status: string;
  } | null;

  if (!row || row.status !== 'ready' || !row.provider_uid || !row.hls_playback_id) {
    return { ok: false, error: 'This video is not ready to play yet.' };
  }

  try {
    const signed = signPlayback(cfg, {
      uid: row.provider_uid,
      customerCode: row.hls_playback_id,
    });
    return {
      ok: true,
      hls: signed.hls,
      mp4: signed.mp4,
      /* Never videos.poster_url: the webhook stores Cloudflare's unsigned
         thumbnail URL there, which a requireSignedURLs video answers with 401. */
      poster: signed.poster,
      expiresAt: signed.expiresAt,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
