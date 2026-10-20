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
  /** Set when this clip is itself a front view: the exercise it belongs to. */
  view_of: string | null;
  /** This exercise's front view, if it has one (at most one). */
  front: { id: string; title_t: LocalizedRow; status: VideoRow['status']; duration_ms: number | null; provider_uid: string | null }[] | null;
}

/** A clip that could become this exercise's front view. */
export interface FrontCandidate {
  id: string;
  title: string;
  status: VideoRow['status'];
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
       default_loop_start_ms, default_loop_end_ms, mirror_default, view_of,
       front:videos!view_of ( id, title_t, status, duration_ms, provider_uid ),
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

  const video = data as unknown as EditorVideo;
  const front = video.front?.[0] ?? null;

  /* What it is the front view of, or which clips could be its front view:
     not itself, not in a routine as an exercise, not already linked. */
  const [{ data: parent }, { data: others }, posters] = await Promise.all([
    video.view_of
      ? supabase.from('videos').select('id, title_t').eq('id', video.view_of).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('videos').select('id, title_t, status, view_of, front:videos!view_of ( id ), routine_items ( id )').neq('id', id),
    signedPosters(front ? [id, front.id] : [id]),
  ]);
  const candidates: FrontCandidate[] = ((others ?? []) as unknown as {
    id: string; title_t: LocalizedRow; status: VideoRow['status']; view_of: string | null; front: { id: string }[] | null; routine_items: { id: string }[] | null;
  }[])
    .filter(v => !v.view_of && !(v.front ?? []).length && !(v.routine_items ?? []).length)
    .map(v => ({ id: v.id, title: v.title_t.en || 'Untitled', status: v.status }));

  return (
    <ExerciseEditor
      video={video}
      streamConfigured={isStreamConfigured()}
      posterUrl={posters[id] ?? null}
      frontPoster={front ? posters[front.id] ?? null : null}
      parent={parent ? { id: (parent as { id: string }).id, title: (parent as { title_t: LocalizedRow }).title_t.en } : null}
      candidates={candidates}
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
