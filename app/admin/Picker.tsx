'use client';

/* The library as a picker: filtered by tag and a search, each card a button
   that appends. Shared by a routine's editor and the menu's week builder; a
   card already in the running order says so, and how many times. */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { STATUS_WORDS } from './LengthStrip';
import { EXERCISE_TAGS, mmss, type ExerciseTag } from '@/lib/db';
import { LEVEL_LABELS, TAG_LABELS } from '@/lib/i18n';
import type { PickVideo } from './routines/[id]/page';

/* The library, filtered by tag and a search, each card a button that appends. */
export default function Picker({
  library,
  posters,
  inRoutine,
  onPick,
  heading = 'Add from the library',
}: {
  heading?: string;
  library: PickVideo[];
  posters: Record<string, string>;
  /** Video ids already in the running order, once per appearance. */
  inRoutine: string[];
  onPick: (video: PickVideo) => void;
}) {
  const times = (id: string) => inRoutine.filter(x => x === id).length;
  const [tag, setTag] = useState<ExerciseTag | 'all'>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      library.filter(
        v =>
          (tag === 'all' || v.tags.includes(tag)) &&
          (!q || v.title_t.en.toLowerCase().includes(q) || (v.title_t.ko ?? '').toLowerCase().includes(q)),
      ),
    [library, tag, q],
  );
  const used = new Set(library.flatMap(v => v.tags));

  return (
    <section className="panel picker">
      <div className="ph">
        <h2>{heading}</h2>
        <span className="aside-note"><Link href="/admin/exercises">Media library →</Link></span>
      </div>
      <input
        type="search"
        className="num"
        style={{ width: '100%', marginBottom: 10 }}
        placeholder="Search"
        aria-label="Search the library"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {used.size > 0 && (
        <div className="levels" style={{ marginBottom: 14 }}>
          <button type="button" className={`chip${tag === 'all' ? ' open' : ''}`} aria-pressed={tag === 'all'} onClick={() => setTag('all')}>All</button>
          {EXERCISE_TAGS.filter(t => used.has(t)).map(t => (
            <button key={t} type="button" className={`chip${tag === t ? ' open' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
              {TAG_LABELS[t].en}
            </button>
          ))}
        </div>
      )}

      {library.length === 0 ? (
        <p className="empty">
          The library is empty. <Link href="/admin/exercises">Drop a video in the media library</Link> first.
        </p>
      ) : shown.length === 0 ? (
        <p className="empty">Nothing matches.</p>
      ) : (
        <div className="pgrid">
          {shown.map(v => (
            <button key={v.id} type="button" className={`pcard${times(v.id) ? ' used' : ''}`} onClick={() => onPick(v)} title="Add to the routine">
              <span className="pthumb">
                {posters[v.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={posters[v.id]} alt="" loading="lazy" />
                ) : (
                  <span>{STATUS_WORDS[v.status]}</span>
                )}
                {v.duration_ms ? <span className="len">{mmss(v.duration_ms)}</span> : null}
                <span className="padd" aria-hidden="true">+</span>
                {times(v.id) > 0 && <span className="pin">in routine{times(v.id) > 1 ? ` ×${times(v.id)}` : ''}</span>}
              </span>
              <span className="pname">{v.title_t.en || 'Untitled'}</span>
              <span className="pmeta">
                {v.tags.slice(0, 2).map(t => TAG_LABELS[t as ExerciseTag]?.en ?? t).join(' · ') || LEVEL_LABELS[v.difficulty].en}
                {v.publish !== 'open' && ` · ${v.publish}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
