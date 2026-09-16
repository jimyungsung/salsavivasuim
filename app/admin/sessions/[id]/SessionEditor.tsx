'use client';

/* One session: its copy, and the ordered list of videos inside it.

   The list is the point. A session is however many videos it needs, each tagged
   with one of the six method steps — there are no six slots here, nothing is
   pre-created, and a step may appear any number of times including none. "Add
   video" asks which step, appends it at the end, and reordering is what decides
   the running order. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import LocalizedField from '../../LocalizedField';
import { createVideo, deleteVideo, movePosition, setStatus, type Result } from '../../actions';
import {
  METHOD_STEPS,
  PUBLISH_STATUSES,
  mmss,
  sessionLength,
  untranslated,
  type MethodStep,
  type VideoRow,
} from '@/lib/db';
import type { EditorSession } from './page';

export default function SessionEditor({
  session,
  videos,
}: {
  session: EditorSession;
  videos: VideoRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.ok ? null : result.error);
    });

  const ready = videos.filter(v => v.status === 'ready').length;
  const present = [...new Set(videos.map(v => v.step))];

  return (
    <>
      <div className="crumb-row">
        <Link href="/admin">← Catalogue</Link>
      </div>

      <div className="head">
        <div>
          <h1>
            {String(session.position).padStart(2, '0')} ·{' '}
            {session.title_t.en || 'Untitled session'}
          </h1>
          <p>
            {session.program?.title_t.en}
            {session.program?.subtitle_t.en ? ` · ${session.program.subtitle_t.en}` : ''}
          </p>
        </div>
        <div className="tally">
          <span>
            <b>{videos.length}</b>videos
          </span>
          <span>
            <b>{ready}</b>with footage
          </span>
          <span>
            <b>{mmss(sessionLength(videos))}</b>running time
          </span>
          <span>
            <b>{present.length}</b>steps used
          </span>
        </div>
      </div>

      {error && (
        <p className="chip warn" style={{ display: 'block', marginBottom: 14, padding: '10px 12px' }}>
          {error}
        </p>
      )}

      <section className="panel">
        <h2>The session</h2>
        <LocalizedField table="sessions" id={session.id} column="title_t" label="Title" value={session.title_t} onError={setError} />
        <LocalizedField table="sessions" id={session.id} column="outcome_t" label="Outcome" value={session.outcome_t} multiline onError={setError} />
        <LocalizedField table="sessions" id={session.id} column="focus_t" label="Focus" value={session.focus_t} onError={setError} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bo-dim)' }}>
            Status
          </span>
          <select
            className="status"
            value={session.status}
            disabled={pending}
            aria-label="Publish status"
            onChange={e => {
              const next = e.target.value;
              run(() => setStatus('sessions', session.id, next));
            }}
          >
            {PUBLISH_STATUSES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: 'var(--bo-dim)' }}>
            Members only ever see <code>open</code> sessions of <code>open</code> programs.
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Videos, in order</h2>

        {videos.length === 0 ? (
          <p className="empty" style={{ padding: '4px 0 12px' }}>
            No videos yet. Add the first one below — any step, in any order.
          </p>
        ) : (
          videos.map((video, i) => (
            <div className="vid" key={video.id}>
              {/* Numbered by place in the list, not by `position`. Positions only
                  have to be unique and ordered — deleting a video leaves a gap,
                  which is harmless for sorting but would read as a bug on screen. */}
              <span className="pos">{String(i + 1).padStart(2, '0')}</span>

              <span className={`chip ${video.is_drillable ? 'open' : ''}`} title={video.is_drillable ? 'Drillable — can go in a member drill' : undefined}>
                {video.step}
              </span>

              <span>
                <span className={`title ${video.title_t.en ? '' : 'blank'}`}>
                  {video.title_t.en || 'Untitled video'}
                </span>
                <span className="sub">
                  {mmss(video.duration_ms)} · {video.status}
                  {video.mirror_default && ' · opens mirrored'}
                  {video.bpm ? ` · ${video.bpm} bpm` : ' · no beat grid'}
                  {untranslated(video.title_t) && ' · needs KO'}
                </span>
              </span>

              <span className="acts">
                <Link className="btn tiny" href={`/admin/videos/${video.id}`}>
                  Edit
                </Link>
                <button className="btn tiny" type="button" disabled={pending || i === 0} onClick={() => run(() => movePosition('videos', video.id, 'up'))} aria-label="Move up">
                  ↑
                </button>
                <button className="btn tiny" type="button" disabled={pending || i === videos.length - 1} onClick={() => run(() => movePosition('videos', video.id, 'down'))} aria-label="Move down">
                  ↓
                </button>
                <button
                  className="btn tiny"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Remove "${video.title_t.en || 'Untitled video'}" from this session?`)) {
                      run(() => deleteVideo(video.id, session.id));
                    }
                  }}
                >
                  Remove
                </button>
              </span>
            </div>
          ))
        )}

        <AddVideo sessionId={session.id} disabled={pending} onRun={run} />
      </section>

      <div className="note">
        <b>Uploading is not wired up yet.</b>
        Adding a video creates its row and its place in the session; the footage itself needs
        the video host decided — Cloudflare Stream, Bunny or Mux. Until then every video stays{' '}
        <code>uploading</code>, which is why members see none of them.
      </div>
    </>
  );
}

/* The step picker suggests the method's order, which is only ever a suggestion:
   whatever you pick is appended at the end and moved with the arrows. */
function AddVideo({
  sessionId,
  disabled,
  onRun,
}: {
  sessionId: string;
  disabled: boolean;
  onRun: (fn: () => Promise<Result>) => void;
}) {
  const [step, setStep] = useState<MethodStep>('watch');

  return (
    <div className="addbar">
      <span>Add a video for</span>
      <select className="step" style={{ width: 'auto' }} value={step} disabled={disabled} onChange={e => setStep(e.target.value as MethodStep)} aria-label="Method step">
        {METHOD_STEPS.map(s => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button className="btn" type="button" disabled={disabled} onClick={() => onRun(() => createVideo(sessionId, step))}>
        + Add
      </button>
    </div>
  );
}
