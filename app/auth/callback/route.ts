import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';

/* Where the email link and the OAuth providers come back to.

   Exchanges the one-time code for a session, writes the cookies, and sends the
   member on. `next` is checked to be a path on this site: an open redirect here
   would let a phishing link borrow the sign-in flow. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/masterplan';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/masterplan';

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(reason)}`);

  if (!isConfigured) return fail('Accounts are not switched on yet.');
  if (!code) return fail(searchParams.get('error_description') ?? 'That link is missing its code.');

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next}`);
}
