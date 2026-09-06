'use client';

/* The EN/KO switch.

   The prototype kept the choice in localStorage and read ?lang=ko on load. That
   still works, but the choice is also written to a cookie so the server can set
   <html lang> on the first paint — otherwise Korean readers get a flash of
   English on every navigation. In P1 the cookie is seeded from profiles.locale
   at sign-in, and this provider stops being the source of truth. */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Lang, Localized } from './content';
import { LANG_COOKIE, isLang, t } from './content';

const LANG_STORAGE = LANG_COOKIE;
const ONE_YEAR = 60 * 60 * 24 * 365;

interface LangValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Reads a { en, ko } field in the current language. */
  T: (value: Localized) => string;
}

const LangContext = createContext<LangValue>({ lang: 'en', setLang: () => {}, T: v => v.en });

export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    document.body.classList.toggle('ko', next === 'ko');
    document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=${ONE_YEAR};samesite=lax`;
    try {
      localStorage.setItem(LANG_STORAGE, next);
    } catch {
      /* private browsing — the cookie is enough */
    }
  }, []);

  /* ?lang=ko still forces Korean on load, and a choice made before the cookie
     existed is honoured once and then migrated. */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) {
      if (fromUrl !== lang) setLang(fromUrl);
      return;
    }
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LANG_STORAGE);
    } catch {
      /* ignore */
    }
    if (isLang(stored) && stored !== lang) setLang(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const T = useCallback((value: Localized) => t(value, lang), [lang]);

  return <LangContext.Provider value={{ lang, setLang, T }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Page copy that is not content: one object per screen, both languages. */
export type Copy<K extends string> = Record<Lang, Record<K, string>>;
export const useCopy = <K extends string>(copy: Copy<K>): Record<K, string> => copy[useLang().lang];
