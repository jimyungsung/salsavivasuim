'use client';

/* One area: the top of the tree. Not much to it — a name, a blurb and a slug —
   but it is the only place those can be changed. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import LocalizedField from '../../LocalizedField';
import { deleteArea, setAreaSlug, type Result } from '../../actions';
import type { EditorArea } from './page';

export default function AreaEditor({ area }: { area: EditorArea }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(area.slug);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        after?.();
      } else {
        setError(result.error);
      }
    });

  return (
    <>
      <div className="crumb-row">
        <Link href="/admin">← Catalogue</Link>
      </div>

      <div className="head">
        <div>
          <h1>{area.name_t.en || 'Untitled area'}</h1>
          <p>Area {String(area.position).padStart(2, '0')} of the masterplan.</p>
        </div>
        <div className="tally">
          <span>
            <b>{area.programs.length}</b>programs
          </span>
        </div>
      </div>

      {error && (
        <p className="chip warn" style={{ display: 'block', marginBottom: 14, padding: '10px 12px' }}>
          {error}
        </p>
      )}

      <section className="panel">
        <h2>Copy</h2>
        <LocalizedField table="areas" id={area.id} column="name_t" label="Name" value={area.name_t} onError={setError} />
        <LocalizedField table="areas" id={area.id} column="blurb_t" label="Blurb" value={area.blurb_t} multiline onError={setError} />
      </section>

      <section className="panel">
        <h2>Identity</h2>
        <div className="fieldset" style={{ maxWidth: '40ch' }}>
          <span className="lf-label">Slug</span>
          <input
            className="num"
            style={{ width: '100%' }}
            value={slug}
            disabled={pending}
            onChange={e => setSlug(e.target.value)}
            onBlur={() => slug !== area.slug && run(() => setAreaSlug(area.id, slug))}
          />
          <span className="hint">
            Used in links to this area. Changing it breaks any link already shared.
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Danger</h2>
        {area.programs.length > 0 ? (
          <p className="hint" style={{ fontSize: 13 }}>
            This area still holds {area.programs.length} program
            {area.programs.length === 1 ? '' : 's'}, so the database will refuse to delete it.
            Move or delete those first — that restriction is there so a whole branch of the
            catalogue cannot vanish behind one click.
          </p>
        ) : (
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete the area "${area.name_t.en}"? It is empty, so nothing else goes with it.`)) {
                run(() => deleteArea(area.id), () => router.push('/admin'));
              }
            }}
          >
            Delete this area
          </button>
        )}
      </section>
    </>
  );
}
