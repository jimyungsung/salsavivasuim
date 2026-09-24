'use client';

/* One video: its copy, how it was filmed, and its beat grid.

   The beat grid is the part that matters. Three numbers — bpm, first_beat_ms
   and beats_per_phrase — are the whole source of the counts overlay, the
   snap-to-eights loop, the count-in and the ticks on the scrub bar. Nothing
   about counts is ever hand-drawn, so filling these in correctly here is what
   makes the player a dance player rather than a video player.

   Tap tempo and the click-track preview need real footage to be worth anything,
   so they arrive with the upload flow. What is here now is the data itself,
   with the derived numbers shown so a wrong BPM is visible immediately. */

import Link from 'next/link';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import StepStrip, { type StripVideo } from '../../StepStrip';
import UploadField from './UploadField';
import { setVideoFields, type Result } from '../../actions';
import { stepOf } from '@/lib/content';
import { METHOD_STEPS, mmss, type MethodStep } from '@/lib/db';
import type { EditorVideo } from './page';

const two = (n: number) => String(n).padStart(2, '0');


const toNum = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function VideoEditor({
  video,
  streamConfigured,
  posterUrl,
  siblings,
}: {
  video: EditorVideo;
  streamConfigured: boolean;
  /** Signed on the server. videos.poster_url is unsigned and answers 401. */
  posterUrl: string | null;
  /** Every video in this session, in order — this one included. */
  siblings: StripVideo[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  /* Decided once, on arrival: re-deciding on every save would fold the panel
     shut under the cursor the moment its last value is cleared. */
  const [gridOpen] = useState(
    () => video.bpm != null || video.default_loop_start_ms != null || video.default_loop_end_ms != null,
  );

  const [bpm, setBpm] = useState(video.bpm?.toString() ?? '');
  const [firstBeat, setFirstBeat] = useState(video.first_beat_ms?.toString() ?? '');
  const [perPhrase, setPerPhrase] = useState(video.beats_per_phrase.toString());
  const [loopStart, setLoopStart] = useState(video.default_loop_start_ms?.toString() ?? '');
  const [loopEnd, setLoopEnd] = useState(video.default_loop_end_ms?.toString() ?? '');

  const save = (fields: Parameters<typeof setVideoFields>[1]) =>
    start(async () => {
      const result: Result = await setVideoFields(video.id, fields);
      setError(result.ok ? null : result.error);
    });

  /* What the three numbers actually buy you, shown as you type. If a phrase
     length looks wrong against the music, the BPM is wrong. */
  const bpmNum = toNum(bpm);
  const beats = toNum(perPhrase) ?? 8;
  const beatMs = bpmNum && bpmNum > 0 ? 60000 / bpmNum : null;
  const phraseMs = beatMs ? beatMs * beats : null;

  const index = siblings.findIndex(v => v.id === video.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const session = video.session;
  const program = session?.program;
  const step = stepOf(video.step);

  return (
    <>
      <Crumbs
        items={[
          ...(program?.area ? [{ label: program.area.name_t.en, href: `/admin/areas/${program.area.id}` }] : []),
          ...(program ? [{ label: program.title_t.en, href: `/admin/programs/${program.id}` }] : []),
          ...(session ? [{ label: `Session ${two(session.position)}`, href: `/admin/sessions/${session.id}` }] : []),
          { label: video.title_t.en || 'Untitled video' },
        ]}
      />

      <div className="head">
        <div>
          <h1>{video.title_t.en || 'Untitled video'}</h1>
          <p>
            {step.name.en} — {step.description.en}
          </p>
        </div>
        <div className="acts">
          {prev ? <Link className="btn" href={`/admin/videos/${prev.id}`}>← Previous video</Link> : <span className="btn" aria-disabled="true" style={{ opacity: .35 }}>← Previous video</span>}
          {next ? <Link className="btn" href={`/admin/videos/${next.id}`}>Next video →</Link> : <span className="btn" aria-disabled="true" style={{ opacity: .35 }}>Next video →</span>}
        </div>
      </div>

      {/* Where this video sits in its session. Its number is its place in the
          list, not `position`, which may have gaps. */}
      <div className="whereabouts">
        <span className="pos">
          Video {index + 1} of {siblings.length}
          {session ? ` in “${session.title_t.en}”` : ''}
        </span>
        <StepStrip videos={siblings} currentId={video.id} hrefFor={id => `/admin/videos/${id}`} />
      </div>

      {error && <p className="banner">{error}</p>}

      <div className="editor">
        <div>
          <section className="panel">
            <h2>Footage</h2>
            <UploadField
              videoId={video.id}
              status={video.status}
              durationMs={video.duration_ms}
              posterUrl={posterUrl}
              providerUid={video.provider_uid}
              configured={streamConfigured}
              onError={setError}
            />
          </section>

          {/* Optional, and folded until used: only counts, phrase marks and
              "loop eight counts" in the player need it. Open when set. */}
          <details className="panel fold" open={gridOpen}>
            <summary>
              <h2>Beat grid</h2>
              <span className="hint">optional · counts, phrase marks and loop 8 counts in the player</span>
            </summary>
            <div className="fields">
              <Labelled label="BPM">
                <input className="num" value={bpm} disabled={pending} inputMode="decimal" onChange={e => setBpm(e.target.value)} onBlur={() => save({ bpm: toNum(bpm) })} placeholder="—" />
              </Labelled>
              <Labelled label="First beat (ms)">
                <input className="num" value={firstBeat} disabled={pending} inputMode="numeric" onChange={e => setFirstBeat(e.target.value)} onBlur={() => save({ first_beat_ms: toNum(firstBeat) })} placeholder="—" />
                <Hint>Where the first 1 falls in the video.</Hint>
              </Labelled>
              <Labelled label="Beats per phrase">
                <input className="num" value={perPhrase} disabled={pending} inputMode="numeric" onChange={e => setPerPhrase(e.target.value)} onBlur={() => save({ beats_per_phrase: toNum(perPhrase) ?? 8 })} />
                <Hint>Salsa counts in eights. Change it only for material that does not.</Hint>
              </Labelled>
            </div>

            <div className="derived">
              {beatMs ? (
                <>
                  <span>
                    one beat <b>{beatMs.toFixed(1)} ms</b>
                  </span>
                  <span>
                    one phrase of {beats} <b>{(phraseMs! / 1000).toFixed(2)} s</b>
                  </span>
                  <span>
                    &ldquo;loop 8 counts&rdquo; <b>{((beatMs * 8) / 1000).toFixed(2)} s</b>
                  </span>
                </>
              ) : (
                <span>Set a BPM and the phrase lengths appear here. The player shows counts, phrase marks and &ldquo;loop eight counts&rdquo; only for a video with one.</span>
              )}
            </div>

            <h3 className="sub-h">Default loop</h3>
            <div className="fields">
              <Labelled label="Start (ms)">
                <input className="num" value={loopStart} disabled={pending} inputMode="numeric" onChange={e => setLoopStart(e.target.value)} onBlur={() => save({ default_loop_start_ms: toNum(loopStart) })} placeholder="—" />
              </Labelled>
              <Labelled label="End (ms)">
                <input className="num" value={loopEnd} disabled={pending} inputMode="numeric" onChange={e => setLoopEnd(e.target.value)} onBlur={() => save({ default_loop_end_ms: toNum(loopEnd) })} placeholder="—" />
              </Labelled>
              <Labelled label="That is">
                <span style={{ fontSize: 14.5, paddingTop: 10 }}>
                  {toNum(loopStart) != null && toNum(loopEnd) != null
                    ? `${mmss(toNum(loopStart))} → ${mmss(toNum(loopEnd))}${
                        beatMs ? ` · ${((toNum(loopEnd)! - toNum(loopStart)!) / beatMs).toFixed(1)} beats` : ''
                      }`
                    : 'No default loop'}
                </span>
                <Hint>What a member gets when they press loop.</Hint>
              </Labelled>
            </div>

            <div className="note" style={{ marginTop: 18 }}>
              <b>Tap tempo and the click-track preview are not built yet.</b>
              Checking a BPM properly means hearing a click against the music. Until then the derived
              numbers above are the only check on what you type.
            </div>
          </details>
        </div>

        <div>
          <section className="panel">
            <h2>What it is</h2>
            <div className="fieldset" style={{ maxWidth: 'none', marginBottom: 16 }}>
              <span className="lf-label">Method step</span>
              <select className="stepsel" data-step={video.step} style={{ alignSelf: 'flex-start', fontSize: 13, padding: '10px 12px' }} value={video.step} disabled={pending} onChange={e => save({ step: e.target.value as MethodStep })}>
                {METHOD_STEPS.map(s => (
                  <option key={s} value={s}>
                    {stepOf(s).name.en}
                  </option>
                ))}
              </select>
              <Hint>
                {video.is_drillable
                  ? 'Train and drill are the steps you repeat, so members can put this video in a drill.'
                  : 'Not drillable — this step explains, transforms or improvises rather than repeating.'}
              </Hint>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14.5 }}>
              <input type="checkbox" checked={video.mirror_default} disabled={pending} onChange={e => save({ mirror_default: e.target.checked })} />
              Opens mirrored
            </label>
            <Hint>On for footage filmed facing the dancer; off for follow view.</Hint>
          </section>

          <section className="panel">
            <h2>Copy</h2>
            <LocalizedField stacked table="videos" id={video.id} column="title_t" label="Title" value={video.title_t} onError={setError} />
            <LocalizedField stacked table="videos" id={video.id} column="description_t" label="Description" value={video.description_t} multiline onError={setError} />
          </section>
        </div>
      </div>
    </>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fieldset">
      <span className="lf-label">{label}</span>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="hint">{children}</span>;
}
