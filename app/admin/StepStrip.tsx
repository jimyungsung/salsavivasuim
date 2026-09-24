/* A session's running order at a glance: one segment per video, in order,
   coloured by method step and sized by length. The same picture everywhere in
   the back office — the catalogue, a program, a session, a video — so the
   shape of a session reads the same wherever you meet it.

   Segments are sized by duration when every video has one; until footage is
   in, they are equal, because a guess at length would mislead more than it
   helps. A video without footage is drawn hatched. */

import Link from 'next/link';
import { stepOf } from '@/lib/content';
import { mmss, type MethodStep, type VideoStatus } from '@/lib/db';

export interface StripVideo {
  id: string;
  step: MethodStep;
  status: VideoStatus;
  duration_ms: number | null;
}

export const STATUS_WORDS: Record<VideoStatus, string> = {
  uploading: 'Needs footage',
  processing: 'Encoding…',
  ready: 'Ready',
  failed: 'Upload failed',
};

export default function StepStrip({
  videos,
  currentId,
  size = 'small',
  hrefFor,
}: {
  videos: StripVideo[];
  currentId?: string;
  size?: 'small' | 'large';
  /** When given, each segment links there — a video page, or an anchor. */
  hrefFor?: (id: string) => string;
}) {
  if (videos.length === 0) {
    return <div className={`rstrip ${size} none`}>No videos yet</div>;
  }
  const timed = videos.every(v => v.duration_ms);

  return (
    <div className={`rstrip ${size}`} role="list" aria-label="Running order">
      {videos.map((v, i) => {
        const step = stepOf(v.step);
        const label = `${i + 1}. ${step.name.en} · ${v.duration_ms ? mmss(v.duration_ms) : '—'} · ${STATUS_WORDS[v.status]}`;
        const inner = size === 'large' && (
          <>
            <b>{i + 1}</b>
            <span className="sname">{step.name.en}</span>
            <span className="slen">{v.duration_ms ? mmss(v.duration_ms) : '—'}</span>
          </>
        );
        const props = {
          className: `seg${v.status === 'ready' ? '' : ' pending'}${v.id === currentId ? ' current' : ''}`,
          'data-step': v.step,
          style: { flexGrow: timed ? v.duration_ms! : 1 },
          title: label,
          role: 'listitem',
        };
        return hrefFor ? (
          <Link key={v.id} href={hrefFor(v.id)} {...props}>
            {inner}
          </Link>
        ) : (
          <span key={v.id} {...props}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/** The six steps in the method's order, each with how often this session uses
    it. A step at zero is shown too — "no UNDERSTAND video" is a fact about the
    session worth seeing, not an error. */
export function StepLegend({ videos }: { videos: { step: MethodStep }[] }) {
  const order: MethodStep[] = ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'];
  return (
    <div className="legend">
      {order.map(k => {
        const n = videos.filter(v => v.step === k).length;
        const step = stepOf(k);
        return (
          <span key={k} className={`lg${n ? '' : ' unused'}`} data-step={k} title={step.description.en}>
            <i aria-hidden="true" />
            {step.name.en}
            <em>{n ? `×${n}` : '—'}</em>
          </span>
        );
      })}
    </div>
  );
}
