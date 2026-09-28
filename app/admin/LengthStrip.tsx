/* A routine's shape at a glance: one segment per exercise, in order, sized by
   length. One colour — the method steps that used to colour it are gone — so
   what the strip says is how long and how many, and which are still unfilmed.

   Segments are sized by duration when every exercise has one; until footage is
   in, they are equal, because a guess at length would mislead more than it
   helps. An exercise without footage is drawn hatched. */

import Link from 'next/link';
import { mmss, type VideoStatus } from '@/lib/db';

export interface StripItem {
  /** The item's or the exercise's id: what `hrefFor` and `currentId` name. */
  id: string;
  title: string;
  status: VideoStatus;
  duration_ms: number | null;
  repeats?: number;
}

export const STATUS_WORDS: Record<VideoStatus, string> = {
  uploading: 'Needs footage',
  processing: 'Encoding…',
  ready: 'Ready',
  failed: 'Upload failed',
};

export default function LengthStrip({
  items,
  currentId,
  size = 'small',
  hrefFor,
}: {
  items: StripItem[];
  currentId?: string;
  size?: 'small' | 'large';
  /** When given, each segment links there. */
  hrefFor?: (id: string) => string;
}) {
  if (items.length === 0) {
    return <div className={`rstrip ${size} none`}>No exercises yet</div>;
  }
  const timed = items.every(v => v.duration_ms);

  return (
    <div className={`rstrip ${size}`} role="list" aria-label="Running order">
      {items.map((v, i) => {
        const length = (v.duration_ms ?? 0) * (v.repeats ?? 1);
        const label = `${i + 1}. ${v.title || 'Untitled'} · ${v.duration_ms ? mmss(length) : '—'} · ${STATUS_WORDS[v.status]}`;
        const inner = size === 'large' && (
          <>
            <b>{i + 1}</b>
            <span className="sname">{v.title || 'Untitled'}</span>
            <span className="slen">{v.duration_ms ? mmss(length) : '—'}</span>
          </>
        );
        const className = `seg${v.status === 'ready' ? '' : ' pending'}${v.id === currentId ? ' current' : ''}`;
        const style = { flexGrow: timed ? Math.max(length / 1000, 20) : 1 };
        return hrefFor ? (
          <Link key={v.id} className={className} style={style} href={hrefFor(v.id)} title={label} role="listitem" aria-label={label}>
            {inner}
          </Link>
        ) : (
          <span key={v.id} className={className} style={style} title={label} role="listitem" aria-label={label}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}
