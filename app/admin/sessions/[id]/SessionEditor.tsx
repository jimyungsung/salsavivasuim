'use client';

/* One session: its running order, and the details beside it.

   The running order is the point, so it comes first and is drawn, not listed:
   a strip of the session's videos in order, coloured by method step and sized
   by length, with a legend of which steps it uses. Under it, one card per video.

   A session is however many videos it needs, each tagged with one of the six
   steps — there are no six slots, nothing is pre-created, and a step may appear
   any number of times including none. The add buttons append a video of that
   step at the end; the arrows decide the running order. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import PublishSwitch from '../../PublishSwitch';
import StepStrip, { STATUS_WORDS, StepLegend } from '../../StepStrip';
import {
  createVideo,
  deleteVideo,
  movePosition,
  setStatus,
  setVideoFields,
  type Result,
} from '../../actions';
import { stepOf } from '@/lib/content';
import { METHOD_STEPS, mmss, sessionLength, untranslated, type MethodStep, type VideoRow } from '@/lib/db';
import type { EditorSession } from './page';

const two = (n: number) => String(n).padStart(2, '0');

export default function SessionEditor({
  session,
  videos,
  posters,
}: {
  session: EditorSession;
  videos: VideoRow[];
  posters: Record<string, string>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.ok ? null : result.error);
    });

  const ready = videos.filter(v => v.status === 'ready');
  const program = session.program;
  const title = session.title_t.en || 'Untitled session';

  return (
    <>
      <Crumbs
        items={[
          ...(program?.area ? [{ label: program.area.name_t.en, href: `/admin/areas/${program.area.id}` }] : []),
          ...(program ? [{ label: program.title_t.en, href: `/admin/programs/${program.id}` }] : []),
          { label: `Session ${two(session.position)}` },
        ]}
      />

      <div className="head">
        <div>
          <h1>
            {two(session.position)} · {title}
          </h1>
          <p>
            {program?.title_t.en}
            {program?.subtitle_t.en ? ` · ${program.subtitle_t.en}` : ''}
          </p>
        </div>
        <div className="acts">
          <Link className="btn" href={`/sessions/${session.id}`} target="_blank">
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
              <span className="aside-note">
                {videos.length} video{videos.length === 1 ? '' : 's'} · {mmss(sessionLength(videos))} ·{' '}
                {ready.length} with footage
              </span>
            </div>

            <StepStrip videos={videos} size="large" hrefFor={id => `#v-${id}`} />
            <StepLegend videos={videos} />
          </section>

          <section className="panel">
            <div className="ph">
              <h2>Videos</h2>
              <span className="aside-note">Members watch them top to bottom.</span>
            </div>

            {videos.length === 0 ? (
              <p className="empty">No videos yet. Add the first one below — any step, in any order.</p>
            ) : (
              <div className="vlist">
                {videos.map((video, i) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    number={i + 1}
                    poster={posters[video.id]}
                    first={i === 0}
                    last={i === videos.length - 1}
                    pending={pending}
                    onRun={run}
                    sessionId={session.id}
                  />
                ))}
              </div>
            )}

            <div className="addsteps">
              <p>Add a video to the end of the session — pick what it is for:</p>
              <div className="row">
                {METHOD_STEPS.map(k => (
                  <button
                    key={k}
                    className="addstep"
                    type="button"
                    data-step={k}
                    disabled={pending}
                    title={stepOf(k).description.en}
                    onClick={() => run(() => createVideo(session.id, k))}
                  >
                    <b>{stepOf(k).name.en}</b>
                    <span>{stepOf(k).shortName.en}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>Publish</h2>
            <PublishSwitch value={session.status} disabled={pending} onChange={next => run(() => setStatus('sessions', session.id, next))} />
            <Readiness session={session} videos={videos} />
          </section>

          <section className="panel">
            <h2>The session</h2>
            <LocalizedField stacked table="sessions" id={session.id} column="title_t" label="Title" value={session.title_t} onError={setError} />
            <LocalizedField stacked table="sessions" id={session.id} column="outcome_t" label="Outcome" value={session.outcome_t} multiline onError={setError} />
            <LocalizedField stacked table="sessions" id={session.id} column="focus_t" label="Focus" value={session.focus_t} onError={setError} />
          </section>
        </div>
      </div>
    </>
  );
}

function VideoCard({
  video,
  number,
  poster,
  first,
  last,
  pending,
  onRun,
  sessionId,
}: {
  video: VideoRow;
  number: number;
  poster?: string;
  first: boolean;
  last: boolean;
  pending: boolean;
  onRun: (fn: () => Promise<Result>) => void;
  sessionId: string;
}) {
  const needsFootage = video.status === 'uploading' || video.status === 'failed';

  return (
    <article className="vcard" id={`v-${video.id}`} data-step={video.step}>
      {/* Numbered by place in the list, not by `position`, which may have gaps. */}
      <span className="vnum">{two(number)}</span>

      <Link className="vthumb" href={`/admin/videos/${video.id}`} tabIndex={-1} aria-hidden="true">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" />
        ) : (
          <span>{STATUS_WORDS[video.status]}</span>
        )}
        {video.duration_ms ? <span className="len">{mmss(video.duration_ms)}</span> : null}
      </Link>

      <div className="vbody">
        <div className="vtop">
          <select
            className="stepsel"
            data-step={video.step}
            value={video.step}
            disabled={pending}
            aria-label="Method step"
            title={stepOf(video.step).description.en}
            onChange={e => onRun(() => setVideoFields(video.id, { step: e.target.value as MethodStep }))}
          >
            {METHOD_STEPS.map(s => (
              <option key={s} value={s}>
                {stepOf(s).name.en}
              </option>
            ))}
          </select>
          <span className="vstatus" data-status={video.status}>
            {STATUS_WORDS[video.status]}
          </span>
        </div>
        <Link className={`vtitle ${video.title_t.en ? '' : 'blank'}`} href={`/admin/videos/${video.id}`}>
          {video.title_t.en || 'Untitled video'}
        </Link>
        <div className="vmeta">
          <span>{video.is_drillable ? 'Drillable' : 'Not drillable'}</span>
          <span>{video.angle} camera</span>
          {video.mirror_default && <span>Opens mirrored</span>}
          <span>{video.bpm ? `${video.bpm} bpm` : 'No beat grid'}</span>
          {untranslated(video.title_t, video.description_t) && <span className="chip ko">needs KO</span>}
        </div>

        <div className="vacts">
        <Link className={`btn ${needsFootage ? 'lime' : 'primary'}`} href={`/admin/videos/${video.id}`}>
          {needsFootage ? 'Upload footage' : 'Edit'}
        </Link>
        <button className="btn icon" type="button" disabled={pending || first} onClick={() => onRun(() => movePosition('videos', video.id, 'up'))} aria-label="Move earlier" title="Move earlier">
          ↑
        </button>
        <button className="btn icon" type="button" disabled={pending || last} onClick={() => onRun(() => movePosition('videos', video.id, 'down'))} aria-label="Move later" title="Move later">
          ↓
        </button>
        <button
          className="btn icon danger"
          type="button"
          disabled={pending}
          aria-label="Remove from session"
          title="Remove from session"
          onClick={() => {
            if (confirm(`Remove "${video.title_t.en || 'Untitled video'}" from this session?`)) {
              onRun(() => deleteVideo(video.id, sessionId));
            }
          }}
        >
          ✕
        </button>
        </div>
      </div>
    </article>
  );
}

/* What stands between this session and a member watching it, in plain words.
   RLS decides the real answer; this only reads the same facts back. */
function Readiness({ session, videos }: { session: EditorSession; videos: VideoRow[] }) {
  const ready = videos.filter(v => v.status === 'ready');
  const noFootage = videos.filter(v => v.status !== 'ready');
  const untitled = videos.filter(v => !v.title_t.en.trim());
  const needKo =
    [session.title_t, session.outcome_t, session.focus_t].filter(t => untranslated(t)).length +
    videos.filter(v => untranslated(v.title_t)).length;
  const gridded = videos.filter(v => v.bpm).length;
  const programOpen = session.program?.status === 'open';
  const visible = session.status === 'open' && programOpen && ready.length > 0;

  const items: { ok: boolean; text: string; small?: string }[] = [
    { ok: videos.length > 0, text: videos.length ? `${videos.length} videos in the running order` : 'No videos yet' },
    {
      ok: videos.length > 0 && noFootage.length === 0,
      text: `${ready.length} of ${videos.length} have footage`,
      small: noFootage.length ? `Members only see videos marked Ready.` : undefined,
    },
    { ok: untitled.length === 0, text: untitled.length ? `${untitled.length} video${untitled.length === 1 ? '' : 's'} without a title` : 'Every video has a title' },
    { ok: needKo === 0, text: needKo ? `${needKo} field${needKo === 1 ? '' : 's'} still need Korean` : 'English and Korean complete' },
    {
      ok: videos.length > 0 && gridded === videos.length,
      text: `${gridded} of ${videos.length} have a beat grid`,
      small: 'Counts, phrase marks and "loop eight counts" need one.',
    },
    {
      ok: programOpen,
      text: programOpen ? 'The program is open' : `The program is ${session.program?.status ?? 'missing'}`,
      small: programOpen ? undefined : 'A session only shows when its program is open too.',
    },
  ];

  return (
    <>
      <ul className="checklist" style={{ marginTop: 18 }}>
        {items.map(item => (
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
          ? `Members can watch this session now — ${ready.length} video${ready.length === 1 ? '' : 's'}.`
          : session.status !== 'open'
            ? `Members cannot see this session: it is ${session.status}.`
            : !programOpen
              ? 'Members cannot see this session until its program is open.'
              : 'Members see the session, but no video is ready to play yet.'}
      </p>
    </>
  );
}
