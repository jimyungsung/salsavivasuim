import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';
import { safeNext, signInHref } from '@/lib/safe-next';

/* Where the email link and the OAuth providers come back to.

   Exchanges the one-time code for a session, writes the cookies, and sends the
   member on. `next` is checked to be a path on this site: an open redirect here
   would let a phishing link borrow the sign-in flow. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  /* An expired or reused link lands back on sign-in with the reason shown, and
     still knows where the member was going. */
  const fail = (reason: string) => {
    const back = new URL(signInHref(next), origin);
    back.searchParams.set('error', reason);
    return NextResponse.redirect(back);
  };

  if (!isConfigured) return fail('Accounts are not switched on yet.');
  if (!code) return fail(searchParams.get('error_description') ?? 'That link is missing its code.');

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
