'use client';

/* The media library: every clip in one place. Drop files here and each one
   becomes an exercise named after the file, uploading straight to Cloudflare
   (browser → CDN, by tus, in chunks; never through Vercel). Rename in place,
   delete, or open the editor for tags, difficulty, publish and the beat grid.

   Uploads here are simple on purpose: several at once, a progress bar each,
   no pause and no resume across a reload. The editor's upload box still has
   those for one big file that keeps dropping.

   Tick several cards and the bar above them edits them together: a tag on or
   off, a difficulty, mirror, open or draft. That is the bulk of setting up a
   day's filming, done once instead of clip by clip. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import * as tus from 'tus-js-client';
import Crumbs from '../Crumbs';
import { STATUS_WORDS } from '../LengthStrip';
import { bulkVideos, createExercise, deleteExercise, refreshVideoStatus, requestUploadUrl, setLocalized, type Result } from '../actions';
import { EXERCISE_TAGS, LEVEL_KEYS, mmss, type ExerciseTag } from '@/lib/db';
import { LEVEL_LABELS, TAG_LABELS } from '@/lib/i18n';
import type { ListVideo } from './page';

const CHUNK = 50 * 1024 * 1024;
const MB = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);

/** "shoulder-rolls_v2.mp4" → "Shoulder rolls v2". */
const titleOf = (name: string) =>
  name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase()) || 'Untitled';

interface Job {
  key: number;
  /** The exercise the file became, once it exists. */
  id?: string;
  name: string;
  sent: number;
  total: number;
  state: 'creating' | 'uploading' | 'encoding' | 'done' | 'failed';
  error?: string;
}

type Footage = 'all' | 'ready' | 'missing' | 'draft';

/* Cloudflare's webhook flips a clip to ready, but the page does not hear it.
   While anything is still encoding, ask every so often, for a while. */
const POLL_MS = 10_000;
const POLL_FOR_MS = 15 * 60_000;

export default function MediaLibrary({
  videos,
  posters,
  streamConfigured,
}: {
  videos: ListVideo[];
  posters: Record<string, string>;
  streamConfigured: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const [pending, start] = useTransition();
  const [tag, setTag] = useState<ExerciseTag | 'all' | 'none'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [footage, setFootage] = useState<Footage>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      videos.filter(
        v =>
          (tag === 'all' || (tag === 'none' ? v.tags.length === 0 : v.tags.includes(tag))) &&
          (footage === 'all' ||
            (footage === 'ready' ? v.status === 'ready' : footage === 'draft' ? v.publish !== 'open' : v.status !== 'ready')) &&
          (!q || v.title_t.en.toLowerCase().includes(q) || (v.title_t.ko ?? '').toLowerCase().includes(q)),
      ),
    [videos, tag, footage, q],
  );

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.ok ? null : result.error);
    });

  /* Selection outlives a filter change but not a clip's deletion. */
  const ids = useMemo(() => new Set(videos.map(v => v.id)), [videos]);
  const picked = [...selected].filter(id => ids.has(id));
  const pick = (id: string) =>
    setSelected(s => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const bulk = (change: Parameters<typeof bulkVideos>[1]) => run(() => bulkVideos(picked, change));

  const encoding = videos.filter(v => v.status === 'processing').map(v => v.id);
  const encodingKey = encoding.join(',');
  useEffect(() => {
    const waiting = encodingKey ? encodingKey.split(',') : [];
    if (!waiting.length) return;
    const until = Date.now() + POLL_FOR_MS;
    const timer = setInterval(async () => {
      if (Date.now() > until) return clearInterval(timer);
      await Promise.all(waiting.map(id => refreshVideoStatus(id)));
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [encodingKey, router]);

  const patch = (key: number, next: Partial<Job>) =>
    setJobs(js => js.map(j => (j.key === key ? { ...j, ...next } : j)));

  /* One file: a draft exercise, an upload URL, the upload, then a status
     check so the row says "encoding" rather than waiting on the webhook. */
  async function sendOne(file: File, key: number) {
    const created = await createExercise(titleOf(file.name));
    if (!created.ok || !created.id) {
      patch(key, { state: 'failed', error: created.ok ? 'No id came back.' : created.error });
      return;
    }
    const id = created.id;
    patch(key, { id });
    const ticket = await requestUploadUrl(id, window.location.origin, file.size);
    if (!ticket.ok) {
      patch(key, { state: 'failed', error: ticket.error });
      return;
    }
    patch(key, { state: 'uploading' });
    const outcome = await new Promise<string | null>(resolve => {
      new tus.Upload(file, {
        uploadUrl: ticket.uploadURL,
        chunkSize: CHUNK,
        retryDelays: [0, 1000, 3000, 5000, 10000, 15000],
        storeFingerprintForResuming: false,
        onProgress: (sent, total) => patch(key, { sent, total }),
        onSuccess: () => resolve(null),
        onError: err => resolve(err.message.split('\n')[0]),
      }).start();
    });
    if (outcome) {
      patch(key, { state: 'failed', error: `The upload stopped: ${outcome}. Open the exercise to try again.` });
      return;
    }
    /* Uploaded: Cloudflare encodes from here. The row reads "encoding" until
       the poll above sees it ready. */
    patch(key, { state: 'encoding' });
    await refreshVideoStatus(id);
    router.refresh();
  }

  function send(files: FileList | File[]) {
    const list = [...files].filter(f => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name));
    if (list.length === 0) return;
    const base = Date.now();
    setJobs(js => [...js, ...list.map((f, i) => ({ key: base + i, name: f.name, sent: 0, total: f.size, state: 'creating' as const }))]);
    /* Two at a time: enough to keep the line busy, not enough to trip it. */
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        await sendOne(list[i], base + i);
      }
    };
    void Promise.all([worker(), worker()]);
    if (input.current) input.current.value = '';
  }

  const ready = videos.filter(v => v.status === 'ready').length;
  const open = videos.filter(v => v.publish === 'open' && v.status === 'ready').length;
  const busy = jobs.some(j => j.state === 'creating' || j.state === 'uploading' || j.state === 'encoding');

  return (
    <>
      <Crumbs items={[{ label: 'Media library' }]} />

      <div className="head">
        <div>
          <h1>Media library</h1>
          <p>Every clip, once. An exercise is one clip: drop it here, name it, tag it, open it to members.</p>
        </div>
        <div className="tally">
          <span><b>{videos.length}</b>clips</span>
          <span><b>{ready}</b>with footage</span>
          <span><b>{open}</b>open to members</span>
        </div>
      </div>

      {error && <p className="banner">{error}</p>}

      {streamConfigured ? (
        <div
          className={`dropzone${over ? ' over' : ''}`}
          onDragOver={e => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault();
            setOver(false);
            send(e.dataTransfer.files);
          }}
        >
          <input ref={input} type="file" accept="video/*" multiple hidden onChange={e => e.target.files && send(e.target.files)} />
          <div>
            <b>Drop videos here</b>
            <span>Each file becomes an exercise named after the file. Any size; several at once.</span>
          </div>
          <button className="btn primary" type="button" onClick={() => input.current?.click()}>
            Choose files
          </button>
        </div>
      ) : (
        <div className="note">
          <b>Cloudflare Stream is not configured.</b>
          Set <code>CLOUDFLARE_ACCOUNT_ID</code> and <code>CLOUDFLARE_STREAM_API_TOKEN</code>, then this becomes an upload box.
        </div>
      )}

      {jobs.length > 0 && (
        <div className="uplist">
          {jobs.map(j => {
            const pct = j.total ? Math.floor((j.sent / j.total) * 100) : 0;
            if (j.state === 'encoding' && j.id && videos.find(v => v.id === j.id)?.status === 'ready') j = { ...j, state: 'done' };
            return (
              <div className={`uprow ${j.state}`} key={j.key}>
                <span className="nm">{j.name}</span>
                <span className="st">
                  {j.state === 'creating' && 'Starting…'}
                  {j.state === 'uploading' && `${pct}% · ${MB(j.sent)} of ${MB(j.total)} MB`}
                  {j.state === 'encoding' && 'Uploaded · Cloudflare is encoding (this page checks every few seconds)'}
                  {j.state === 'done' && 'Ready'}
                  {j.state === 'failed' && (j.error ?? 'Failed')}
                </span>
                <i style={{ width: `${j.state === 'done' || j.state === 'encoding' ? 100 : pct}%` }} />
              </div>
            );
          })}
          {!busy && (
            <button className="btn tiny" type="button" onClick={() => setJobs([])} style={{ alignSelf: 'flex-start' }}>
              Clear
            </button>
          )}
        </div>
      )}

      <section className="panel">
        <div className="filters">
          <input type="search" className="num" style={{ width: '26ch' }} placeholder="Search" aria-label="Search clips" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="levels">
            {(['all', 'ready', 'missing', 'draft'] as Footage[]).map(f => (
              <button key={f} type="button" className={`chip${footage === f ? ' open' : ''}`} aria-pressed={footage === f} onClick={() => setFootage(f)}>
                {f === 'all' ? 'Any footage' : f === 'ready' ? 'With footage' : f === 'missing' ? 'Needs footage' : 'Draft'}
              </button>
            ))}
          </div>
          <div className="levels">
            <button type="button" className={`chip${tag === 'all' ? ' open' : ''}`} aria-pressed={tag === 'all'} onClick={() => setTag('all')}>All tags</button>
            <button type="button" className={`chip${tag === 'none' ? ' open' : ''}`} aria-pressed={tag === 'none'} onClick={() => setTag('none')}>No tags</button>
            {EXERCISE_TAGS.map(t => (
              <button key={t} type="button" className={`chip${tag === t ? ' open' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
                {TAG_LABELS[t].en}
              </button>
            ))}
          </div>
        </div>

        {shown.length > 0 && (
          <div className="selbar">
            <label>
              <input
                type="checkbox"
                checked={shown.every(v => selected.has(v.id))}
                onChange={e =>
                  setSelected(s => {
                    const next = new Set(s);
                    for (const v of shown) e.target.checked ? next.add(v.id) : next.delete(v.id);
                    return next;
                  })
                }
              />
              {picked.length ? `${picked.length} selected` : 'Select all shown'}
            </label>
            {picked.length > 0 && (
              <>
                <select className="status" value="" disabled={pending} aria-label="Add a tag" onChange={e => e.target.value && bulk({ addTag: e.target.value })}>
                  <option value="">+ Tag</option>
                  {EXERCISE_TAGS.map(t => <option key={t} value={t}>{TAG_LABELS[t].en}</option>)}
                </select>
                <select className="status" value="" disabled={pending} aria-label="Remove a tag" onChange={e => e.target.value && bulk({ removeTag: e.target.value })}>
                  <option value="">− Tag</option>
                  {EXERCISE_TAGS.map(t => <option key={t} value={t}>{TAG_LABELS[t].en}</option>)}
                </select>
                <select className="status" value="" disabled={pending} aria-label="Difficulty" onChange={e => e.target.value && bulk({ difficulty: e.target.value })}>
                  <option value="">Difficulty</option>
                  {LEVEL_KEYS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l].en}</option>)}
                </select>
                <select className="status" value="" disabled={pending} aria-label="Mirror" onChange={e => e.target.value && bulk({ mirror_default: e.target.value === 'on' })}>
                  <option value="">Mirror</option>
                  <option value="on">Opens mirrored</option>
                  <option value="off">Not mirrored</option>
                </select>
                <button className="btn tiny primary" type="button" disabled={pending} title="Only clips with finished footage open" onClick={() => bulk({ publish: 'open' })}>Open</button>
                <button className="btn tiny" type="button" disabled={pending} onClick={() => bulk({ publish: 'draft' })}>Draft</button>
                <button className="btn tiny ghost" type="button" onClick={() => setSelected(new Set())}>Clear</button>
              </>
            )}
          </div>
        )}

        {videos.length === 0 ? (
          <p className="empty">Nothing here yet. Drop a video above.</p>
        ) : shown.length === 0 ? (
          <p className="empty">Nothing matches.</p>
        ) : (
          <div className="media">
            {shown.map(v => (
              <MediaCard key={v.id} video={v} poster={posters[v.id]} pending={pending} onRun={run} picked={selected.has(v.id)} onPick={() => pick(v.id)} />
            ))}
          </div>
        )}

        <p className="hint" style={{ marginTop: 14 }}>
          Need an exercise before the footage exists?{' '}
          <button type="button" className="linkish" disabled={pending} onClick={() => {
            const en = prompt('Title of the new exercise, in English');
            if (en?.trim()) start(async () => {
              const r = await createExercise(en);
              if (r.ok && r.id) router.push(`/admin/exercises/${r.id}`);
              else if (!r.ok) setError(r.error);
            });
          }}>
            Add one without footage
          </button>
          .
        </p>
      </section>
    </>
  );
}

function MediaCard({
  video: v,
  poster,
  pending,
  onRun,
  picked,
  onPick,
}: {
  video: ListVideo;
  poster?: string;
  pending: boolean;
  onRun: (fn: () => Promise<Result>) => void;
  picked: boolean;
  onPick: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(v.title_t.en);
  const save = () => {
    setEditing(false);
    const en = title.trim();
    if (!en || en === v.title_t.en) {
      setTitle(v.title_t.en);
      return;
    }
    onRun(() => setLocalized('videos', v.id, 'title_t', { en, ko: v.title_t.ko ?? '' }));
  };
  const trouble = v.status !== 'ready' ? STATUS_WORDS[v.status] : v.publish !== 'open' ? `Not open (${v.publish})` : null;

  return (
    <article className={`mcard${picked ? ' picked' : ''}`}>
      <input className="mpick" type="checkbox" checked={picked} onChange={onPick} aria-label={`Select ${v.title_t.en || 'Untitled'}`} />
      <Link className="mthumb" href={`/admin/exercises/${v.id}`} tabIndex={-1} aria-hidden="true">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" loading="lazy" />
        ) : (
          <span>{STATUS_WORDS[v.status]}</span>
        )}
        {v.duration_ms ? <span className="len">{mmss(v.duration_ms)}</span> : null}
        {trouble && <span className="flag">{trouble}</span>}
      </Link>

      <div className="mbody">
        {editing ? (
          <input
            className="rename"
            value={title}
            autoFocus
            maxLength={120}
            onChange={e => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={e => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') {
                setTitle(v.title_t.en);
                setEditing(false);
              }
            }}
            aria-label="Title"
          />
        ) : (
          <button type="button" className="mtitle" title="Rename" onClick={() => setEditing(true)}>
            {v.title_t.en || 'Untitled'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          </button>
        )}
        <p className="mmeta">
          {v.tags.length ? v.tags.map(t => TAG_LABELS[t as ExerciseTag]?.en ?? t).join(' · ') : 'No tags yet'} · {LEVEL_LABELS[v.difficulty].en}
          {v.uses > 0 && ` · in ${v.uses} routine${v.uses === 1 ? '' : 's'}`}
        </p>
        <div className="macts">
          <Link className="btn tiny" href={`/admin/exercises/${v.id}`}>Edit</Link>
          <button
            className="btn tiny danger"
            type="button"
            disabled={pending || v.uses > 0}
            title={v.uses > 0 ? 'Take it out of its routines first.' : 'Delete this clip and its footage'}
            onClick={() => {
              if (confirm(`Delete "${v.title_t.en || 'Untitled'}"${v.status === 'ready' ? ' and its footage on Cloudflare' : ''}? This cannot be undone.`)) {
                onRun(() => deleteExercise(v.id));
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
