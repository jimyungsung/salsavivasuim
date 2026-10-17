'use client';

/* A legal page: a title, the date it takes effect, sections of paragraphs and
   lists, in the reader's language. The text lives with each page (privacy,
   terms); this only lays it out, and puts a "draft" notice on top while the
   operator's details in lib/operator.ts are still placeholders. */

import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { OPERATOR_IS_DRAFT } from '@/lib/operator';
import type { Lang } from '@/lib/i18n';

export type Block = string | { list: string[] };
export interface Section {
  h: string;
  body: Block[];
}
export interface Doc {
  title: string;
  lede: string;
  sections: Section[];
}

const DRAFT: Record<Lang, string> = {
  en: 'Draft. This text has not been reviewed and is not yet in force; the operator’s details are still to be filled in.',
  ko: '초안입니다. 아직 검토되지 않았고 효력이 없습니다. 운영자 정보가 채워지지 않았습니다.',
};
const EFFECTIVE: Record<Lang, string> = { en: 'Effective', ko: '시행일' };
const OTHER: Record<Lang, { privacy: string; terms: string }> = {
  en: { privacy: 'Privacy policy', terms: 'Terms of use' },
  ko: { privacy: '개인정보 처리방침', terms: '이용약관' },
};

export default function LegalDoc({ doc, effective, other }: { doc: Record<Lang, Doc>; effective: string; other: 'privacy' | 'terms' }) {
  const { lang } = useLang();
  const d = doc[lang];
  return (
    <main className="wrap legal">
      {OPERATOR_IS_DRAFT && <p className="draft">{DRAFT[lang]}</p>}
      <h1>{d.title}</h1>
      <p className="eff">
        {EFFECTIVE[lang]} {effective}
      </p>
      <p className="lede">{d.lede}</p>
      {d.sections.map((s, i) => (
        <section key={i}>
          <h2>
            {i + 1}. {s.h}
          </h2>
          {s.body.map((b, j) =>
            typeof b === 'string' ? (
              <p key={j}>{b}</p>
            ) : (
              <ul key={j}>
                {b.list.map((li, k) => (
                  <li key={k}>{li}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
      <p className="other">
        <Link href={`/${other}`}>{OTHER[lang][other]} →</Link>
      </p>
    </main>
  );
}
