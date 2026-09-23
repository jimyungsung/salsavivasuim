'use client';

/* Sign up and sign in, which are the same screen with a different promise.

   Sign-in is a link sent to an email address — there is no password to remember,
   which is what the prototype already told people. `shouldCreateUser` is the
   only difference between the two modes: registering makes an account, signing
   in refuses to, so a typo in an email address on the sign-in screen does not
   quietly create a second empty account. */

import Link from 'next/link';
import { useState } from 'react';
import { useCopy, useLang } from '@/lib/lang';
import type { Copy } from '@/lib/lang';
import { isConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { QUESTIONS, type Answers } from './onboarding';

type Key =
  | 'sideH1' | 'sideH2' | 'sideP' | 'back'
  | 's1' | 's1h' | 's1p' | 'signInH' | 'signInP'
  | 'lblEmail' | 'phEmail' | 'or' | 'alt1' | 'alt2'
  | 's2' | 's2h' | 's2p'
  | 'cta' | 'skip' | 'ctaIn' | 'sending' | 'legal'
  | 'sentH' | 'sentP' | 'failH' | 'setupH' | 'setupP'
  | 'noEmailH' | 'noEmailP' | 'toSignIn' | 'toRegister' | 'toSignInQ' | 'toRegisterQ';

const C: Copy<Key> = {
  en: {
    sideH1: 'Ten movements you understand beat', sideH2: 'fifty you memorised.',
    sideP: 'Three questions about your dancing, then your first session is ready. No card, nothing to install.',
    back: 'suim.com',
    s1: 'Your account', s1h: 'Create your account',
    s1p: 'We send a sign-in link — there is no password to remember.',
    signInH: 'Sign in', signInP: 'We send a link to your email. No password to remember.',
    lblEmail: 'Email', phEmail: 'you@example.com', or: 'OR',
    alt1: 'Continue with Google', alt2: 'Continue with Apple',
    s2: 'About your dancing', s2h: 'So we start you in the right place',
    s2p: 'You can change any of this later, or skip it entirely.',
    cta: 'Create account and see the modules ↗', skip: 'Skip the questions',
    ctaIn: 'Send the sign-in link ↗', sending: 'Sending…',
    legal: 'By continuing you agree to the terms and privacy policy.',
    sentH: 'Check your email', sentP: 'We sent a link to {email}. Open it on this device and you are in.',
    failH: 'That did not work',
    setupH: 'Accounts are not switched on yet',
    setupP: 'The Supabase project has not been created. Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local and this screen starts working.',
    noEmailH: 'Add your email first', noEmailP: 'We need somewhere to send the link.',
    toSignIn: 'Sign in', toRegister: 'Create one',
    toSignInQ: 'Already have an account?', toRegisterQ: 'No account yet?',
  },
  ko: {
    sideH1: '제대로 이해한 10개의 동작이', sideH2: '외운 50개보다 낫습니다.',
    sideP: '세 가지 질문에 답하면 첫 세션이 준비됩니다. 카드 등록도, 설치할 것도 없습니다.',
    back: 'suim.com',
    s1: '계정', s1h: '계정 만들기',
    s1p: '로그인 링크를 보내드립니다. 기억할 비밀번호가 없습니다.',
    signInH: '로그인', signInP: '이메일로 링크를 보내드립니다. 비밀번호는 필요 없습니다.',
    lblEmail: '이메일', phEmail: 'you@example.com', or: '또는',
    alt1: 'Google로 계속하기', alt2: 'Apple로 계속하기',
    s2: '당신의 춤에 대해', s2h: '맞는 지점에서 시작할 수 있도록',
    s2p: '나중에 언제든 바꿀 수 있고, 건너뛰어도 됩니다.',
    cta: '계정 만들고 모듈 보기 ↗', skip: '질문 건너뛰기',
    ctaIn: '로그인 링크 받기 ↗', sending: '보내는 중…',
    legal: '계속하면 이용약관과 개인정보 처리방침에 동의하는 것으로 간주됩니다.',
    sentH: '이메일을 확인하세요', sentP: '{email}로 링크를 보냈습니다. 이 기기에서 열면 로그인됩니다.',
    failH: '문제가 발생했습니다',
    setupH: '계정 기능이 아직 켜지지 않았습니다',
    setupP: 'Supabase 프로젝트가 아직 생성되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 채우면 이 화면이 동작합니다.',
    noEmailH: '이메일을 입력해 주세요', noEmailP: '링크를 보낼 주소가 필요합니다.',
    toSignIn: '로그인', toRegister: '계정 만들기',
    toSignInQ: '이미 계정이 있으신가요?', toRegisterQ: '계정이 없으신가요?',
  },
};

type Status = { kind: 'idle' | 'sending' } | { kind: 'sent'; email: string } | { kind: 'error'; message: string };

export default function AuthPanel({
  mode,
  next = '/masterplan',
}: {
  mode: 'register' | 'signin';
  /** Where to land after the link is followed. Already checked to be a path on this site. */
  next?: string;
}) {
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { lang, T } = useLang();
  const c = useCopy(C);
  const registering = mode === 'register';

  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const busy = status.kind === 'sending';

  async function sendLink(withAnswers: boolean) {
    if (!isConfigured) {
      setStatus({ kind: 'error', message: c.setupP });
      return;
    }
    if (!email.trim()) {
      setStatus({ kind: 'error', message: c.noEmailP });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          /* Registering creates the account; signing in must not, so a mistyped
             address cannot silently become a second empty account. */
          shouldCreateUser: registering,
          emailRedirectTo: callback(),
          data: { locale: lang, ...(withAnswers ? answers : {}) },
        },
      });
      if (error) setStatus({ kind: 'error', message: error.message });
      else setStatus({ kind: 'sent', email: email.trim() });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function withProvider(provider: 'google' | 'apple') {
    if (!isConfigured) {
      setStatus({ kind: 'error', message: c.setupP });
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback() },
      });
      if (error) setStatus({ kind: 'error', message: error.message });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="auth">
      <main className="split">
        <aside className="side">
          <Link className="logo" href="/prototype/index.html">
            SUIM<span className="dot">.</span>
          </Link>
          <div>
            <h2>
              {c.sideH1} <em>{c.sideH2}</em>
            </h2>
            <p>{c.sideP}</p>
            <div className="steps" aria-hidden="true">
              <span className="on" />
              <span className={registering ? 'on' : undefined} />
              <span />
            </div>
          </div>
        </aside>

        <section className="form">
          <div className="formin">
            <Link className="crumb" href="/prototype/index.html">
              <span aria-hidden="true">←</span>
              <span>{c.back}</span>
            </Link>

            <div className="step">
              <div className="stepno">
                <i>1</i>
                <span>{c.s1}</span>
              </div>
              <h3>{registering ? c.s1h : c.signInH}</h3>
              <p className="hint">{registering ? c.s1p : c.signInP}</p>

              <label htmlFor="email">{c.lblEmail}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={c.phEmail}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') sendLink(true);
                }}
              />

              <div className="or">
                <span>{c.or}</span>
              </div>
              <div className="alt">
                <button className="pill ghost onpaper" type="button" onClick={() => withProvider('google')}>
                  {c.alt1}
                </button>
                <button className="pill ghost onpaper" type="button" onClick={() => withProvider('apple')}>
                  {c.alt2}
                </button>
              </div>
            </div>

            {registering && (
              <div className="step">
                <div className="stepno">
                  <i>2</i>
                  <span>{c.s2}</span>
                </div>
                <h3>{c.s2h}</h3>
                <p className="hint">{c.s2p}</p>

                {QUESTIONS.map(q => (
                  <div className="q" key={q.field}>
                    <p>{T(q.prompt)}</p>
                    <div className="chips">
                      {q.choices.map(choice => (
                        <button
                          key={choice.value}
                          className="chip"
                          type="button"
                          aria-pressed={answers[q.field] === choice.value}
                          onClick={() =>
                            setAnswers(a => ({
                              ...a,
                              /* Tapping the chosen chip again clears it — every
                                 question is optional, so every answer is undoable. */
                              [q.field]: a[q.field] === choice.value ? undefined : choice.value,
                            }))
                          }
                        >
                          {T(choice.label)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="go">
              <button
                className="pill primary"
                type="button"
                aria-busy={busy}
                onClick={() => sendLink(true)}
              >
                {busy ? c.sending : registering ? c.cta : c.ctaIn}
              </button>

              {registering && (
                <button
                  className="pill ghost onpaper"
                  type="button"
                  aria-busy={busy}
                  onClick={() => sendLink(false)}
                >
                  {c.skip}
                </button>
              )}

              {!isConfigured && (
                <div className="notice">
                  <b>{c.setupH}</b>
                  {c.setupP}
                </div>
              )}

              {status.kind === 'sent' && (
                <div className="notice good">
                  <b>{c.sentH}</b>
                  {c.sentP.replace('{email}', status.email)}
                </div>
              )}

              {status.kind === 'error' && (
                <div className="notice bad">
                  <b>{c.failH}</b>
                  {status.message}
                </div>
              )}

              <p className="legal">{c.legal}</p>

              <p className="swap">
                {registering ? c.toSignInQ : c.toRegisterQ}{' '}
                <Link href={registering ? '/signin' : '/register'}>
                  {registering ? c.toSignIn : c.toRegister}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
