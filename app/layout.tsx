import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { LangProvider } from '@/lib/lang';
import { LANG_COOKIE, isLang, type Lang } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SUIM', template: 'SUIM — %s' },
  description: 'Solo salsa training, built around practice.',
  openGraph: { type: 'website', siteName: 'SUIM' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* Read the language before the first paint so Korean does not arrive as a
     flash of English. Falls back to English for a first-time visitor. */
  const cookie = (await cookies()).get(LANG_COOKIE)?.value;
  const lang: Lang = isLang(cookie) ? cookie : 'en';

  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        />
      </head>
      <body className={lang === 'ko' ? 'ko' : undefined}>
        <LangProvider initial={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
