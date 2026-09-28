'use client';

/* One routine: its exercises in order, and the library to pick more from.

   A routine borrows exercises; it does not own them. Adding one is a tap on
   its card in the library — the same exercise can go in twice, each
   appearance with its own speed and repeats — and the arrows decide the
   running order. Footage, tags and the beat grid are edited on the exercise
   itself, one click away.

   Kept deliberately plain: a numbered list on the left, publish and the
   library on the right. What only matters when something is wrong (no
   footage, not open) shows only when it is wrong. */

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import PublishSwitch, { publishMeaning } from '../../PublishSwitch';
import { STATUS_WORDS } from '../../LengthStrip';
import {
  addRoutineItem,
  movePosition,
  removeRoutineItem,
  setRoutineItem,
  setRoutineLevels,
  setRoutineWeekday,
  setStatus,
  type Result,
} from '../../actions';
import { EXERCISE_TAGS, LEVEL_KEYS, mmss, type ExerciseTag } from '@/lib/db';
import { LEVEL_LABELS, TAG_LABELS } from '@/lib/i18n';
import type { EditorItem, EditorRoutine, PickVideo } from './page';

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SPEEDS = [0.5, 0.75, 1, 1.25];

export default function RoutineEditor({
  routine,
  library,
  posters,
}: {
  routine: EditorRoutine;
  library: PickVideo[];
  posters: Record<string, string>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.ok ? null : result.error);
    });

  const items = routine.routine_items;
  const totalMs = items.reduce((n, i) => n + (i.video?.duration_ms ?? 0) * i.repeats, 0);
  const menu = routine.menu;
  const title = routine.title_t.en || 'Untitled routine';

  return (
    <>
      <Crumbs
        items={[
          ...(menu?.stage ? [{ label: menu.stage.name_t.en, href: `/admin/stages/${menu.stage.id}` }] : []),
          ...(menu ? [{ label: menu.title_t.en, href: `/admin/menus/${menu.id}` }] : []),
          { label: title },
        ]}
      />

      <div className="head">
        <div>
          <h1>{title}</h1>
          <p>
            {routine.weekday == null ? 'No weekday' : DAY[routine.weekday]}
            {menu ? ` · ${menu.title_t.en}` : ''} · {items.length} exercise{items.length === 1 ? '' : 's'} · {mmss(totalMs)}
          </p>
        </div>
        <div className="acts">
          <Link className="btn" href={`/routines/${routine.id}`} target="_blank">
            Preview as a member ↗
          </Link>
        </div>
      </div>

      {error && <p className="banner">{error}</p>}

      <div className="editor">
        <div>
          <section className="panel">
            <div className="ph">
              <h2>Exercises, in order</h2>
              <span className="aside-note">Aim for 10–15 minutes. Add from the library on the right.</span>
            </div>

            {items.length === 0 ? (
              <p className="empty">No exercises yet. Tap one in the library to add it here.</p>
            ) : (
              <ol className="ilist">
                {items.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    number={i + 1}
                    poster={item.video ? posters[item.video.id] : undefined}
                    first={i === 0}
                    last={i === items.length - 1}
                    pending={pending}
                    onRun={run}
                  />
                ))}
              </ol>
            )}
          </section>

          <section className="panel">
            <h2>Details</h2>
            <LocalizedField table="routines" id={routine.id} column="title_t" label="Title" value={routine.title_t} onError={setError} />
            <LocalizedField table="routines" id={routine.id} column="blurb_t" label="One line under the title" value={routine.blurb_t} onError={setError} />

            <div className="fields" style={{ marginTop: 18, alignItems: 'center' }}>
              <div className="fieldset">
                <span className="lf-label">Day of the week</span>
                <select className="field" value={routine.weekday ?? ''} disabled={pending}
                  onChange={e => run(() => setRoutineWeekday(routine.id, e.target.value === '' ? null : Number(e.target.value)))}>
                  <option value="">None</option>
                  {DAY.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="fieldset" style={{ maxWidth: 'none' }}>
                <span className="lf-label">Level</span>
                <div className="levels">
                  {LEVEL_KEYS.map(key => {
                    const on = routine.levels.includes(key);
                    const next = on ? routine.levels.filter(k => k !== key) : [...routine.levels, key];
                    return (
                      <button key={key} type="button" className={`chip${on ? ' open' : ''}`} aria-pressed={on} disabled={pending}
                        onClick={() => run(() => setRoutineLevels(routine.id, next))}>
                        {LEVEL_LABELS[key].en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>Publish</h2>
            <PublishSwitch value={routine.status} disabled={pending} onChange={next => run(() => setStatus('routines', routine.id, next))} />
            <Readiness routine={routine} />
          </section>

          <Picker library={library} posters={posters} pending={pending} onPick={id => run(() => addRoutineItem(routine.id, id))} />
        </div>
      </div>
    </>
  );
}

function ItemRow({
  item,
  number,
  poster,
  first,
  last,
  pending,
  onRun,
}: {
  item: EditorItem;
  number: number;
  poster?: string;
  first: boolean;
  last: boolean;
  pending: boolean;
  onRun: (fn: () => Promise<Result>) => void;
}) {
  const v = item.video;
  const trouble = !v ? 'Missing' : v.status !== 'ready' ? STATUS_WORDS[v.status] : v.publish !== 'open' ? `Not open (${v.publish})` : null;

  return (
    <li className="irow" id={`i-${item.id}`}>
      <span className="inum">{number}</span>
      {v ? (
        <Link className="ithumb" href={`/admin/exercises/${v.id}`} tabIndex={-1} aria-hidden="true">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" />
          ) : null}
        </Link>
      ) : (
        <span className="ithumb" aria-hidden="true" />
      )}
      <div className="ibody">
        {v ? (
          <Link className="ititle" href={`/admin/exercises/${v.id}`}>{v.title_t.en || 'Untitled exercise'}</Link>
        ) : (
          <span className="ititle">This exercise no longer exists</span>
        )}
        <span className="imeta">
          {v?.duration_ms ? mmss(v.duration_ms) : '—'}
          {v && v.tags.length > 0 && ` · ${v.tags.slice(0, 2).map(t => TAG_LABELS[t as ExerciseTag]?.en ?? t).join(' · ')}`}
          {trouble && <span className="chip warn">{trouble}</span>}
        </span>
      </div>
      <label className="ictl">
        <span>Speed</span>
        <select className="field sm" value={item.speed ?? ''} disabled={pending}
          onChange={e => onRun(() => setRoutineItem(item.id, { speed: e.target.value === '' ? null : Number(e.target.value) }))}>
          <option value="">Default</option>
          {SPEEDS.map(s => (
            <option key={s} value={s}>{s}×</option>
          ))}
        </select>
      </label>
      <label className="ictl">
        <span>Repeat</span>
        <select className="field sm" value={item.repeats} disabled={pending}
          onChange={e => onRun(() => setRoutineItem(item.id, { repeats: Number(e.target.value) }))}>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>×{n}</option>
          ))}
        </select>
      </label>
      <span className="iops">
        <button className="btn icon" type="button" disabled={pending || first} onClick={() => onRun(() => movePosition('routine_items', item.id, 'up'))} aria-label="Move earlier" title="Move earlier">↑</button>
        <button className="btn icon" type="button" disabled={pending || last} onClick={() => onRun(() => movePosition('routine_items', item.id, 'down'))} aria-label="Move later" title="Move later">↓</button>
        <button className="btn icon danger" type="button" disabled={pending} aria-label="Remove" title="Remove from the routine"
          onClick={() => onRun(() => removeRoutineItem(item.id))}>
          ✕
        </button>
      </span>
    </li>
  );
}

/* The library, filtered by tag and a search, each card a button that appends. */
function Picker({
  library,
  posters,
  pending,
  onPick,
}: {
  library: PickVideo[];
  posters: Record<string, string>;
  pending: boolean;
  onPick: (videoId: string) => void;
}) {
  const [tag, setTag] = useState<ExerciseTag | 'all'>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      library.filter(
        v =>
          (tag === 'all' || v.tags.includes(tag)) &&
          (!q || v.title_t.en.toLowerCase().includes(q) || (v.title_t.ko ?? '').toLowerCase().includes(q)),
      ),
    [library, tag, q],
  );
  const used = new Set(library.flatMap(v => v.tags));

  return (
    <section className="panel picker">
      <div className="ph">
        <h2>Add from the library</h2>
        <span className="aside-note"><Link href="/admin/exercises">Media library →</Link></span>
      </div>
      <input
        type="search"
        className="num"
        style={{ width: '100%', marginBottom: 10 }}
        placeholder="Search"
        aria-label="Search the library"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {used.size > 0 && (
        <div className="levels" style={{ marginBottom: 14 }}>
          <button type="button" className={`chip${tag === 'all' ? ' open' : ''}`} aria-pressed={tag === 'all'} onClick={() => setTag('all')}>All</button>
          {EXERCISE_TAGS.filter(t => used.has(t)).map(t => (
            <button key={t} type="button" className={`chip${tag === t ? ' open' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
              {TAG_LABELS[t].en}
            </button>
          ))}
        </div>
      )}

      {library.length === 0 ? (
        <p className="empty">
          The library is empty. <Link href="/admin/exercises">Drop a video in the media library</Link> first.
        </p>
      ) : shown.length === 0 ? (
        <p className="empty">Nothing matches.</p>
      ) : (
        <div className="pgrid">
          {shown.map(v => (
            <button key={v.id} type="button" className="pcard" disabled={pending} onClick={() => onPick(v.id)} title="Add to the routine">
              <span className="pthumb">
                {posters[v.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={posters[v.id]} alt="" loading="lazy" />
                ) : (
                  <span>{STATUS_WORDS[v.status]}</span>
                )}
                {v.duration_ms ? <span className="len">{mmss(v.duration_ms)}</span> : null}
                <span className="padd" aria-hidden="true">+</span>
              </span>
              <span className="pname">{v.title_t.en || 'Untitled'}</span>
              <span className="pmeta">
                {v.tags.slice(0, 2).map(t => TAG_LABELS[t as ExerciseTag]?.en ?? t).join(' · ') || LEVEL_LABELS[v.difficulty].en}
                {v.publish !== 'open' && ` · ${v.publish}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* Only what stands between this routine and a member: nothing, or a short
   list. RLS decides the real answer; this reads the same facts back. */
function Readiness({ routine }: { routine: EditorRoutine }) {
  const items = routine.routine_items;
  const notReady = items.filter(i => !i.video || i.video.status !== 'ready').length;
  const notOpen = items.filter(i => i.video && i.video.status === 'ready' && i.video.publish !== 'open').length;
  const totalMin = items.reduce((n, i) => n + (i.video?.duration_ms ?? 0) * i.repeats, 0) / 60000;
  const menuOpen = routine.menu?.status === 'open';

  const issues: string[] = [];
  if (items.length === 0) issues.push('No exercises yet.');
  if (notReady) issues.push(`${notReady} exercise${notReady === 1 ? ' has' : 's have'} no footage.`);
  if (notOpen) issues.push(`${notOpen} exercise${notOpen === 1 ? ' is' : 's are'} not open to members.`);
  if (routine.weekday == null) issues.push('No day of the week, so it is not part of the menu’s week.');
  if (!menuOpen) issues.push(`The menu is ${routine.menu?.status ?? 'missing'}; members see the routine only when its menu is open.`);
  if (items.length > 0 && (totalMin < 5 || totalMin > 20)) issues.push(`${Math.round(totalMin)} minutes; a routine is 10–15.`);

  const live = routine.status === 'open' && issues.length === 0;

  return (
    <>
      <p className="hint" style={{ margin: '12px 0 0' }}>{publishMeaning(routine.status)}.</p>
      {issues.length > 0 ? (
        <ul className="issues">
          {issues.map(t => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className={`visible-note ${live ? 'yes' : 'no'}`}>
          {live ? 'Members can practise this routine now.' : 'Ready to open: everything in it has footage and is open.'}
        </p>
      )}
    </>
  );
}
