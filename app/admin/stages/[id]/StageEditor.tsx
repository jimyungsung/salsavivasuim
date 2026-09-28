'use client';

/* One stage: the top of the tree. Not much to it — a name, a blurb and a slug —
   but it is the only place those can be changed. */

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import { deleteStage, setStageSlug, type Result } from '../../actions';
import type { EditorStage } from './page';

export default function StageEditor({ stage }: { stage: EditorStage }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(stage.slug);
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
      <Crumbs items={[{ label: stage.name_t.en || 'Untitled stage' }]} />

      <div className="head">
        <div>
          <h1>{stage.name_t.en || 'Untitled stage'}</h1>
          <p>Stage {String(stage.position).padStart(2, '0')}. Its menus are the weeks a member works through, in order.</p>
        </div>
        <div className="tally">
          <span>
            <b>{stage.menus.length}</b>menus
          </span>
        </div>
      </div>

      {error && (
        <p className="banner">
          {error}
        </p>
      )}

      <section className="panel">
        <h2>Copy</h2>
        <LocalizedField table="stages" id={stage.id} column="name_t" label="Name" value={stage.name_t} onError={setError} />
        <LocalizedField table="stages" id={stage.id} column="blurb_t" label="Blurb" value={stage.blurb_t} multiline onError={setError} />
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
            onBlur={() => slug !== stage.slug && run(() => setStageSlug(stage.id, slug))}
          />
          <span className="hint">
            Used in links to this stage. Changing it breaks any link already shared.
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Danger</h2>
        {stage.menus.length > 0 ? (
          <p className="hint" style={{ fontSize: 13 }}>
            This stage still holds {stage.menus.length} menu
            {stage.menus.length === 1 ? '' : 's'}, so the database will refuse to delete it.
            Move or delete those first — that restriction is there so a whole branch of the
            catalogue cannot vanish behind one click.
          </p>
        ) : (
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete the stage "${stage.name_t.en}"? It is empty, so nothing else goes with it.`)) {
                run(() => deleteStage(stage.id), () => router.push('/admin'));
              }
            }}
          >
            Delete this stage
          </button>
        )}
      </section>
    </>
  );
}
