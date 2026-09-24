'use client';

/* The catalogue tree.

   Reordering is up/down buttons rather than drag and drop, deliberately. The
   prototype already taught this lesson once: HTML5 drag events do not fire on
   touch, so a drag-only list is a list you cannot reorder on a phone. Buttons
   work everywhere, are keyboard reachable, and each press is one transaction in
   the database.

   Editing lives on its own screen per row rather than inline here. A program has
   a title, subtitle, promise, level, weeks, slug, status and a free flag, all in
   two languages — that does not belong squeezed into a tree row. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  createArea,
  createProgram,
  createSession,
  movePosition,
  setStatus,
  type Result,
} from './actions';
import { PUBLISH_STATUSES, mmss, sessionLength, untranslated, type PublishStatus } from '@/lib/db';
import StepStrip from './StepStrip';
import type { TreeArea, TreeProgram, TreeSession } from './page';

export default function Tree({ areas }: { areas: TreeArea[] }) {
  const firstWithSessions = areas.find(a => a.programs.some(p => p.sessions.length > 0));
  const [open, setOpen] = useState<Set<string>>(
    new Set(firstWithSessions ? [firstWithSessions.id] : []),
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

  return (
    <>
      {error && (
        <p className="banner">
          {error}
        </p>
      )}

      <div className="tree">
        {areas.map((area, i) => (
          <section className="area" key={area.id}>
            <div className="ahead">
              <button className="arow" type="button" onClick={() => toggle(area.id)} aria-expanded={open.has(area.id)}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span className="nm">{area.name_t.en}</span>
                <span className="ct">
                  {area.programs.length} program{area.programs.length === 1 ? '' : 's'}
                </span>
                <span className="caret" aria-hidden="true">{open.has(area.id) ? '▾' : '▸'}</span>
              </button>
              <div className="actrl">
                {untranslated(area.name_t) && <span className="chip ko">needs KO</span>}
                <Link className="btn tiny" href={`/admin/areas/${area.id}`}>Edit</Link>
                <button className="btn tiny" type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('areas', area.id, 'up'))} aria-label="Move area up">↑</button>
                <button className="btn tiny" type="button" disabled={pending || i === areas.length - 1} onClick={() => run(() => movePosition('areas', area.id, 'down'))} aria-label="Move area down">↓</button>
              </div>
            </div>

            {open.has(area.id) && (
              <div className="plist">
                {area.programs.map((program, k) => (
                  <ProgramRow
                    key={program.id}
                    program={program}
                    first={k === 0}
                    last={k === area.programs.length - 1}
                    expanded={open.has(program.id)}
                    onToggle={() => toggle(program.id)}
                    onError={setError}
                  />
                ))}
                <div className="prow" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <NameAndAdd
                    placeholder="New program title"
                    label="+ Add program"
                    disabled={pending}
                    onAdd={title => run(() => createProgram(area.id, title))}
                  />
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <NameAndAdd
          placeholder="New area name"
          label="+ Add area"
          disabled={pending}
          onAdd={name => run(() => createArea(name))}
        />
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

function ProgramRow({
  program,
  first,
  last,
  expanded,
  onToggle,
  onError,
}: {
  program: TreeProgram;
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

  const all = program.sessions.flatMap(s => s.videos);
  const ready = all.filter(v => v.status === 'ready').length;

  return (
    <>
      <div className="prow">
        <div className="t">
          <Link href={`/admin/programs/${program.id}`}>{program.title_t.en}</Link>
          {program.subtitle_t.en && <span>{program.subtitle_t.en}</span>}
          {untranslated(program.title_t, program.subtitle_t) && <span className="chip ko">needs KO</span>}
        </div>
        <div className="meta">
          <span className="count">
            {program.sessions.length} session{program.sessions.length === 1 ? '' : 's'}
            {all.length > 0 && ` · ${ready}/${all.length} with footage`}
          </span>
          <StatusPicker table="programs" id={program.id} value={program.status} disabled={pending} onRun={run} />
          <Link className="btn tiny" href={`/admin/programs/${program.id}`}>Edit</Link>
          <button className="btn tiny" type="button" disabled={pending || first} onClick={() => run(() => movePosition('programs', program.id, 'up'))} aria-label="Move up">↑</button>
          <button className="btn tiny" type="button" disabled={pending || last} onClick={() => run(() => movePosition('programs', program.id, 'down'))} aria-label="Move down">↓</button>
          <button className="btn tiny" type="button" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? 'Hide sessions ▴' : 'Show sessions ▾'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="slist">
          {program.sessions.length === 0 ? (
            <p className="empty">No sessions yet.</p>
          ) : (
            program.sessions.map((session, i) => (
              <SessionRow
                key={session.id}
                session={session}
                first={i === 0}
                last={i === program.sessions.length - 1}
                onError={onError}
              />
            ))
          )}
          <div style={{ paddingTop: 8 }}>
            <button className="btn ghost tiny" type="button" disabled={pending} onClick={() => run(() => createSession(program.id))}>
              + Add session
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SessionRow({
  session,
  first,
  last,
  onError,
}: {
  session: TreeSession;
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

  const ready = session.videos.filter(v => v.status === 'ready').length;

  return (
    <div className="srow">
      <span className="sn">{String(session.position).padStart(2, '0')}</span>
      <span>
        <Link className="name" href={`/admin/sessions/${session.id}`}>
          {session.title_t.en || 'Untitled session'}
        </Link>{' '}
        {untranslated(session.title_t) && <span className="chip ko">needs KO</span>}
        <br />
        <span className="vids">
          {/* Never "of 6" — how many videos a session has is the session's own business. */}
          {session.videos.length === 0
            ? 'No videos'
            : `${session.videos.length} videos · ${mmss(sessionLength(session.videos))} · ${ready} with footage`}
        </span>
      </span>
      <StepStrip videos={session.videos} hrefFor={() => `/admin/sessions/${session.id}`} />
      <span className="end">
        <StatusPicker table="sessions" id={session.id} value={session.status} disabled={pending} onRun={run} />
        <button className="btn tiny" type="button" disabled={pending || first} onClick={() => run(() => movePosition('sessions', session.id, 'up'))} aria-label="Move up">↑</button>
        <button className="btn tiny" type="button" disabled={pending || last} onClick={() => run(() => movePosition('sessions', session.id, 'down'))} aria-label="Move down">↓</button>
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
  table: 'programs' | 'sessions';
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
