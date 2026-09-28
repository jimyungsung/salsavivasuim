'use client';

/* The catalogue tree: stages → menus → routines.

   Reordering is up/down buttons rather than drag and drop, deliberately. The
   prototype already taught this lesson once: HTML5 drag events do not fire on
   touch, so a drag-only list is a list you cannot reorder on a phone. Buttons
   work everywhere, are keyboard reachable, and each press is one transaction in
   the database.

   Editing lives on its own screen per row rather than inline here. A menu has
   a title, subtitle, promise, level, slug and status, all in two languages —
   that does not belong squeezed into a tree row. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  createMenu,
  createRoutine,
  createStage,
  movePosition,
  setStatus,
  type Result,
} from './actions';
import { PUBLISH_STATUSES, mmss, untranslated, type PublishStatus } from '@/lib/db';
import LengthStrip, { type StripItem } from './LengthStrip';
import type { TreeMenu, TreeRoutine, TreeStage } from './page';

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const stripOf = (routine: TreeRoutine): StripItem[] =>
  routine.routine_items.map(i => ({
    id: i.id,
    title: i.video?.title_t.en ?? 'Missing',
    status: i.video?.status ?? 'failed',
    duration_ms: i.video?.duration_ms ?? null,
    repeats: i.repeats,
  }));

export const routineLength = (routine: TreeRoutine): number =>
  routine.routine_items.reduce((n, i) => n + (i.video?.duration_ms ?? 0) * i.repeats, 0);

export default function Tree({ stages }: { stages: TreeStage[] }) {
  const firstWithRoutines = stages.find(s => s.menus.some(m => m.routines.length > 0));
  const [open, setOpen] = useState<Set<string>>(
    new Set(firstWithRoutines ? [firstWithRoutines.id] : []),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.ok ? null : result.error);
    });

  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const real = stages.filter(s => s.id);

  return (
    <>
      {error && (
        <p className="banner">
          {error}
        </p>
      )}

      <div className="tree">
        {stages.map((stage, i) => (
          <section className="area" key={stage.id || 'none'}>
            <div className="ahead">
              <button className="arow" type="button" onClick={() => toggle(stage.id)} aria-expanded={open.has(stage.id)}>
                <span className="n">{stage.id ? String(i + 1).padStart(2, '0') : '—'}</span>
                <span className="nm">{stage.name_t.en}</span>
                <span className="ct">
                  {stage.menus.length} menu{stage.menus.length === 1 ? '' : 's'}
                </span>
                <span className="caret" aria-hidden="true">{open.has(stage.id) ? '▾' : '▸'}</span>
              </button>
              {stage.id && (
                <div className="actrl">
                  {untranslated(stage.name_t) && <span className="chip ko">needs KO</span>}
                  <Link className="btn tiny" href={`/admin/stages/${stage.id}`}>Edit</Link>
                  <button className="btn tiny" type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('stages', stage.id, 'up'))} aria-label="Move stage up">↑</button>
                  <button className="btn tiny" type="button" disabled={pending || i === real.length - 1} onClick={() => run(() => movePosition('stages', stage.id, 'down'))} aria-label="Move stage down">↓</button>
                </div>
              )}
            </div>

            {open.has(stage.id) && (
              <div className="plist">
                {stage.menus.map((menu, k) => (
                  <MenuRow
                    key={menu.id}
                    menu={menu}
                    first={k === 0}
                    last={k === stage.menus.length - 1}
                    expanded={open.has(menu.id)}
                    onToggle={() => toggle(menu.id)}
                    onError={setError}
                  />
                ))}
                <div className="prow" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <NameAndAdd
                    placeholder="New menu title"
                    label="+ Add menu"
                    disabled={pending}
                    onAdd={title => run(() => createMenu(stage.id || null, title))}
                  />
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <NameAndAdd
          placeholder="New stage name"
          label="+ Add stage"
          disabled={pending}
          onAdd={name => run(() => createStage(name))}
        />
        {!stages.some(s => !s.id) && (
          <NameAndAdd
            placeholder="New menu with no stage"
            label="+ Add a stageless menu"
            disabled={pending}
            onAdd={title => run(() => createMenu(null, title))}
          />
        )}
      </div>
    </>
  );
}

/* A name, then the button. Creating something nameless and renaming it later is
   how catalogues end up full of "Untitled". */
function NameAndAdd({
  placeholder,
  label,
  disabled,
  onAdd,
}: {
  placeholder: string;
  label: string;
  disabled: boolean;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  };

  return (
    <div className="addbar">
      <input
        className="num"
        style={{ width: '28ch' }}
        value={name}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button className="btn ghost" type="button" disabled={disabled || !name.trim()} onClick={submit}>
        {label}
      </button>
    </div>
  );
}

function MenuRow({
  menu,
  first,
  last,
  expanded,
  onToggle,
  onError,
}: {
  menu: TreeMenu;
  first: boolean;
  last: boolean;
  expanded: boolean;
  onToggle: () => void;
  onError: (message: string | null) => void;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      onError(result.ok ? null : result.error);
    });

  const items = menu.routines.flatMap(r => r.routine_items);
  const ready = items.filter(i => i.video?.status === 'ready').length;

  return (
    <>
      <div className="prow">
        <div className="t">
          <Link href={`/admin/menus/${menu.id}`}>{menu.title_t.en}</Link>
          {menu.subtitle_t.en && <span>{menu.subtitle_t.en}</span>}
          {untranslated(menu.title_t, menu.subtitle_t) && <span className="chip ko">needs KO</span>}
        </div>
        <div className="meta">
          <span className="count">
            {menu.routines.length} routine{menu.routines.length === 1 ? '' : 's'}
            {items.length > 0 && ` · ${ready}/${items.length} with footage`}
          </span>
          <StatusPicker table="menus" id={menu.id} value={menu.status} disabled={pending} onRun={run} />
          <Link className="btn tiny" href={`/admin/menus/${menu.id}`}>Edit</Link>
          <button className="btn tiny" type="button" disabled={pending || first} onClick={() => run(() => movePosition('menus', menu.id, 'up'))} aria-label="Move up">↑</button>
          <button className="btn tiny" type="button" disabled={pending || last} onClick={() => run(() => movePosition('menus', menu.id, 'down'))} aria-label="Move down">↓</button>
          <button className="btn tiny" type="button" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? 'Hide routines ▴' : 'Show routines ▾'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="slist">
          {menu.routines.length === 0 ? (
            <p className="empty">No routines yet.</p>
          ) : (
            menu.routines.map((routine, i) => (
              <RoutineRow
                key={routine.id}
                routine={routine}
                first={i === 0}
                last={i === menu.routines.length - 1}
                onError={onError}
              />
            ))
          )}
          <div style={{ paddingTop: 8 }}>
            <button className="btn ghost tiny" type="button" disabled={pending} onClick={() => run(() => createRoutine(menu.id))}>
              + Add routine
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function RoutineRow({
  routine,
  first,
  last,
  onError,
}: {
  routine: TreeRoutine;
  first: boolean;
  last: boolean;
  onError: (message: string | null) => void;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      onError(result.ok ? null : result.error);
    });

  const n = routine.routine_items.length;
  const ready = routine.routine_items.filter(i => i.video?.status === 'ready').length;

  return (
    <div className="srow">
      <span className="sn">{routine.weekday == null ? '—' : DAY[routine.weekday]}</span>
      <span>
        <Link className="name" href={`/admin/routines/${routine.id}`}>
          {routine.title_t.en || 'Untitled routine'}
        </Link>{' '}
        {untranslated(routine.title_t) && <span className="chip ko">needs KO</span>}
        <br />
        <span className="vids">
          {n === 0
            ? 'No exercises'
            : `${n} exercise${n === 1 ? '' : 's'} · ${mmss(routineLength(routine))} · ${ready} with footage`}
        </span>
      </span>
      <LengthStrip items={stripOf(routine)} hrefFor={() => `/admin/routines/${routine.id}`} />
      <span className="end">
        <StatusPicker table="routines" id={routine.id} value={routine.status} disabled={pending} onRun={run} />
        <button className="btn tiny" type="button" disabled={pending || first} onClick={() => run(() => movePosition('routines', routine.id, 'up'))} aria-label="Move up">↑</button>
        <button className="btn tiny" type="button" disabled={pending || last} onClick={() => run(() => movePosition('routines', routine.id, 'down'))} aria-label="Move down">↓</button>
      </span>
    </div>
  );
}

function StatusPicker({
  table,
  id,
  value,
  disabled,
  onRun,
}: {
  table: 'menus' | 'routines';
  id: string;
  value: PublishStatus;
  disabled: boolean;
  onRun: (fn: () => Promise<Result>) => void;
}) {
  return (
    <select
      className="status"
      value={value}
      disabled={disabled}
      aria-label="Publish status"
      onChange={e => {
        const next = e.target.value;
        onRun(() => setStatus(table, id, next));
      }}
    >
      {PUBLISH_STATUSES.map(s => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
