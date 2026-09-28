'use client';

/* The library, as a list: newest first, filtered by tag, footage state and a
   search. "+ New exercise" makes a draft with the title given and opens its
   editor, where the footage is uploaded. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import Crumbs from '../Crumbs';
import { STATUS_WORDS } from '../LengthStrip';
import { createExercise } from '../actions';
import { EXERCISE_TAGS, mmss, untranslated, type ExerciseTag } from '@/lib/db';
import { LEVEL_LABELS, TAG_LABELS } from '@/lib/i18n';
import type { ListVideo } from './page';

type Footage = 'all' | 'ready' | 'missing';

export default function ExerciseList({ videos, posters }: { videos: ListVideo[]; posters: Record<string, string> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<ExerciseTag | 'all'>('all');
  const [footage, setFootage] = useState<Footage>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      videos.filter(
        v =>
          (tag === 'all' || v.tags.includes(tag)) &&
          (footage === 'all' || (footage === 'ready' ? v.status === 'ready' : v.status !== 'ready')) &&
          (!q || v.title_t.en.toLowerCase().includes(q) || (v.title_t.ko ?? '').toLowerCase().includes(q)),
      ),
    [videos, tag, footage, q],
  );

  const add = () => {
    const en = title.trim();
    if (!en) return;
    start(async () => {
      const result = await createExercise(en);
      if (result.ok && result.id) {
        setError(null);
        setTitle('');
        router.push(`/admin/exercises/${result.id}`);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  };

  const ready = videos.filter(v => v.status === 'ready').length;
  const open = videos.filter(v => v.publish === 'open' && v.status === 'ready').length;

  return (
    <>
      <Crumbs items={[{ label: 'Exercises' }]} />

      <div className="head">
        <div>
          <h1>Exercises</h1>
          <p>
            The library every routine borrows from. An exercise is one short clip, uploaded once,
            tagged with what it works and how hard it is.
          </p>
        </div>
        <div className="tally">
          <span><b>{videos.length}</b>in the library</span>
          <span><b>{ready}</b>with footage</span>
          <span><b>{open}</b>open to members</span>
        </div>
      </div>

      {error && <p className="banner">{error}</p>}

      <section className="panel">
        <div className="addbar" style={{ paddingTop: 0 }}>
          <input
            className="num"
            style={{ width: '34ch' }}
            value={title}
            placeholder="New exercise title, in English"
            disabled={pending}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') add();
            }}
          />
          <button className="btn primary" type="button" disabled={pending || !title.trim()} onClick={add}>
            + New exercise
          </button>
          <span>Then upload its footage on the next screen.</span>
        </div>
      </section>

      <section className="panel">
        <div className="filters">
          <input
            type="search"
            className="num"
            style={{ width: '28ch' }}
            placeholder="Search"
            aria-label="Search exercises"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="levels">
            {(['all', 'ready', 'missing'] as Footage[]).map(f => (
              <button key={f} type="button" className={`chip${footage === f ? ' open' : ''}`} aria-pressed={footage === f} onClick={() => setFootage(f)}>
                {f === 'all' ? 'Any footage' : f === 'ready' ? 'With footage' : 'Needs footage'}
              </button>
            ))}
          </div>
          <div className="levels">
            <button type="button" className={`chip${tag === 'all' ? ' open' : ''}`} aria-pressed={tag === 'all'} onClick={() => setTag('all')}>All tags</button>
            {EXERCISE_TAGS.map(t => (
              <button key={t} type="button" className={`chip${tag === t ? ' open' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
                {TAG_LABELS[t].en}
              </button>
            ))}
          </div>
        </div>

        {videos.length === 0 ? (
          <p className="empty">No exercises yet. Add the first one above.</p>
        ) : shown.length === 0 ? (
          <p className="empty">Nothing matches.</p>
        ) : (
          <div className="vlist" style={{ marginTop: 16 }}>
            {shown.map(v => (
              <article className="vcard" key={v.id}>
                <Link className="vthumb" href={`/admin/exercises/${v.id}`} tabIndex={-1} aria-hidden="true" style={{ gridColumn: '1 / 3' }}>
                  {posters[v.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={posters[v.id]} alt="" loading="lazy" />
                  ) : (
                    <span>{STATUS_WORDS[v.status]}</span>
                  )}
                  {v.duration_ms ? <span className="len">{mmss(v.duration_ms)}</span> : null}
                </Link>
                <div className="vbody">
                  <div className="vtop">
                    {v.tags.length === 0 && <span className="chip warn">no tags</span>}
                    {v.tags.map(t => (
                      <span className="tag" key={t}>{TAG_LABELS[t as ExerciseTag]?.en ?? t}</span>
                    ))}
                    <span className="vstatus" data-status={v.status}>{STATUS_WORDS[v.status]}</span>
                    <span className={`chip ${v.publish}`}>{v.publish}</span>
                  </div>
                  <Link className={`vtitle ${v.title_t.en ? '' : 'blank'}`} href={`/admin/exercises/${v.id}`}>
                    {v.title_t.en || 'Untitled exercise'}
                  </Link>
                  <div className="vmeta">
                    <span>{LEVEL_LABELS[v.difficulty].en}</span>
                    <span>{v.bpm ? `${v.bpm} bpm` : 'No beat grid'}</span>
                    <span>{v.uses === 0 ? 'In no routine' : `In ${v.uses} routine${v.uses === 1 ? '' : 's'}`}</span>
                    {untranslated(v.title_t) && <span className="chip ko">needs KO</span>}
                  </div>
                  <div className="vacts">
                    <Link className={`btn ${v.status === 'ready' ? 'primary' : 'lime'}`} href={`/admin/exercises/${v.id}`}>
                      {v.status === 'ready' ? 'Edit' : 'Upload footage'}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
