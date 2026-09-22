import { NextResponse, type NextRequest } from 'next/server';
import {
  customerCodeFrom,
  streamConfig,
  verifyWebhook,
  type StreamVideo,
} from "@/lib/cloudflare";
import { createServiceClient, hasServiceKey } from '@/lib/supabase/service';

/* Cloudflare calls this when it has finished encoding a video.

   This is the only endpoint in the app that writes with the secret key, because
   it is the only one that arrives without a user session. That makes the
   signature check the whole security boundary — it runs before anything is read
   out of the body, and a failure returns 401 without touching the database.

   Always 200 on a verified request, even when the video errored: a non-2xx
   makes Cloudflare retry, and retrying will not fix a file that failed to
   encode. The failure is recorded on the row instead. */

export const runtime = 'nodejs'; // node:crypto, and no streaming needed

export async function POST(request: NextRequest) {
  const cfg = streamConfig();
  if (!cfg) return NextResponse.json({ error: 'Stream not configured' }, { status: 503 });
  if (!hasServiceKey()) {
    return NextResponse.json({ error: 'No service key' }, { status: 503 });
  }

  /* Raw text, not request.json(): the signature covers the exact bytes sent,
     and re-serialising parsed JSON will not reproduce them. */
  const raw = await request.text();
  const check = verifyWebhook(cfg.webhookSecret, request.headers.get('webhook-signature'), raw);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 401 });
  }

  let body: StreamVideo;
  try {
    body = JSON.parse(raw) as StreamVideo;
  } catch {
    return NextResponse.json({ error: 'Body is not JSON' }, { status: 400 });
  }

  const uid = body.uid;
  if (!uid) return NextResponse.json({ error: 'No uid' }, { status: 400 });

  const supabase = createServiceClient();

  /* The row is found by provider_uid, which the upload wrote before the file
     was sent. The videoId we put in Cloudflare's metadata is the fallback for
     the case where the upload failed to record it. */
  const videoId = body.meta?.videoId ?? null;
  const state = body.status?.state;

  if (state === 'ready' || body.readyToStream) {
    const customerCode = customerCodeFrom(body.playback?.hls);
    const patch: Record<string, unknown> = {
      status: 'ready',
      duration_ms: body.duration ? Math.round(body.duration * 1000) : null,
      poster_url: body.thumbnail ?? null,
      /* Not an id but the customer-xxxx subdomain every playback URL sits
         under — see the column comment. Signed URLs are built from it. */
      hls_playback_id: customerCode,
    };
    /* videos_ready_is_playable refuses status='ready' without a duration, so a
       webhook that somehow arrives without one leaves the row in processing
       rather than failing the write outright. */
    if (!patch.duration_ms) {
      patch.status = 'processing';
    }

    const query = supabase.from('videos').update(patch);
    const { error } = videoId
      ? await query.or(`provider_uid.eq.${uid},id.eq.${videoId}`)
      : await query.eq('provider_uid', uid);
    if (error) {
      console.error('[stream webhook] ready update failed', error.message);
      return NextResponse.json({ error: 'Write failed' }, { status: 500 });
    }
  } else if (state === 'error') {
    const { error } = await supabase
      .from('videos')
      .update({ status: 'failed' })
      .eq('provider_uid', uid);
    if (error) console.error('[stream webhook] error update failed', error.message);
  } else {
    await supabase.from('videos').update({ status: 'processing' }).eq('provider_uid', uid);
  }

  return NextResponse.json({ received: true });
}
