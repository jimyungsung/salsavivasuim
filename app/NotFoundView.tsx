'use client';

import Link from 'next/link';
import { useCopy } from '@/lib/lang';
import type { Copy } from '@/lib/lang';

type Key = 'code' | 'title' | 'body' | 'home' | 'masterplan';

const C: Copy<Key> = {
  en: {
    code: 'Error 404',
    title: 'You have stepped off the count.',
    body: 'That page does not exist. Nothing here is broken — the link just points somewhere we never built.',
    home: 'Back to the start',
    masterplan: 'Go to the masterplan',
  },
  ko: {
    code: '오류 404',
    title: '카운트를 놓쳤습니다.',
    body: '없는 페이지입니다. 고장 난 것은 없습니다 — 링크가 만든 적 없는 곳을 가리키고 있을 뿐입니다.',
    home: '처음으로',
    masterplan: '마스터플랜으로',
  },
};

export default function NotFoundView() {
  const c = useCopy(C);
  return (
    <div className="nf">
      <main className="wrap in">
        <Link className="brand" href="/">
          SUIM<span className="dot">.</span>
        </Link>
        <div className="code">{c.code}</div>
        <h1>{c.title}</h1>
        <p>{c.body}</p>
        <div className="go">
          <Link className="pill primary" href="/">
            {c.home}
          </Link>
          <Link className="pill ghost" href="/masterplan">
            {c.masterplan}
          </Link>
        </div>
        <div className="counts" aria-hidden="true">
          1 2 3 <b>·</b> 5 6 7 <b>·</b>
        </div>
      </main>
    </div>
  );
}
