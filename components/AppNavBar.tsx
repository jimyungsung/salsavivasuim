'use client';

/* The signed-in navigation, drawn. AppNav (the server half) decides who is
   looking; this renders it, so the bar cannot drift between screens — the job
   renderNav() did in the prototype.

   The items are sections, not pages. "Masterplan" stays current for everything
   beneath it — the catalogue, a module, a session — because drilling in never
   leaves that section. Only screens that exist are listed; a nav item pointing
   at "#" is a dead end. The back office is listed only for admins. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { signInHref } from '@/lib/safe-next';
import type { Localized } from '@/lib/content';
import type { Member } from '@/lib/member';

export type NavSection = 'masterplan' | 'training' | 'drills';

const ITEMS: { key: NavSection | 'admin'; href: string; label: Localized }[] = [
  { key: 'masterplan', href: '/masterplan', label: { en: 'Masterplan', ko: '마스터플랜' } },
  { key: 'training', href: '/prototype/training.html', label: { en: 'My training', ko: '나의 트레이닝' } },
  { key: 'drills', href: '/drills', label: { en: 'My drills', ko: '나의 드릴' } },
];

const ADMIN = { key: 'admin' as const, href: '/admin', label: { en: 'Admin', ko: '관리' } };

export default function AppNavBar({
  current,
  member,
}: {
  current?: NavSection;
  member: Member | null;
}) {
  const { lang, setLang, T } = useLang();
  const pathname = usePathname();
  const items = member?.isAdmin ? [...ITEMS, ADMIN] : ITEMS;

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="logo" href="/masterplan">
          SUIM<span className="dot">.</span>
        </Link>

        <nav className="navlinks" aria-label="Main">
          {items.map(item => (
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
          {member ? (
            <div className="me">
              <span className="av" aria-hidden="true">
                {member.initials}
              </span>
              <span>{member.name}</span>
            </div>
          ) : (
            <Link className="pill primary sm" href={signInHref(pathname)}>
              {T({ en: 'Sign in', ko: '로그인' })}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
