'use client';

/* A whole week on one page: its days as columns, the library beside them.
   Pick a day, then tap exercises in the library to append them to it — the
   same optimistic, queued add as a routine's own page — and order or take
   them out right in the column. What only some days need (speed, repeats, a
   title of its own) stays on the day's page, one link away. Before this, a
   week of six days was six routine pages. */

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import Picker from '../../Picker';
import {
  addRoutineItem,
  createRoutine,
  deleteRoutine,
  movePosition,
  removeRoutineItem,
  type Result,
} from '../../actions';
import { mmss } from '@/lib/db';
import type { TreeRoutine } from '../../page';
import type { PickVideo } from '../../routines/[id]/page';

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeekBuilder({
  menuId,
  routines,
  library,
  posters,
  onError,
}: {
  menuId: string;
  routines: TreeRoutine[];
  library: PickVideo[];
  posters: Record<string, string>;
  onError: (message: string | null) => void;
}) {
  const [target, setTarget] = useState<string | null>(routines[0]?.id ?? null);
  const [adding, setAdding] = useState<{ key: number; routineId: string; video: PickVideo }[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      onError(r.ok ? null : r.error);
    });

  /* Appends shown at once; saved one after another (positions are max + 1). */
  const pick = (video: PickVideo) => {
    if (!target) return;
    const key = Date.now() + Math.random();
    const routineId = target;
    setAdding(a => [...a, { key, routineId, video }]);
    queue.current = queue.current.then(async () => {
      const r = await addRoutineItem(routineId, video.id);
      if (!r.ok) onError(r.error);
      setAdding(a => a.filter(x => x.key !== key));
    });
  };

  const current = routines.find(r => r.id === target) ?? null;
  const dayName = (r: TreeRoutine) => (r.weekday == null ? 'No day' : DAY[r.weekday]);

  return (
    <div className="builder">
      <div>
        {routines.length === 0 ? (
          <p className="empty">No days yet. Add one, or make the week again with a day pattern.</p>
        ) : (
          <div className="wcols">
            {routines.map(r => {
              const items = r.routine_items;
              const extra = adding.filter(a => a.routineId === r.id);
              const ms = items.reduce((n, i) => n + (i.video?.duration_ms ?? 0) * i.repeats, 0);
              const own = r.title_t.en.trim() && r.title_t.en.trim() !== dayName(r) ? r.title_t.en : null;
              const on = r.id === target;
              return (
                <section
                  key={r.id}
                  className={`wcol${on ? ' on' : ''}`}
                  onClick={() => setTarget(r.id)}
                  aria-label={dayName(r)}
                >
                  <header>
                    <b>{dayName(r)}</b>
                    {own && <span className="own">{own}</span>}
                    <span className="len">{ms ? mmss(ms) : '0:00'}</span>
                    <span className={`chip ${r.status}`}>{r.status}</span>
                  </header>
                  <ol>
                    {items.map((item, i) => (
                      <li key={item.id} className={item.video?.status === 'ready' ? undefined : 'nofootage'}>
                        <span className="t">{item.video?.title_t.en || 'Missing exercise'}</span>
                        <span className="m">
                          {item.video?.duration_ms ? mmss(item.video.duration_ms) : '—'}
                          {item.repeats > 1 && ` ×${item.repeats}`}
                        </span>
                        <span className="ops" onClick={e => e.stopPropagation()}>
                          <button type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('routine_items', item.id, 'up'))} aria-label="Earlier">↑</button>
                          <button type="button" disabled={pending || i === items.length - 1} onClick={() => run(() => movePosition('routine_items', item.id, 'down'))} aria-label="Later">↓</button>
                          <button type="button" disabled={pending} onClick={() => run(() => removeRoutineItem(item.id))} aria-label="Take out">✕</button>
                        </span>
                      </li>
                    ))}
                    {extra.map(a => (
                      <li key={a.key} className="saving">
                        <span className="t">{a.video.title_t.en || 'Untitled'}</span>
                        <span className="m">adding…</span>
                      </li>
                    ))}
                    {items.length + extra.length === 0 && <li className="none">{on ? 'Tap an exercise on the right →' : 'Empty'}</li>}
                  </ol>
                  <footer onClick={e => e.stopPropagation()}>
                    <Link href={`/admin/routines/${r.id}`} title="Speed, repeats and a title of its own">Details →</Link>
                    <button
                      type="button"
                      className="del"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`Delete ${dayName(r)}? Its exercises stay in the library.`)) run(() => deleteRoutine(r.id));
                      }}
                    >
                      Delete day
                    </button>
                  </footer>
                </section>
              );
            })}
          </div>
        )}
        <div className="addbar">
          <button className="btn ghost" type="button" disabled={pending} onClick={() => start(async () => {
            const r = await createRoutine(menuId);
            if (r.ok) setTarget(r.id);
            onError(r.ok ? null : r.error);
          })}>
            + Add a day
          </button>
          <span>It lands on the first free weekday.</span>
        </div>
      </div>

      <Picker
        heading={current ? `Add to ${dayName(current)}` : 'Pick a day first'}
        library={library}
        posters={posters}
        inRoutine={current ? [...current.routine_items.map(i => i.video?.id), ...adding.filter(a => a.routineId === current.id).map(a => a.video.id)].filter((id): id is string => Boolean(id)) : []}
        onPick={pick}
      />
    </div>
  );
}
