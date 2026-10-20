'use client';

/* One stage: the top of the tree, and only its name. The blurb and slug are
   still columns, but no member reads them, so they are not asked for here. */

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import EditableTitle from '../../EditableTitle';
import { deleteStage, type Result } from '../../actions';
import type { EditorStage } from './page';

export default function StageEditor({ stage }: { stage: EditorStage }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
          <EditableTitle table="stages" id={stage.id} column="name_t" value={stage.name_t} placeholder="Untitled stage" onError={setError} />
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
