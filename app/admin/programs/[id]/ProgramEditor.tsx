'use client';

/* One program, and the sessions inside it.

   The session list is here as well as in the tree because this is where you
   would be standing when you add one — and because publishing a program means
   looking at what is actually in it first. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import LocalizedField from '../../LocalizedField';
import {
  createSession,
  deleteProgram,
  deleteSession,
  movePosition,
  setProgramFields,
  setStatus,
  type Result,
} from '../../actions';
import { LEVEL_KEYS, PUBLISH_STATUSES, untranslated } from '@/lib/db';
import type { EditorProgram } from './page';

export default function ProgramEditor({ program }: { program: EditorProgram }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(program.slug);
  const [weeks, setWeeks] = useState(program.weeks?.toString() ?? '');
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

  const videos = program.sessions.flatMap(s => s.videos);
  const ready = videos.filter(v => v.status === 'ready').length;

  return (
    <>
      <div className="crumb-row">
        <Link href="/admin">← Catalogue</Link>
      </div>

      <div className="head">
        <div>
          <h1>{program.title_t.en || 'Untitled program'}</h1>
          <p>
            {program.area?.name_t.en}
            {program.subtitle_t.en ? ` · ${program.subtitle_t.en}` : ''}
          </p>
        </div>
        <div className="tally">
          <span>
            <b>{program.sessions.length}</b>sessions
          </span>
          <span>
            <b>{videos.length}</b>videos
          </span>
          <span>
            <b>{ready}</b>with footage
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
        <LocalizedField table="programs" id={program.id} column="title_t" label="Title" value={program.title_t} onError={setError} />
        <LocalizedField table="programs" id={program.id} column="subtitle_t" label="Subtitle" value={program.subtitle_t} onError={setError} />
        <LocalizedField table="programs" id={program.id} column="promise_t" label="Promise" value={program.promise_t} multiline onError={setError} />
      </section>

      <section className="panel">
        <h2>Shape</h2>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fieldset">
            <span className="lf-label">Level</span>
            <select className="step" style={{ width: 'auto' }} value={program.level} disabled={pending} onChange={e => run(() => setProgramFields(program.id, { level: e.target.value }))}>
              {LEVEL_KEYS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <span className="hint">Describes the material, not the dancer.</span>
          </div>

          <div className="fieldset">
            <span className="lf-label">Weeks</span>
            <input className="num" value={weeks} disabled={pending} inputMode="numeric"
              onChange={e => setWeeks(e.target.value)}
              onBlur={() => {
                const n = weeks.trim() ? Number(weeks) : null;
                if (n !== program.weeks) run(() => setProgramFields(program.id, { weeks: n }));
              }} placeholder="—" />
            <span className="hint">Session count is counted, never stored.</span>
          </div>

          <div className="fieldset">
            <span className="lf-label">Status</span>
            <select className="status" value={program.status} disabled={pending} onChange={e => run(() => setStatus('programs', program.id, e.target.value))}>
              {PUBLISH_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="hint">
              {program.published_at
                ? `First opened ${new Date(program.published_at).toLocaleDateString()}.`
                : 'Not yet opened.'}
            </span>
          </div>

          <div className="fieldset">
            <span className="lf-label">Stays free</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={program.is_free} disabled={pending}
                onChange={e => run(() => setProgramFields(program.id, { is_free: e.target.checked }))} />
              <span>Free when the paid tier lands</span>
            </label>
            <span className="hint">Everything is free today; this marks the sample that stays.</span>
          </div>
        </div>

        <div className="fieldset" style={{ maxWidth: '40ch', marginTop: 16 }}>
          <span className="lf-label">Slug</span>
          <input className="num" style={{ width: '100%' }} value={slug} disabled={pending}
            onChange={e => setSlug(e.target.value)}
            onBlur={() => slug !== program.slug && run(() => setProgramFields(program.id, { slug }))} />
          <span className="hint">Changing it breaks any link already shared.</span>
        </div>
      </section>

      <section className="panel">
        <h2>Sessions</h2>
        {program.sessions.length === 0 ? (
          <p className="empty" style={{ padding: '4px 0 12px' }}>No sessions yet.</p>
        ) : (
          program.sessions.map((s, i) => (
            <div className="srow" key={s.id} style={{ paddingLeft: 0 }}>
              <span className="sn">{String(s.position).padStart(2, '0')}</span>
              <span>
                <Link className="name" href={`/admin/sessions/${s.id}`}>
                  {s.title_t.en || 'Untitled session'}
                </Link>
                {untranslated(s.title_t) && <> <span className="chip ko">needs KO</span></>}
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="vids">
                  {s.videos.length === 0
                    ? 'no videos'
                    : `${s.videos.filter(v => v.status === 'ready').length}/${s.videos.length} with footage`}
                </span>
                <span className={`chip ${s.status}`}>{s.status}</span>
                <button className="btn tiny" type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('sessions', s.id, 'up'))} aria-label="Move up">↑</button>
                <button className="btn tiny" type="button" disabled={pending || i === program.sessions.length - 1} onClick={() => run(() => movePosition('sessions', s.id, 'down'))} aria-label="Move down">↓</button>
                <button className="btn tiny" type="button" disabled={pending}
                  onClick={() => {
                    const n = s.videos.length;
                    if (confirm(`Delete session "${s.title_t.en || 'Untitled'}"${n ? ` and its ${n} video${n === 1 ? '' : 's'}` : ''}? This cannot be undone.`)) {
                      run(() => deleteSession(s.id));
                    }
                  }}>Delete</button>
              </span>
            </div>
          ))
        )}
        <div className="addbar">
          <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => createSession(program.id))}>
            + Add session
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Danger</h2>
        <p className="hint" style={{ fontSize: 13, marginBottom: 10 }}>
          Deleting this program takes its {program.sessions.length} session
          {program.sessions.length === 1 ? '' : 's'} and {videos.length} video
          {videos.length === 1 ? '' : 's'} with it. The rows cascade; there is no undo.
        </p>
        <button className="btn" type="button" disabled={pending}
          onClick={() => {
            const label = program.title_t.en || 'this program';
            if (confirm(`Delete "${label}", its ${program.sessions.length} sessions and ${videos.length} videos? This cannot be undone.`)) {
              run(() => deleteProgram(program.id), () => router.push('/admin'));
            }
          }}>
          Delete this program
        </button>
      </section>
    </>
  );
}
