'use client';

/* One exercise: its footage, what it works, whether members may play it, its
   copy, and its beat grid.

   The beat grid is the part that matters. Three numbers — bpm, first_beat_ms
   and beats_per_phrase — are the whole source of the counts overlay, the
   snap-to-eights loop, the count-in and the ticks on the scrub bar. Nothing
   about counts is ever hand-drawn, so filling these in correctly here is what
   makes the player a dance player rather than a video player.

   Tap tempo and the click-track preview need real footage to be worth anything,
   so they arrive with the upload flow. What is here now is the data itself,
   with the derived numbers shown so a wrong BPM is visible immediately. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Crumbs from '../../Crumbs';
import LocalizedField from '../../LocalizedField';
import PublishSwitch, { publishMeaning } from '../../PublishSwitch';
import UploadField from './UploadField';
import BeatTapper from './BeatTapper';
import { deleteExercise, setVideoFields, type Result } from '../../actions';
import { EXERCISE_TAGS, LEVEL_KEYS, mmss, type ExerciseTag } from '@/lib/db';
import { LEVEL_LABELS, TAG_LABELS } from '@/lib/i18n';
import type { EditorVideo } from './page';

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function ExerciseEditor({
  video,
  streamConfigured,
  posterUrl,
}: {
  video: EditorVideo;
  streamConfigured: boolean;
  /** Signed on the server. videos.poster_url is unsigned and answers 401. */
  posterUrl: string | null;
}) {
  const router = useRouter();
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

  const uses = (video.routine_items ?? []).filter(i => i.routine);
  /* Days members can have right now: an open routine in an open menu. */
  const liveUses = uses.filter(i => i.routine!.status === 'open' && i.routine!.menu?.status === 'open');
  const tags = video.tags as ExerciseTag[];
  const title = video.title_t.en || 'Untitled exercise';

  return (
    <>
      <Crumbs items={[{ label: 'Media library', href: '/admin/exercises' }, { label: title }]} />

      <div className="head">
        <div>
          <h1>{title}</h1>
          <p>
            {tags.length ? tags.map(t => TAG_LABELS[t]?.en ?? t).join(' · ') : 'No tags yet'} · {LEVEL_LABELS[video.difficulty].en}
            {video.duration_ms ? ` · ${mmss(video.duration_ms)}` : ''}
          </p>
        </div>
        <div className="acts">
          <Link className="btn" href="/admin/exercises">← Media library</Link>
        </div>
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
            {video.status === 'ready' ? (
              <BeatTapper
                videoId={video.id}
                durationMs={video.duration_ms}
                bpm={toNum(bpm)}
                firstBeatMs={toNum(firstBeat)}
                beatsPerPhrase={toNum(perPhrase) ?? 8}
                onSet={fields => {
                  if ('bpm' in fields) setBpm(fields.bpm?.toString() ?? '');
                  if ('first_beat_ms' in fields) setFirstBeat(fields.first_beat_ms?.toString() ?? '');
                  if ('default_loop_start_ms' in fields) setLoopStart(fields.default_loop_start_ms?.toString() ?? '');
                  if ('default_loop_end_ms' in fields) setLoopEnd(fields.default_loop_end_ms?.toString() ?? '');
                  save(fields);
                }}
              />
            ) : (
              <p className="hint" style={{ margin: '0 0 14px' }}>Once the footage is ready, you can set this by ear here: tap the tempo, mark the first 1, hear a click on the beat.</p>
            )}
            <h3 className="sub-h">By the numbers</h3>
            <div className="fields">
              <Labelled label="BPM">
                <input className="num" value={bpm} inputMode="decimal" onChange={e => setBpm(e.target.value)} onBlur={() => save({ bpm: toNum(bpm) })} placeholder="—" />
              </Labelled>
              <Labelled label="First beat (ms)">
                <input className="num" value={firstBeat} inputMode="numeric" onChange={e => setFirstBeat(e.target.value)} onBlur={() => save({ first_beat_ms: toNum(firstBeat) })} placeholder="—" />
                <Hint>Where the first 1 falls in the video.</Hint>
              </Labelled>
              <Labelled label="Beats per phrase">
                <input className="num" value={perPhrase} inputMode="numeric" onChange={e => setPerPhrase(e.target.value)} onBlur={() => save({ beats_per_phrase: toNum(perPhrase) ?? 8 })} />
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
                <span>Set a BPM and the phrase lengths appear here. The player shows counts, phrase marks and &ldquo;loop eight counts&rdquo; only for an exercise with one.</span>
              )}
            </div>

            <h3 className="sub-h">Default loop</h3>
            <div className="fields">
              <Labelled label="Start (ms)">
                <input className="num" value={loopStart} inputMode="numeric" onChange={e => setLoopStart(e.target.value)} onBlur={() => save({ default_loop_start_ms: toNum(loopStart) })} placeholder="—" />
              </Labelled>
              <Labelled label="End (ms)">
                <input className="num" value={loopEnd} inputMode="numeric" onChange={e => setLoopEnd(e.target.value)} onBlur={() => save({ default_loop_end_ms: toNum(loopEnd) })} placeholder="—" />
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

          </details>

          <section className="panel">
            <h2>Used in</h2>
            {uses.length === 0 ? (
              <p className="hint" style={{ margin: 0 }}>No routine uses this exercise yet. Open a routine and add it from the library.</p>
            ) : (
              <ul className="uses">
                {uses.map(i => (
                  <li key={i.id}>
                    <Link href={`/admin/routines/${i.routine!.id}`}>{i.routine!.title_t.en || 'Untitled routine'}</Link>
                    {i.routine!.menu && <span> · {i.routine!.menu.title_t.en}</span>}
                    {liveUses.includes(i) && <span className="chip open" style={{ marginLeft: 6 }}>live</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Danger</h2>
            {uses.length > 0 ? (
              <p className="hint" style={{ fontSize: 13, margin: 0 }}>
                {uses.length} routine{uses.length === 1 ? ' uses' : 's use'} this exercise, so the database
                will refuse to delete it. Take it out of those routines first; that is deliberate, so a
                routine members are on is never quietly shortened.
              </p>
            ) : (
              <button
                className="btn danger"
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete "${title}"${video.provider_uid ? ' and its footage on Cloudflare' : ''}? This cannot be undone.`)) {
                    start(async () => {
                      const result = await deleteExercise(video.id);
                      if (result.ok) router.push('/admin/exercises');
                      else setError(result.error);
                    });
                  }
                }}
              >
                Delete this exercise
              </button>
            )}
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>Publish</h2>
            <PublishSwitch
              value={video.publish}
              options={['draft', 'open']}
              disabled={pending}
              onChange={next => {
                /* Taking it back to draft empties it out of days members are on. */
                if (next === 'draft' && liveUses.length > 0 &&
                  !confirm(`${liveUses.length} live day${liveUses.length === 1 ? ' uses' : 's use'} this exercise. Members on those days will lose it until it opens again. Take it back to draft?`)) return;
                save({ publish: next });
              }}
            />
            <p className="hint" style={{ margin: '12px 0 0' }}>
              {publishMeaning(video.publish)}.
              {video.status !== 'ready' && ' It also needs footage marked Ready before anyone can play it.'}
            </p>
          </section>

          <section className="panel">
            <h2>What it works</h2>
            <div className="fieldset" style={{ maxWidth: 'none', marginBottom: 16 }}>
              <span className="lf-label">Tags</span>
              <div className="levels">
                {EXERCISE_TAGS.map(t => {
                  const on = tags.includes(t);
                  const next = on ? tags.filter(k => k !== t) : [...tags, t];
                  return (
                    <button key={t} type="button" className={`chip${on ? ' open' : ''}`} aria-pressed={on} disabled={pending}
                      onClick={() => save({ tags: EXERCISE_TAGS.filter(k => next.includes(k)) })}>
                      {TAG_LABELS[t].en}
                    </button>
                  );
                })}
              </div>
              <Hint>The first tag is the word over the picture in the player. The planner filters by any of them.</Hint>
            </div>

            <div className="fieldset" style={{ marginBottom: 16 }}>
              <span className="lf-label">Difficulty</span>
              <select className="field" value={video.difficulty} disabled={pending} onChange={e => save({ difficulty: e.target.value })}>
                {LEVEL_KEYS.map(l => (
                  <option key={l} value={l}>{LEVEL_LABELS[l].en}</option>
                ))}
              </select>
              <Hint>Describes the exercise, not the dancer.</Hint>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14.5 }}>
              <input type="checkbox" checked={video.mirror_default} disabled={pending} onChange={e => save({ mirror_default: e.target.checked })} />
              Opens mirrored
            </label>
            <Hint>On for footage filmed facing the dancer, so their left is your left; off for follow view.</Hint>
          </section>

          <section className="panel">
            <h2>Copy</h2>
            <LocalizedField stacked table="videos" id={video.id} column="title_t" label="Title" value={video.title_t} onError={setError} />
            <LocalizedField stacked table="videos" id={video.id} column="description_t" label="One line of instruction" value={video.description_t} multiline onError={setError} />
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
