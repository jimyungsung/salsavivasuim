import type { Metadata } from 'next';
import Link from 'next/link';
import { adminGate } from '@/lib/supabase/admin';
import SignInLink from './SignInLink';
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await adminGate();

  return (
    <div className="bo">
      <header className="bobar">
        <div className="wrap">
          <Link className="logo" href="/admin">
            SUIM<span className="dot" style={{ color: 'var(--lime)' }}>.</span>
          </Link>
          <span className="what">Back office</span>
          <span className="spacer" />
          {gate.ok && <span className="who">{gate.email}</span>}
          <Link className="out" href="/masterplan">
            View the site ↗
          </Link>
        </div>
      </header>

      <main>
        <div className="wrap">{gate.ok ? children : <Gate reason={gate.reason} />}</div>
      </main>
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
