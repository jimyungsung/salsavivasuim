import type { Metadata } from 'next';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { adminGate } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { LocalizedRow, PublishStatus } from '@/lib/db';
import SignInLink from './SignInLink';
import Sidebar, { type NavArea } from './Sidebar';
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

interface TreeRow {
  id: string;
  position: number;
  name_t: LocalizedRow;
  programs: {
    id: string;
    position: number;
    title_t: LocalizedRow;
    status: PublishStatus;
    sessions: {
      id: string;
      position: number;
      title_t: LocalizedRow;
      status: PublishStatus;
      videos: { id: string }[] | null;
    }[] | null;
  }[] | null;
}

const byPosition = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  [...(rows ?? [])].sort((a, b) => a.position - b.position);

/* The sidebar's tree, read once per request. Every back office write already
   revalidates this layout, so a rename or a new session shows up in it at once. */
async function navTree(): Promise<NavArea[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('areas')
    .select(
      `id, position, name_t,
       programs ( id, position, title_t, status,
         sessions ( id, position, title_t, status, videos ( id ) ) )`,
    )
    .order('position');

  return byPosition(data as unknown as TreeRow[]).map(area => ({
    id: area.id,
    name: area.name_t.en,
    programs: byPosition(area.programs).map(p => ({
      id: p.id,
      title: p.title_t.en || 'Untitled program',
      status: p.status,
      sessions: byPosition(p.sessions).map(s => ({
        id: s.id,
        position: s.position,
        title: s.title_t.en || 'Untitled session',
        status: s.status,
        videoIds: (s.videos ?? []).map(v => v.id),
      })),
    })),
  }));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await adminGate();
  const tree = gate.ok ? await navTree() : [];

  return (
    <div className="bo">
      {/* The site's own nav, so the rest of the site is one click away and
          "Admin" reads as a section of it rather than a separate app. */}
      <AppNav />

      {gate.ok ? (
        <div className="shell">
          <Sidebar tree={tree} />
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
        It is where the catalogue is edited and published, and only the people who do that
        can use it. Everything you can watch is on the site.
      </p>
      <Link className="pill primary" href="/masterplan">
        Go to the masterplan ↗
      </Link>
    </div>
  );
}
