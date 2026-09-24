import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LevelKey, LocalizedRow, MethodStep, PublishStatus, VideoStatus } from '@/lib/db';
import Tree from './Tree';

/* The catalogue tree: areas, the programs inside them, and the sessions inside
   those. The whole shelf on one screen, because the job here is navigation and
   publishing — the actual work happens in the session editor. */

export interface TreeVideo {
  id: string;
  position: number;
  step: MethodStep;
  status: VideoStatus;
  duration_ms: number | null;
}

export interface TreeSession {
  id: string;
  position: number;
  title_t: LocalizedRow;
  status: PublishStatus;
  videos: TreeVideo[];
}

export interface TreeProgram {
  id: string;
  slug: string;
  position: number;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  level: LevelKey;
  status: PublishStatus;
  sessions: TreeSession[];
}

export interface TreeArea {
  id: string;
  slug: string;
  position: number;
  name_t: LocalizedRow;
  programs: TreeProgram[];
}

const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

export default async function AdminHome() {
  const gate = await adminGate();
  /* The layout renders an explanation when the gate is closed; this page simply
     has nothing to fetch in that case. */
  if (!gate.ok) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('areas')
    .select(
      `id, slug, position, name_t,
       programs ( id, slug, position, title_t, subtitle_t, level, status,
         sessions ( id, position, title_t, status,
           videos ( id, position, step, status, duration_ms ) ) )`,
    )
    .order('position');

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read the catalogue</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  /* Postgres returns nested rows unordered; sort once here rather than in three
     places in the view. */
  const areas: TreeArea[] = (data ?? []).map(a => ({
    ...(a as unknown as TreeArea),
    programs: byPosition((a as unknown as TreeArea).programs).map(p => ({
      ...p,
      sessions: byPosition(p.sessions).map(s => ({ ...s, videos: byPosition(s.videos) })),
    })),
  }));

  const programs = areas.flatMap(a => a.programs);
  const sessions = programs.flatMap(p => p.sessions);
  const videos = sessions.flatMap(s => s.videos);

  return (
    <>
      <div className="head">
        <div>
          <h1>Catalogue</h1>
          <p>
            Areas, the programs inside them, and their sessions. Open a session to add
            videos, set its beat grid and publish it.
          </p>
        </div>
        <div className="tally">
          <span>
            <b>{programs.length}</b>programs
          </span>
          <span>
            <b>{sessions.length}</b>sessions
          </span>
          <span>
            <b>{videos.length}</b>videos
          </span>
          <span>
            <b>{videos.filter(v => v.status === 'ready').length}</b>with footage
          </span>
        </div>
      </div>

      <Tree areas={areas} />
    </>
  );
}
