'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCopy } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { signInHref } from '@/lib/safe-next';

type Key =
  | 'title' | 'signedInAs' | 'signIn' | 'legalH' | 'privacy' | 'terms'
  | 'delH' | 'delP' | 'delTick' | 'delGo' | 'errFailed' | 'errUnavailable' | 'signOut';

const C: Copy<Key> = {
  en: {
    title: 'Account', signedInAs: 'Signed in as', signIn: 'Sign in to see your account.',
    legalH: 'Your data', privacy: 'Privacy policy', terms: 'Terms of use',
    delH: 'Delete my account',
    delP: 'This deletes your account and everything kept with it: your profile, your week and your practice history, straight away. It cannot be undone.',
    delTick: 'I understand. Delete my account and my data.',
    delGo: 'Delete my account',
    errFailed: 'Your account could not be deleted just now. Nothing was removed. Please try again.',
    errUnavailable: 'Deleting an account is not switched on yet. Write to us and we will do it for you.',
    signOut: 'Sign out',
  },
  ko: {
    title: '계정', signedInAs: '로그인 계정', signIn: '로그인하면 계정 정보가 보입니다.',
    legalH: '나의 데이터', privacy: '개인정보 처리방침', terms: '이용약관',
    delH: '계정 삭제',
    delP: '계정과 함께 보관된 모든 것(프로필, 나의 주간, 연습 기록)이 즉시 삭제됩니다. 되돌릴 수 없습니다.',
    delTick: '이해했습니다. 계정과 데이터를 삭제합니다.',
    delGo: '계정 삭제',
    errFailed: '지금은 계정을 삭제하지 못했어요. 아무것도 삭제되지 않았습니다. 다시 시도해 주세요.',
    errUnavailable: '계정 삭제 기능이 아직 켜지지 않았어요. 문의해 주시면 대신 삭제해 드립니다.',
    signOut: '로그아웃',
  },
};

export default function AccountView({ name, email, signedIn, error }: { name: string | null; email: string | null; signedIn: boolean; error: string | null }) {
  const c = useCopy(C);
  const [sure, setSure] = useState(false);

  return (
    <main className="wrap legal account">
      <h1>{c.title}</h1>
      {!signedIn ? (
        <p className="lede">
          <Link href={signInHref('/account')}>{c.signIn}</Link>
        </p>
      ) : (
        <>
          <p className="lede">
            {c.signedInAs} <b>{email ?? name}</b>
          </p>
          <form action="/auth/signout" method="post">
            <button className="pill ghost onpaper sm" type="submit">{c.signOut}</button>
          </form>

          <section>
            <h2>{c.legalH}</h2>
            <p>
              <Link href="/privacy">{c.privacy}</Link> · <Link href="/terms">{c.terms}</Link>
            </p>
          </section>

          <section className="danger">
            <h2>{c.delH}</h2>
            <p>{c.delP}</p>
            {error && <p className="err">{error === 'unavailable' ? c.errUnavailable : c.errFailed}</p>}
            {/* A form POST with the ticked box in it: nothing deletes an account
                by being loaded or by a stray click. */}
            <form action="/api/account/delete" method="post">
              <label className="tick">
                <input type="checkbox" name="confirm" value="delete" checked={sure} onChange={e => setSure(e.target.checked)} />
                {c.delTick}
              </label>
              <button className="pill sm delete" type="submit" disabled={!sure}>
                {c.delGo}
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
