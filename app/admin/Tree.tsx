'use client';

/* The catalogue tree.

   Reordering is up/down buttons rather than drag and drop, deliberately. The
   prototype already taught this lesson once: HTML5 drag events do not fire on
   touch, so a drag-only list is a list you cannot reorder on a phone. Buttons
   work everywhere, are keyboard reachable, and each press is one transaction in
   the database. Drag can be added on top later as an accelerant. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createSession, movePosition, setStatus, type Result } from './actions';
import { PUBLISH_STATUSES, untranslated, type PublishStatus } from '@/lib/db';
import type { TreeArea, TreeProgram, TreeSession } from './page';

export default function Tree({ areas }: { areas: TreeArea[] }) {
  /* The area holding the one module that is built out starts open, so the
     screen lands on something useful rather than seven closed rows. */
  const firstWithSessions = areas.find(a => a.programs.some(p => p.sessions.length > 0));
  const [open, setOpen] = useState<Set<string>>(
    new Set(firstWithSessions ? [firstWithSessions.id] : []),
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <>
      {error && (
        <p className="chip warn" style={{ display: 'block', marginBottom: 12, padding: '10px 12px' }}>
          {error}
        </p>
      )}
      <div className="tree">
        {areas.map((area, i) => (
          <section className="area" key={area.id}>
            <button className="arow" type="button" onClick={() => toggle(area.id)} aria-expanded={open.has(area.id)}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="nm">{area.name_t.en}</span>
              <span className="ct">
                {area.programs.length} program{area.programs.length === 1 ? '' : 's'}
              </span>
              <span className="caret" aria-hidden="true">
                {open.has(area.id) ? '▾' : '▸'}
              </span>
            </button>

            {open.has(area.id) && (
              <div className="plist">
                {area.programs.map(program => (
                  <ProgramRow
                    key={program.id}
                    program={program}
                    expanded={open.has(program.id)}
                    onToggle={() => toggle(program.id)}
                    onError={setError}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function ProgramRow({
  program,
  expanded,
  onToggle,
  onError,
}: {
  program: TreeProgram;
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

  const ready = program.sessions.flatMap(s => s.videos).filter(v => v.status === 'ready').length;
  const total = program.sessions.flatMap(s => s.videos).length;

  return (
    <>
      <div className="prow">
        <div className="t">
          <b>{program.title_t.en}</b> <span>· {program.subtitle_t.en}</span>
          {untranslated(program.title_t, program.subtitle_t) && <> <span className="chip ko">needs KO</span></>}
        </div>
        <div className="meta">
          <span className="ct" style={{ fontSize: 11.5, color: 'var(--bo-dim)' }}>
            {program.sessions.length} session{program.sessions.length === 1 ? '' : 's'}
            {total > 0 && ` · ${ready}/${total} with footage`}
          </span>
          <StatusPicker
            table="programs"
            id={program.id}
            value={program.status}
            disabled={pending}
            onRun={run}
          />
          <button className="btn tiny" type="button" disabled={pending} onClick={() => run(() => movePosition('programs', program.id, 'up'))} aria-label="Move up">
            ↑
          </button>
          <button className="btn tiny" type="button" disabled={pending} onClick={() => run(() => movePosition('programs', program.id, 'down'))} aria-label="Move down">
            ↓
          </button>
          <button className="btn tiny" type="button" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? 'Hide sessions' : 'Sessions'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="slist">
          {program.sessions.length === 0 ? (
            <p className="empty">No sessions yet.</p>
          ) : (
            program.sessions.map(session => (
              <SessionRow key={session.id} session={session} onError={onError} />
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
  onError,
}: {
  session: TreeSession;
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
        </Link>
        {untranslated(session.title_t) && <> <span className="chip ko">needs KO</span></>}
      </span>
      <span className="meta" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="vids">
          {/* Never "of 6" — how many videos a session has is the session's own business. */}
          {session.videos.length === 0
            ? 'no videos'
            : `${ready}/${session.videos.length} with footage`}
        </span>
        <StatusPicker table="sessions" id={session.id} value={session.status} disabled={pending} onRun={run} />
        <button className="btn tiny" type="button" disabled={pending} onClick={() => run(() => movePosition('sessions', session.id, 'up'))} aria-label="Move up">
          ↑
        </button>
        <button className="btn tiny" type="button" disabled={pending} onClick={() => run(() => movePosition('sessions', session.id, 'down'))} aria-label="Move down">
          ↓
        </button>
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
