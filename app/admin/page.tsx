import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LevelKey, LocalizedRow, PublishStatus, VideoStatus } from '@/lib/db';
import Tree from './Tree';

/* The overview: stages, the menus inside them, and the routines inside those.
   The whole shelf on one screen, because the job here is navigation and
   publishing — the actual work happens in the routine editor and the library. */

export interface TreeItem {
  id: string;
  position: number;
  repeats: number;
  video: { id: string; title_t: LocalizedRow; status: VideoStatus; duration_ms: number | null } | null;
}

export interface TreeRoutine {
  id: string;
  position: number;
  weekday: number | null;
  title_t: LocalizedRow;
  status: PublishStatus;
  routine_items: TreeItem[];
}

export interface TreeMenu {
  id: string;
  slug: string;
  position: number;
  stage_id: string | null;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  level: LevelKey;
  status: PublishStatus;
  routines: TreeRoutine[];
}

export interface TreeStage {
  /** '' for the group of menus that belong to no stage. */
  id: string;
  slug: string;
  position: number;
  name_t: LocalizedRow;
  menus: TreeMenu[];
}

const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

export default async function AdminHome() {
  const gate = await adminGate();
  /* The layout renders an explanation when the gate is closed; this page simply
     has nothing to fetch in that case. */
  if (!gate.ok) return null;

  const supabase = await createClient();
  const [{ data: stageRows, error }, { data: menuRows }, { data: videoRows }] = await Promise.all([
    supabase.from('stages').select('id, slug, position, name_t').order('position'),
    supabase
      .from('menus')
      .select(
        `id, slug, position, stage_id, title_t, subtitle_t, level, status,
         routines ( id, position, weekday, title_t, status,
           routine_items ( id, position, repeats, video:videos ( id, title_t, status, duration_ms ) ) )`,
      ),
    supabase.from('videos').select('id, status, publish'),
  ]);

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read the catalogue</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  /* Postgres returns nested rows unordered; sort once here rather than in
     three places in the view. */
  const toMenu = (m: TreeMenu): TreeMenu => ({
    ...m,
    routines: byPosition(m.routines)
      .sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99) || a.position - b.position)
      .map(r => ({ ...r, routine_items: byPosition(r.routine_items) })),
  });
  const menus = ((menuRows ?? []) as unknown as TreeMenu[]).map(toMenu);
  const stages: TreeStage[] = byPosition((stageRows ?? []) as unknown as TreeStage[]).map(s => ({
    ...s,
    menus: byPosition(menus.filter(m => m.stage_id === s.id)),
  }));
  const loose = byPosition(menus.filter(m => !m.stage_id));
  if (loose.length) {
    stages.push({ id: '', slug: '', position: 999, name_t: { en: 'Other menus' }, menus: loose });
  }

  const routines = menus.flatMap(m => m.routines);
  const videos = (videoRows ?? []) as { id: string; status: VideoStatus; publish: PublishStatus }[];

  return (
    <>
      <div className="head">
        <div>
          <h1>Overview</h1>
          <p>
            Stages, the weekly menus inside them, and their routines. Open a routine to
            pick its exercises from the library and publish it.
          </p>
        </div>
        <div className="tally">
          <span>
            <b>{menus.length}</b>menus
          </span>
          <span>
            <b>{routines.length}</b>routines
          </span>
          <Link href="/admin/exercises">
            <b>{videos.length}</b>clips
          </Link>
          <span>
            <b>{videos.filter(v => v.status === 'ready' && v.publish === 'open').length}</b>open with footage
          </span>
        </div>
      </div>

      <Tree stages={stages} />
    </>
  );
}
