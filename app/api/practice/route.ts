import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';

/* Where the player reports practice (components/usePracticeLog.ts): a batch of
   events, sent every fifteen seconds of playback and flushed on pause or when
   the page is hidden (by sendBeacon, which is why this is a route and not a
   server action).

   Everything is inserted as the signed-in member through the ordinary
   client, so the "log own practice" policy decides: their own user id only,
   and only exercises can_access() lets them play. This route only shapes and
   bounds the numbers, so a broken or tampered client cannot claim an hour of
   practice in one beat.

   Minutes practised is wall-clock (BUILD-PLAN §5): wall_ms is what counts. */

const KINDS = new Set(['play', 'heartbeat', 'loop', 'complete']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 60;
/* A heartbeat covers about fifteen seconds; a late one after a stall, a little
   more. Anything longer is not one beat of practice. */
const MAX_WALL_MS = 30_000;

interface Incoming {
  videoId?: unknown;
  kind?: unknown;
  wallMs?: unknown;
  speed?: unknown;
  at?: unknown;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export async function POST(request: NextRequest) {
  if (!isConfigured) return new NextResponse(null, { status: 204 });

  let body: { events?: Incoming[] };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: 'Not JSON.' }, { status: 400 });
  }
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (!events.length) return new NextResponse(null, { status: 204 });

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const now = Date.now();
  const rows = events
    .filter(e => typeof e.videoId === 'string' && UUID.test(e.videoId) && typeof e.kind === 'string' && KINDS.has(e.kind))
    .map(e => {
      const speed = clamp(Number(e.speed) || 1, 0.25, 2);
      const wall = e.kind === 'heartbeat' ? Math.round(clamp(Number(e.wallMs) || 0, 0, MAX_WALL_MS)) : 0;
      /* The client's clock says when, within reason: a beacon sent on the way
         out of the page arrives a moment later than the beat it carries. */
      const at = typeof e.at === 'string' && Math.abs(Date.parse(e.at) - now) < 10 * 60_000 ? e.at : new Date(now).toISOString();
      return {
        user_id: auth.user!.id,
        video_id: e.videoId as string,
        kind: e.kind as string,
        at,
        wall_ms: wall,
        /* Media time follows from the speed: footage at 0.5x advances half as
           fast as the clock. Kept so the wall-clock decision stays reversible. */
        media_ms: Math.round(wall * speed),
        speed,
      };
    });
  if (!rows.length) return NextResponse.json({ error: 'No valid events.' }, { status: 400 });

  const { error } = await supabase.from('practice_events').insert(rows);
  if (error) {
    /* One exercise the member may no longer play (unpublished mid-session)
       fails the whole batch under RLS; keep the rest. */
    let kept = 0;
    for (const row of rows) {
      const { error: one } = await supabase.from('practice_events').insert(row);
      if (!one) kept++;
    }
    if (!kept) return NextResponse.json({ error: 'Not recorded.' }, { status: 403 });
  }
  return new NextResponse(null, { status: 204 });
}
