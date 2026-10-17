import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';

/* Deleting your own account, from the Account page.

   A form POST, not a link, so nothing can trigger it by being loaded; the
   form must also carry confirm=delete, the box the member ticked. The member
   is identified by their own session first — the secret key below is never
   reached without one, and it deletes only that one user. Every table that
   holds a member's data references auth.users with ON DELETE CASCADE, so the
   profile, the week, the practice log and the progress go with the account. */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!isConfigured) return NextResponse.redirect(`${origin}/`, { status: 303 });

  const form = await request.formData();
  if (form.get('confirm') !== 'delete') return NextResponse.redirect(`${origin}/account`, { status: 303 });

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(`${origin}/signin?next=%2Faccount`, { status: 303 });

  const { createServiceClient, hasServiceKey } = await import('@/lib/supabase/service');
  if (!hasServiceKey()) return NextResponse.redirect(`${origin}/account?error=unavailable`, { status: 303 });
  const { error } = await createServiceClient().auth.admin.deleteUser(data.user.id);
  if (error) {
    console.error('[account] delete failed:', error.message);
    return NextResponse.redirect(`${origin}/account?error=failed`, { status: 303 });
  }

  /* The account is gone; clear this browser's session cookies too. */
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return NextResponse.redirect(`${origin}/?deleted=1`, { status: 303 });
}
