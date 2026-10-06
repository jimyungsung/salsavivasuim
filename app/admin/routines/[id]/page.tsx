import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import { signedPosters } from '@/lib/playback';
import type { LevelKey, LocalizedRow, PublishStatus, VideoStatus } from '@/lib/db';
import RoutineEditor from './RoutineEditor';

/** What the picker and the list need to know about an exercise. */
export interface PickVideo {
  id: string;
  title_t: LocalizedRow;
  tags: string[];
  difficulty: LevelKey;
  publish: PublishStatus;
  status: VideoStatus;
  duration_ms: number | null;
  bpm: number | null;
}

export interface EditorItem {
  id: string;
  position: number;
  repeats: number;
  speed: number | null;
  video: PickVideo | null;
}

export interface EditorRoutine {
  id: string;
  position: number;
  weekday: number | null;
  title_t: LocalizedRow;
  blurb_t: LocalizedRow;
  levels: LevelKey[];
  status: PublishStatus;
  menu: {
    id: string;
    slug: string;
    title_t: LocalizedRow;
    status: PublishStatus;
    stage: { id: string; name_t: LocalizedRow } | null;
  } | null;
  routine_items: EditorItem[];
}

export const PICK = 'id, title_t, tags, difficulty, publish, status, duration_ms, bpm';

export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();

  const [{ data: routine, error }, { data: library }] = await Promise.all([
    supabase
      .from('routines')
      .select(
        `id, position, weekday, title_t, blurb_t, levels, status,
         menu:menus ( id, slug, title_t, status, stage:stages ( id, name_t ) ),
         routine_items ( id, position, repeats, speed, video:videos ( ${PICK} ) )`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('videos').select(PICK).order('created_at'),
  ]);

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that routine</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!routine) notFound();

  const row = routine as unknown as EditorRoutine;
  row.routine_items = [...(row.routine_items ?? [])].sort((a, b) => a.position - b.position);
  const videos = (library ?? []) as unknown as PickVideo[];

  /* Thumbnails: signed, because the stored poster_url is not. */
  const posters = await signedPosters(videos.map(v => v.id));

  return <RoutineEditor routine={row} library={videos} posters={posters} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return { title: 'Back office' };

  const supabase = await createClient();
  const { data } = await supabase.from('routines').select('title_t').eq('id', id).maybeSingle();
  const title = (data?.title_t as LocalizedRow | undefined)?.en;
  return { title: title ? `${title} · Back office` : 'Back office' };
}
