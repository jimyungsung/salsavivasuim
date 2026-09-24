'use client';

/* One program: its sessions, and the details beside them.

   The sessions come first because that is the work — and each one shows its
   running order as a strip, so a program's shape (which sessions are filmed,
   which steps each uses) is visible without opening them one by one. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import PublishSwitch, { publishMeaning } from '../../PublishSwitch';
import StepStrip from '../../StepStrip';
import {
  createSession,
  deleteProgram,
  deleteSession,
  movePosition,
  setProgramFields,
  setStatus,
  type Result,
} from '../../actions';
import { LEVEL_KEYS, mmss, sessionLength, untranslated } from '@/lib/db';
import type { EditorProgram } from './page';

const two = (n: number) => String(n).padStart(2, '0');

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
      <Crumbs
        items={[
          ...(program.area ? [{ label: program.area.name_t.en, href: `/admin/areas/${program.area.id}` }] : []),
          { label: program.title_t.en || 'Untitled program' },
        ]}
      />

      <div className="head">
        <div>
          <h1>{program.title_t.en || 'Untitled program'}</h1>
          <p>
            {program.subtitle_t.en || 'No subtitle yet'} · {program.sessions.length} session
            {program.sessions.length === 1 ? '' : 's'} · {videos.length} videos · {ready} with footage
          </p>
        </div>
        <div className="acts">
          <Link className="btn" href={`/programs/${program.slug}`} target="_blank">
            Preview on the site ↗
          </Link>
        </div>
      </div>

      {error && <p className="banner">{error}</p>}

      <div className="editor">
        <div>
          <section className="panel">
            <div className="ph">
              <h2>Sessions</h2>
              <span className="aside-note">Each bar is a session&rsquo;s running order, coloured by step.</span>
            </div>

            {program.sessions.length === 0 ? (
              <p className="empty">No sessions yet.</p>
            ) : (
              program.sessions.map((s, i) => {
                const n = s.videos.length;
                const filmed = s.videos.filter(v => v.status === 'ready').length;
                return (
                  <div className="srow" key={s.id}>
                    <span className="sn">{two(s.position)}</span>
                    <span>
                      <Link className="name" href={`/admin/sessions/${s.id}`}>
                        {s.title_t.en || 'Untitled session'}
                      </Link>{' '}
                      {untranslated(s.title_t) && <span className="chip ko">needs KO</span>}
                      <br />
                      <span className="vids">
                        {n === 0 ? 'No videos' : `${n} video${n === 1 ? '' : 's'} · ${mmss(sessionLength(s.videos))} · ${filmed} with footage`}
                      </span>
                    </span>
                    <StepStrip videos={s.videos} hrefFor={() => `/admin/sessions/${s.id}`} />
                    <span className="end">
                      <span className={`chip ${s.status}`} title={publishMeaning(s.status)}>{s.status}</span>
                      <button className="btn icon" type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('sessions', s.id, 'up'))} aria-label="Move earlier" title="Move earlier">↑</button>
                      <button className="btn icon" type="button" disabled={pending || i === program.sessions.length - 1} onClick={() => run(() => movePosition('sessions', s.id, 'down'))} aria-label="Move later" title="Move later">↓</button>
                      <button
                        className="btn icon danger"
                        type="button"
                        disabled={pending}
                        aria-label="Delete session"
                        title="Delete session"
                        onClick={() => {
                          if (confirm(`Delete session "${s.title_t.en || 'Untitled'}"${n ? ` and its ${n} video${n === 1 ? '' : 's'}` : ''}? This cannot be undone.`)) {
                            run(() => deleteSession(s.id));
                          }
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                );
              })
            )}
            <div className="addbar">
              <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => createSession(program.id))}>
                + Add a session
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Danger</h2>
            <p className="hint" style={{ fontSize: 14, margin: '0 0 12px' }}>
              Deleting this program takes its {program.sessions.length} session
              {program.sessions.length === 1 ? '' : 's'} and {videos.length} video
              {videos.length === 1 ? '' : 's'} with it. The rows cascade; there is no undo.
            </p>
            <button
              className="btn danger"
              type="button"
              disabled={pending}
              onClick={() => {
                const label = program.title_t.en || 'this program';
                if (confirm(`Delete "${label}", its ${program.sessions.length} sessions and ${videos.length} videos? This cannot be undone.`)) {
                  run(() => deleteProgram(program.id), () => router.push('/admin'));
                }
              }}
            >
              Delete this program
            </button>
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>Publish</h2>
            <PublishSwitch value={program.status} disabled={pending} onChange={next => run(() => setStatus('programs', program.id, next))} />
            <p className="hint" style={{ margin: '12px 0 0' }}>
              {publishMeaning(program.status)}.{' '}
              {program.published_at ? `First opened ${new Date(program.published_at).toLocaleDateString()}.` : 'Never opened yet.'}
            </p>
          </section>

          <section className="panel">
            <h2>Copy</h2>
            <LocalizedField stacked table="programs" id={program.id} column="title_t" label="Title" value={program.title_t} onError={setError} />
            <LocalizedField stacked table="programs" id={program.id} column="subtitle_t" label="Subtitle" value={program.subtitle_t} onError={setError} />
            <LocalizedField stacked table="programs" id={program.id} column="promise_t" label="Promise" value={program.promise_t} multiline onError={setError} />
          </section>

          <section className="panel">
            <h2>Shape</h2>
            <div className="fields">
              <div className="fieldset">
                <span className="lf-label">Level</span>
                <select className="field" value={program.level} disabled={pending} onChange={e => run(() => setProgramFields(program.id, { level: e.target.value }))}>
                  {LEVEL_KEYS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="fieldset">
                <span className="lf-label">Weeks</span>
                <input className="num" value={weeks} disabled={pending} inputMode="numeric"
                  onChange={e => setWeeks(e.target.value)}
                  onBlur={() => {
                    const n = weeks.trim() ? Number(weeks) : null;
                    if (n !== program.weeks) run(() => setProgramFields(program.id, { weeks: n }));
                  }} placeholder="—" />
              </div>
            </div>
            <p className="hint" style={{ margin: '8px 0 16px' }}>
              The level describes the material, not the dancer. The session count is counted, never stored.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14.5, marginBottom: 4 }}>
              <input type="checkbox" checked={program.is_free} disabled={pending}
                onChange={e => run(() => setProgramFields(program.id, { is_free: e.target.checked }))} />
              Stays free when the paid tier lands
            </label>
            <p className="hint" style={{ margin: '0 0 16px' }}>Everything is free today; this marks the sample that stays.</p>

            <div className="fieldset" style={{ maxWidth: 'none' }}>
              <span className="lf-label">Slug</span>
              <input className="num" style={{ width: '100%' }} value={slug} disabled={pending}
                onChange={e => setSlug(e.target.value)}
                onBlur={() => slug !== program.slug && run(() => setProgramFields(program.id, { slug }))} />
              <span className="hint">The address on the site: /programs/{program.slug}. Changing it breaks links already shared.</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
