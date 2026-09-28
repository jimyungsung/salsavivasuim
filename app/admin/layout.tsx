import type { Metadata } from 'next';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { adminGate } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { LocalizedRow, PublishStatus } from '@/lib/db';
import SignInLink from './SignInLink';
import Sidebar, { type NavStage } from './Sidebar';
import './admin.css';

/* The back office is one language — English — deliberately, against the rule
   that page copy carries both. Every screen below this one edits English and
   Korean side by side, and chrome that switches language while you are choosing
   which language field to type in is a way to make mistakes. The content is
   bilingual; the tool is not. */

export const metadata: Metadata = {
  title: 'Back office',
  robots: { index: false, follow: false },
};

interface MenuRow {
  id: string;
  position: number;
  stage_id: string | null;
  title_t: LocalizedRow;
  status: PublishStatus;
  routines: { id: string; position: number; weekday: number | null; title_t: LocalizedRow; status: PublishStatus }[] | null;
}
interface StageRow {
  id: string;
  position: number;
  name_t: LocalizedRow;
}

const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

/* The sidebar's tree, read once per request. Every back office write already
   revalidates this layout, so a rename or a new routine shows up in it at once.
   Menus with no stage are grouped under "Other menus" at the end. */
async function navTree(): Promise<{ tree: NavStage[]; exerciseCount: number }> {
  const supabase = await createClient();
  const [{ data: stages }, { data: menus }, { count }] = await Promise.all([
    supabase.from('stages').select('id, position, name_t').order('position'),
    supabase
      .from('menus')
      .select('id, position, stage_id, title_t, status, routines ( id, position, weekday, title_t, status )'),
    supabase.from('videos').select('id', { count: 'exact', head: true }),
  ]);

  const toMenu = (m: MenuRow) => ({
    id: m.id,
    title: m.title_t.en || 'Untitled menu',
    status: m.status,
    routines: byPosition(m.routines)
      .sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99) || a.position - b.position)
      .map(r => ({ id: r.id, weekday: r.weekday, title: r.title_t.en || 'Untitled routine', status: r.status })),
  });
  const all = (menus ?? []) as unknown as MenuRow[];

  const tree: NavStage[] = byPosition((stages ?? []) as StageRow[]).map(stage => ({
    id: stage.id,
    name: stage.name_t.en,
    menus: byPosition(all.filter(m => m.stage_id === stage.id)).map(toMenu),
  }));
  tree.push({ id: '', name: 'Other menus', menus: byPosition(all.filter(m => !m.stage_id)).map(toMenu) });

  return { tree, exerciseCount: count ?? 0 };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await adminGate();
  const { tree, exerciseCount } = gate.ok ? await navTree() : { tree: [], exerciseCount: 0 };

  return (
    <div className="bo">
      {/* The site's own nav, so the rest of the site is one click away and
          "Admin" reads as a section of it rather than a separate app. */}
      <AppNav />

      {gate.ok ? (
        <div className="shell">
          <Sidebar tree={tree} exerciseCount={exerciseCount} />
          <main className="work">{children}</main>
        </div>
      ) : (
        <main className="work">
          <Gate reason={gate.reason} />
        </main>
      )}
    </div>
  );
}

/* Why you cannot get in, and what to do about it. An admin screen that renders
   a blank page or a bare 403 costs more time than the sentence that explains
   which of the three things is missing. */
function Gate({ reason }: { reason: 'unconfigured' | 'signed-out' | 'not-admin' }) {
  if (reason === 'unconfigured') {
    return (
      <div className="gate">
        <h1>Supabase is not configured</h1>
        <p>
          The back office reads and writes the catalogue, so it needs a database. Copy{' '}
          <code>.env.example</code> to <code>.env.local</code> and fill in{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
        </p>
      </div>
    );
  }

  if (reason === 'signed-out') {
    return (
      <div className="gate">
        <h1>Sign in first</h1>
        <p>
          The back office is gated on your account, not on a shared password — every
          write goes through row-level security as you.
        </p>
        <SignInLink />
      </div>
    );
  }

  /* A member who wanders in gets a sentence, not the SQL that makes an admin —
     that lives in lib/supabase/admin.ts, for whoever runs the database. */
  return (
    <div className="gate">
      <h1>The back office is not open to this account</h1>
      <p>
        It is where the menus are written and published, and only the people who do that
        can use it. Everything you can practise is on the site.
      </p>
      <Link className="pill primary" href="/today">
        Go to today ↗
      </Link>
    </div>
  );
}
