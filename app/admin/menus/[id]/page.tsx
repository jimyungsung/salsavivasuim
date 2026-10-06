import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminGate } from '@/lib/supabase/admin';
import type { LevelKey, LocalizedRow, PublishStatus } from '@/lib/db';
import type { TreeRoutine } from '../../page';
import MenuEditor from './MenuEditor';
import { PICK, type PickVideo } from '../../routines/[id]/page';
import { signedPosters } from '@/lib/playback';
import { weekReadiness, type Readiness, type ReadinessRoutine } from '../../readiness';

export interface EditorMenu {
  id: string;
  slug: string;
  position: number;
  stage_id: string | null;
  title_t: LocalizedRow;
  subtitle_t: LocalizedRow;
  promise_t: LocalizedRow;
  level: LevelKey;
  status: PublishStatus;
  published_at: string | null;
  stage: { id: string; name_t: LocalizedRow } | null;
  routines: TreeRoutine[];
}

export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await adminGate();
  if (!gate.ok) return null;

  const supabase = await createClient();
  const [{ data, error }, { data: stages }, { count: members }, { data: library }] = await Promise.all([
    supabase
      .from('menus')
      .select(
        `id, slug, position, stage_id, title_t, subtitle_t, promise_t, level, status, published_at,
         stage:stages ( id, name_t ),
         routines ( id, position, weekday, title_t, status,
           routine_items ( id, position, repeats, video:videos ( id, title_t, status, publish, duration_ms ) ) )`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('stages').select('id, name_t').order('position'),
    /* Members whose week was copied from this menu: they keep their copy, so
       an edit here reaches them only if they reset. Admins read all profiles. */
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('menu_id', id),
    supabase.from('videos').select(PICK).order('created_at'),
  ]);

  if (error) {
    return (
      <div className="gate">
        <h1>Could not read that menu</h1>
        <p>{error.message}</p>
      </div>
    );
  }
  if (!data) notFound();

  const menu = data as unknown as EditorMenu;
  menu.routines = [...(menu.routines ?? [])]
    .sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99) || a.position - b.position)
    .map(r => ({ ...r, routine_items: [...(r.routine_items ?? [])].sort((a, b) => a.position - b.position) }));

  const readiness: Readiness = weekReadiness(
    menu as unknown as { title_t: LocalizedRow & { en: string }; promise_t: LocalizedRow & { en: string }; routines: ReadinessRoutine[] },
  );

  const videos = (library ?? []) as unknown as PickVideo[];
  /* Thumbnails: signed, because the stored poster_url is not. */
  const posters = await signedPosters(videos.map(v => v.id));

  return (
    <MenuEditor
      library={videos}
      posters={posters}
      readiness={readiness}
      members={members ?? 0}
      menu={menu}
      stages={((stages ?? []) as { id: string; name_t: LocalizedRow }[]).map(s => ({ id: s.id, name: s.name_t.en }))}
    />
  );
}
