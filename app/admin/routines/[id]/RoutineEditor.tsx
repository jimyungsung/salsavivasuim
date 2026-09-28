'use client';

/* One routine: its exercises in order, and the library to pick more from.

   A routine borrows exercises; it does not own them. Adding one is a tap on
   its card in the library panel — the same exercise can go in twice, each
   appearance with its own speed and repeat count — and the arrows decide the
   running order. Footage, tags and the beat grid are edited on the exercise
   itself, one click away. */

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import PublishSwitch from '../../PublishSwitch';
import LengthStrip, { STATUS_WORDS } from '../../LengthStrip';
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
import { EXERCISE_TAGS, LEVEL_KEYS, mmss, untranslated, type ExerciseTag } from '@/lib/db';
import { LEVEL_LABELS, TAG_LABELS } from '@/lib/i18n';
import type { EditorItem, EditorRoutine, PickVideo } from './page';

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const two = (n: number) => String(n).padStart(2, '0');

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
              <h2>Running order</h2>
              <span className="aside-note">Members practise them top to bottom. Aim for 10–15 minutes.</span>
            </div>

            <LengthStrip
              items={items.map(i => ({
                id: i.id,
                title: i.video?.title_t.en ?? 'Missing',
                status: i.video?.status ?? 'failed',
                duration_ms: i.video?.duration_ms ?? null,
                repeats: i.repeats,
              }))}
              size="large"
              hrefFor={id => `#i-${id}`}
            />

            {items.length === 0 ? (
              <p className="empty">No exercises yet. Add the first one from the library on the right.</p>
            ) : (
              <div className="vlist" style={{ marginTop: 16 }}>
                {items.map((item, i) => (
                  <ItemCard
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
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Publish</h2>
            <PublishSwitch value={routine.status} disabled={pending} onChange={next => run(() => setStatus('routines', routine.id, next))} />
            <Readiness routine={routine} />
          </section>

          <section className="panel">
            <h2>The routine</h2>
            <LocalizedField table="routines" id={routine.id} column="title_t" label="Title" value={routine.title_t} onError={setError} />
            <LocalizedField table="routines" id={routine.id} column="blurb_t" label="One line under the title" value={routine.blurb_t} onError={setError} />

            <div className="fields" style={{ marginTop: 18 }}>
              <div className="fieldset">
                <span className="lf-label">Weekday</span>
                <select className="field" value={routine.weekday ?? ''} disabled={pending}
                  onChange={e => run(() => setRoutineWeekday(routine.id, e.target.value === '' ? null : Number(e.target.value)))}>
                  <option value="">None</option>
                  {DAY.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
                <span className="hint">Which day of the menu&rsquo;s week this is.</span>
              </div>

              <div className="fieldset" style={{ maxWidth: 'none' }}>
                <span className="lf-label">Levels</span>
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
                <span className="hint">The level describes the material, not the dancer, so a routine can sit in two at once.</span>
              </div>
            </div>
          </section>
        </div>

        <Picker library={library} posters={posters} pending={pending} onPick={id => run(() => addRoutineItem(routine.id, id))} />
      </div>
    </>
  );
}

function ItemCard({
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
  const [speed, setSpeed] = useState(item.speed?.toString() ?? '');
  const [repeats, setRepeats] = useState(String(item.repeats));

  return (
    <article className="vcard" id={`i-${item.id}`}>
      <span className="vnum">{two(number)}</span>

      <Link className="vthumb" href={v ? `/admin/exercises/${v.id}` : '#'} tabIndex={-1} aria-hidden="true">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" />
        ) : (
          <span>{v ? STATUS_WORDS[v.status] : 'Missing'}</span>
        )}
        {v?.duration_ms ? <span className="len">{mmss(v.duration_ms)}</span> : null}
      </Link>

      <div className="vbody">
        <div className="vtop">
          {v?.tags.map(t => (
            <span className="tag" key={t}>{TAG_LABELS[t as ExerciseTag]?.en ?? t}</span>
          ))}
          {v && <span className="vstatus" data-status={v.status}>{STATUS_WORDS[v.status]}</span>}
          {v && v.publish !== 'open' && <span className="chip warn">{v.publish}</span>}
        </div>
        <Link className={`vtitle ${v?.title_t.en ? '' : 'blank'}`} href={v ? `/admin/exercises/${v.id}` : '#'}>
          {v?.title_t.en || (v ? 'Untitled exercise' : 'This exercise no longer exists')}
        </Link>
        <div className="vmeta">
          {v && <span>{LEVEL_LABELS[v.difficulty].en}</span>}
          {v && <span>{v.bpm ? `${v.bpm} bpm` : 'No beat grid'}</span>}
          {v && untranslated(v.title_t) && <span className="chip ko">needs KO</span>}
        </div>

        <div className="vacts">
          <label className="inl">
            <span>Speed</span>
            <input className="num" style={{ width: '6ch' }} value={speed} placeholder="—" disabled={pending} inputMode="decimal"
              onChange={e => setSpeed(e.target.value)}
              onBlur={() => {
                const n = speed.trim() ? Number(speed) : null;
                if (n !== item.speed && (n === null || Number.isFinite(n))) onRun(() => setRoutineItem(item.id, { speed: n }));
              }} />
            <span>×</span>
          </label>
          <label className="inl">
            <span>Repeats</span>
            <input className="num" style={{ width: '5ch' }} value={repeats} disabled={pending} inputMode="numeric"
              onChange={e => setRepeats(e.target.value)}
              onBlur={() => {
                const n = Number(repeats);
                if (n !== item.repeats && Number.isInteger(n)) onRun(() => setRoutineItem(item.id, { repeats: n }));
              }} />
          </label>
          <button className="btn icon" type="button" disabled={pending || first} onClick={() => onRun(() => movePosition('routine_items', item.id, 'up'))} aria-label="Move earlier" title="Move earlier">↑</button>
          <button className="btn icon" type="button" disabled={pending || last} onClick={() => onRun(() => movePosition('routine_items', item.id, 'down'))} aria-label="Move later" title="Move later">↓</button>
          <button className="btn icon danger" type="button" disabled={pending} aria-label="Take out of the routine" title="Take out of the routine"
            onClick={() => onRun(() => removeRoutineItem(item.id))}>
            ✕
          </button>
        </div>
      </div>
    </article>
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
    <div>
      <section className="panel picker">
        <div className="ph">
          <h2>Library</h2>
          <span className="aside-note">Tap to add to the end. <Link href="/admin/exercises">All exercises →</Link></span>
        </div>
        <input
          type="search"
          className="num"
          style={{ width: '100%', marginBottom: 10 }}
          placeholder="Search exercises"
          aria-label="Search exercises"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="levels" style={{ marginBottom: 14 }}>
          <button type="button" className={`chip${tag === 'all' ? ' open' : ''}`} aria-pressed={tag === 'all'} onClick={() => setTag('all')}>All</button>
          {EXERCISE_TAGS.filter(t => used.has(t)).map(t => (
            <button key={t} type="button" className={`chip${tag === t ? ' open' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
              {TAG_LABELS[t].en}
            </button>
          ))}
        </div>

        {library.length === 0 ? (
          <p className="empty">
            The library is empty. <Link href="/admin/exercises">Add an exercise</Link> and upload its footage first.
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
    </div>
  );
}

/* What stands between this routine and a member practising it, in plain words.
   RLS decides the real answer; this only reads the same facts back. */
function Readiness({ routine }: { routine: EditorRoutine }) {
  const items = routine.routine_items;
  const missing = items.filter(i => !i.video);
  const noFootage = items.filter(i => i.video && i.video.status !== 'ready');
  const unpublished = items.filter(i => i.video && i.video.publish !== 'open');
  const needKo = [routine.title_t, routine.blurb_t].filter(t => untranslated(t)).length;
  const gridded = items.filter(i => i.video?.bpm).length;
  const totalMin = items.reduce((n, i) => n + (i.video?.duration_ms ?? 0) * i.repeats, 0) / 60000;
  const menuOpen = routine.menu?.status === 'open';
  const visible = routine.status === 'open' && menuOpen && items.length > 0 && noFootage.length === 0 && unpublished.length === 0 && missing.length === 0;

  const rows: { ok: boolean; text: string; small?: string }[] = [
    { ok: items.length > 0, text: items.length ? `${items.length} exercises in the running order` : 'No exercises yet' },
    { ok: totalMin >= 5 && totalMin <= 20, text: `${Math.round(totalMin)} minutes`, small: 'A routine is 10–15 minutes; under 5 or over 20 reads as a mistake.' },
    { ok: missing.length === 0 && noFootage.length === 0, text: noFootage.length || missing.length ? `${noFootage.length + missing.length} without footage` : 'Every exercise has footage' },
    { ok: unpublished.length === 0, text: unpublished.length ? `${unpublished.length} exercise${unpublished.length === 1 ? '' : 's'} not open yet` : 'Every exercise is open', small: unpublished.length ? 'Members only see open exercises; the routine would play without these.' : undefined },
    { ok: needKo === 0, text: needKo ? `${needKo} field${needKo === 1 ? '' : 's'} still need Korean` : 'English and Korean complete' },
    { ok: items.length > 0 && gridded === items.length, text: `${gridded} of ${items.length} have a beat grid`, small: 'Counts, phrase marks and "loop eight counts" need one.' },
    { ok: routine.weekday != null, text: routine.weekday == null ? 'No weekday' : `On ${DAY[routine.weekday]}`, small: routine.weekday == null ? 'A routine without a weekday is not part of the menu’s week.' : undefined },
    { ok: menuOpen, text: menuOpen ? 'The menu is open' : `The menu is ${routine.menu?.status ?? 'missing'}`, small: menuOpen ? undefined : 'A routine only shows when its menu is open too.' },
  ];

  return (
    <>
      <ul className="checklist" style={{ marginTop: 18 }}>
        {rows.map(item => (
          <li key={item.text} className={item.ok ? '' : 'no'}>
            <span>
              {item.text}
              {item.small && <small>{item.small}</small>}
            </span>
          </li>
        ))}
      </ul>
      <p className={`visible-note ${visible ? 'yes' : 'no'}`}>
        {visible
          ? 'Members can practise this routine now.'
          : routine.status !== 'open'
            ? `Members cannot see this routine: it is ${routine.status}.`
            : !menuOpen
              ? 'Members cannot see this routine until its menu is open.'
              : 'Members see the routine, but some of it will not play yet.'}
      </p>
    </>
  );
}
