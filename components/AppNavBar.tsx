'use client';

/* The signed-in navigation, drawn. AppNav (the server half) decides who is
   looking; this renders it, so the bar cannot drift between screens.

   The items are sections, not pages. "Today" stays current for any day and for
   a routine played from it, because drilling in never leaves that section —
   which is why it is read from the path rather than passed in: the bar sits
   in a layout that outlives the page. Only screens that exist are listed; a
   nav item pointing at "#" is a dead end. The back office is listed only for
   admins.

   On a phone the links move to a tab bar at the bottom, where the thumb is,
   and the top bar keeps the wordmark, the language and the member chip. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { signInHref } from '@/lib/safe-next';
import type { Localized } from '@/lib/i18n';
import type { Member } from '@/lib/member';

type NavSection = 'today' | 'week' | 'admin';

const sectionOf = (path: string): NavSection | undefined =>
  /^\/(today|day|routines)(\/|$)/.test(path)
    ? 'today'
    : /^\/week(\/|$)/.test(path)
      ? 'week'
      : /^\/admin(\/|$)/.test(path)
        ? 'admin'
        : undefined;

const ICONS: Record<NavSection, React.ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  week: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="10" cy="17" r="2.5" />
    </svg>
  ),
};

const ITEMS: { key: NavSection; href: string; label: Localized }[] = [
  { key: 'today', href: '/today', label: { en: 'Today', ko: '오늘' } },
  { key: 'week', href: '/week', label: { en: 'My week', ko: '나의 주간' } },
];

const ADMIN = { key: 'admin' as const, href: '/admin', label: { en: 'Admin', ko: '관리' } };

export default function AppNavBar({ member }: { member: Member | null }) {
  const { lang, setLang, T } = useLang();
  const pathname = usePathname();
  const current = sectionOf(pathname);
  /* The back office is English only (see app/admin/layout.tsx): its nav does
     not switch language, and offers no switch. */
  const inAdmin = current === 'admin';
  const label = (value: Localized) => (inAdmin ? value.en : T(value));
  const items = member?.isAdmin ? [...ITEMS, ADMIN] : ITEMS;

  return (
    <>
      <header className="nav">
        <div className="wrap">
          <Link className="logo" href="/today">
            Everyday Salsa<span className="dot">.</span>
          </Link>

          <nav className="navlinks" aria-label="Main">
            {items.map(item => (
              <Link key={item.key} href={item.href} aria-current={item.key === current ? 'page' : undefined}>
                {label(item.label)}
              </Link>
            ))}
          </nav>

          <div className="tools">
            {!inAdmin && (
              <div className="lang">
                <span className="sr">{T({ en: 'Language', ko: '언어' })}</span>
                <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
                  EN
                </button>
                <button type="button" aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>
                  KO
                </button>
              </div>
            )}
            {member ? (
              <div className="me">
                <span className="av" aria-hidden="true">
                  {member.initials}
                </span>
                <span>{member.name}</span>
              </div>
            ) : (
              <Link className="pill primary sm" href={signInHref(pathname)}>
                {label({ en: 'Sign in', ko: '로그인' })}
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Main">
        {items.map(item => (
          <Link key={item.key} href={item.href} aria-current={item.key === current ? 'page' : undefined}>
            <i>{ICONS[item.key]}</i>
            {label(item.label)}
          </Link>
        ))}
      </nav>
    </>
  );
}
