import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LocalizedRow, VideoRow } from '@/lib/db';
import { isStreamConfigured } from '@/lib/cloudflare';
import { signedPosters } from '@/lib/playback';
import ExerciseEditor from './ExerciseEditor';

export interface EditorVideo extends VideoRow {
  /** The routines that borrow this exercise, for the "used in" list and as a
      warning before deleting it. */
  routine_items:
    | {
        id: string;
        routine: { id: string; title_t: LocalizedRow; status: string; menu: { title_t: LocalizedRow; status: string } | null } | null;
      }[]
    | null;
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .select(
      `id, title_t, description_t, tags, difficulty, publish, angle, duration_ms,
       provider, provider_uid, hls_playback_id, mp4_url, poster_url, status, width, height,
       bpm, first_beat_ms, beats_per_phrase,
       default_loop_start_ms, default_loop_end_ms, mirror_default,
       routine_items ( id, routine:routines ( id, title_t, status, menu:menus ( title_t, status ) ) )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that exercise</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!data) notFound();

  const posters = await signedPosters([id]);

  return (
    <ExerciseEditor
      video={data as unknown as EditorVideo}
      streamConfigured={isStreamConfigured()}
      posterUrl={posters[id] ?? null}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return { title: 'Back office' };

  const supabase = await createClient();
  const { data } = await supabase.from('videos').select('title_t').eq('id', id).maybeSingle();
  const title = (data?.title_t as LocalizedRow | undefined)?.en;
  return { title: title ? `${title} · Back office` : 'Back office' };
}
