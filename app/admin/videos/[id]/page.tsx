import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LocalizedRow, VideoRow } from '@/lib/db';
import { isStreamConfigured } from '@/lib/cloudflare';
import { signedPosters } from '@/lib/playback';
import type { StripVideo } from '../../StepStrip';
import VideoEditor from './VideoEditor';

export interface EditorVideo extends VideoRow {
  session: {
    id: string;
    position: number;
    title_t: LocalizedRow;
    program: {
      id: string;
      title_t: LocalizedRow;
      area: { id: string; name_t: LocalizedRow } | null;
    } | null;
  } | null;
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .select(
      `id, session_id, step, position, title_t, description_t, angle, duration_ms,
       provider, provider_uid, hls_playback_id, mp4_url, poster_url, status,
       bpm, first_beat_ms, beats_per_phrase,
       default_loop_start_ms, default_loop_end_ms, mirror_default, is_drillable,
       session:sessions ( id, position, title_t,
         program:programs ( id, title_t, area:areas ( id, name_t ) ) )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that video</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!data) notFound();

  const [posters, { data: siblings }] = await Promise.all([
    signedPosters([id]),
    /* The rest of its session, for the running order and previous / next. */
    supabase
      .from('videos')
      .select('id, step, status, duration_ms')
      .eq('session_id', (data as { session_id: string }).session_id)
      .order('position'),
  ]);
  const posterUrl = posters[id] ?? null;

  return (
    <VideoEditor
      video={data as unknown as EditorVideo}
      streamConfigured={isStreamConfigured()}
      posterUrl={posterUrl}
      siblings={(siblings ?? []) as StripVideo[]}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return { title: 'Back office' };

  const supabase = await createClient();
  const { data } = await supabase.from('videos').select('title_t, step').eq('id', id).maybeSingle();
  const title = (data?.title_t as LocalizedRow | undefined)?.en || (data?.step as string | undefined);
  return { title: title ? `${title} · Back office` : 'Back office' };
}
