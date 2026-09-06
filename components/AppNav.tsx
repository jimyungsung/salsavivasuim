'use client';

/* The signed-in navigation. Every app screen renders this one component, so the
   bar cannot drift between screens — the job renderNav() did in the prototype.

   The items are sections, not pages. "Masterplan" stays current for everything
   beneath it — the catalogue, a module, a session — because drilling in never
   leaves that section. Only screens that exist are listed; a nav item pointing
   at "#" is a dead end. */

import Link from 'next/link';
import { useLang } from '@/lib/lang';
import type { Localized } from '@/lib/content';

export type NavSection = 'masterplan' | 'training' | 'drills';

const ITEMS: { key: NavSection; href: string; label: Localized }[] = [
  { key: 'masterplan', href: '/masterplan', label: { en: 'Masterplan', ko: '마스터플랜' } },
  { key: 'training', href: '/prototype/training.html', label: { en: 'My training', ko: '나의 트레이닝' } },
  { key: 'drills', href: '/prototype/drills.html', label: { en: 'My drills', ko: '나의 드릴' } },
];

/* Until P1 puts a real session behind it, the member chip is the prototype's
   placeholder dancer. */
const MEMBER: Localized = { en: 'Jimyung', ko: '지명' };
const INITIALS = 'JS';

export default function AppNav({ current }: { current?: NavSection }) {
  const { lang, setLang, T } = useLang();

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="logo" href="/masterplan">
          SUIM<span className="dot">.</span>
        </Link>

        <nav className="navlinks" aria-label="Main">
          {ITEMS.map(item => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === current ? 'page' : undefined}
            >
              {T(item.label)}
            </Link>
          ))}
        </nav>

        <div className="tools">
          <div className="lang">
            <span className="sr">{T({ en: 'Language', ko: '언어' })}</span>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
              EN
            </button>
            <button type="button" aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>
              KO
            </button>
          </div>
          <div className="me">
            <span className="av" aria-hidden="true">
              {INITIALS}
            </span>
            <span>{T(MEMBER)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
