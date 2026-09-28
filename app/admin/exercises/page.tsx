import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import { isStreamConfigured } from '@/lib/cloudflare';
import { signedPosters } from '@/lib/playback';
import type { LevelKey, LocalizedRow, PublishStatus, VideoStatus } from '@/lib/db';
import MediaLibrary from './MediaLibrary';

/* The media library: every clip, with its footage state and where it is used.
   This is where filming lands: drop files, rename, tag, open. */

export interface ListVideo {
  id: string;
  title_t: LocalizedRow;
  tags: string[];
  difficulty: LevelKey;
  publish: PublishStatus;
  status: VideoStatus;
  duration_ms: number | null;
  bpm: number | null;
  created_at: string;
  /** How many routines borrow it. */
  uses: number;
}

export const metadata = { title: 'Media library · Back office' };

export default async function ExercisesPage() {
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('videos')
    .select('id, title_t, tags, difficulty, publish, status, duration_ms, bpm, created_at, routine_items ( id )')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read the library</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  const videos: ListVideo[] = ((data ?? []) as unknown as (Omit<ListVideo, 'uses'> & { routine_items: { id: string }[] | null })[]).map(
    v => ({ ...v, uses: (v.routine_items ?? []).length }),
  );
  const posters = await signedPosters(videos.map(v => v.id));

  return <MediaLibrary videos={videos} posters={posters} streamConfigured={isStreamConfigured()} />;
}
