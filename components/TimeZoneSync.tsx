'use client';

/* Tells the server the browser's time zone, once, in a cookie (lib/clock.ts
   reads it). If the server guessed wrong for this first page, it re-renders
   once with the right day. */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TZ_COOKIE } from '@/lib/i18n';

export default function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie.match(new RegExp(`(?:^|; )${TZ_COOKIE}=([^;]*)`))?.[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
