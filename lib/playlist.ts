/* What the player plays: a playlist, never a bare video.

   A session is its videos in order. A drill is a member's own run of videos
   — possibly the same one twice — with a loop, a speed and a repeat count of
   its own on each. A day is the drills scheduled on it, one after another.
   All three are this one shape, which is what lets one player serve them all
   (BUILD-PLAN §5, "built now so it doesn't need rebuilding later").

   No 'server-only' here: the player is a client component and needs the type,
   and sessionPlaylist() is pure. The builders that read the database live in
   lib/catalogue.ts and lib/drills.ts. */

import { LEVEL_LABELS, type Localized } from './content';
import type { SessionDetail, SessionVideoSummary } from './catalogue';

export interface PlaylistEntry {
  video: SessionVideoSummary;
  /** Play the whole video this many times before moving on. */
  repeats: number;
  /** A speed of this entry's own; otherwise the step's remembered speed. */
  speed: number | null;
}

export interface PlaylistLink {
  href: string;
  label: Localized;
}

export interface Playlist {
  kind: 'session' | 'drill' | 'day';
  /** The page this playlist is on, for coming back after sign-in. */
  href: string;
  title: Localized;
  /** The small line above the title — "Session 01 · Beginner", "3 drills". */
  kicker: Localized;
  /** One level up, as the back link. */
  back: PlaylistLink;
  prev: PlaylistLink | null;
  /** Where to go when the last entry has played. */
  next: PlaylistLink | null;
  /** What to focus on, shown under the player alongside the current video's
      own description. */
  notes: Localized[];
  entries: PlaylistEntry[];
}

const two = (n: number) => String(n).padStart(2, '0');

/** A session as the player plays it. Pure, so the session page stays a thin
    server component around the query. */
export function sessionPlaylist(session: SessionDetail): Playlist {
  const levels = (lang: 'en' | 'ko') => session.levels.map(k => LEVEL_LABELS[k][lang]).join(' · ');
  const program = `/programs/${session.program.id}`;
  return {
    kind: 'session',
    href: `/sessions/${session.id}`,
    title: session.title,
    kicker: {
      en: `Session ${two(session.position)}${levels('en') ? ` · ${levels('en')}` : ''}`,
      ko: `세션 ${two(session.position)}${levels('ko') ? ` · ${levels('ko')}` : ''}`,
    },
    back: { href: program, label: session.program.title },
    prev: session.prevSessionId
      ? { href: `/sessions/${session.prevSessionId}`, label: { en: '← Previous', ko: '← 이전' } }
      : null,
    next: session.nextSessionId
      ? { href: `/sessions/${session.nextSessionId}`, label: { en: 'Next session →', ko: '다음 세션 →' } }
      : { href: program, label: { en: 'Finish the module →', ko: '모듈 마치기 →' } },
    notes: [session.focus, session.outcome],
    entries: session.videos.map(video => ({ video, repeats: 1, speed: null })),
  };
}

/** Running time of the whole list, repeats included. */
export const playlistLengthMs = (entries: PlaylistEntry[]): number =>
  entries.reduce((n, e) => n + (e.video.durationMs ?? 0) * e.repeats, 0);
