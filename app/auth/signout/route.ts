import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';

/* Sign out is a POST, so a link prefetch or an image tag cannot sign someone
   out by accident. */
export async function POST(request: NextRequest) {
  if (isConfigured) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${request.nextUrl.origin}/prototype/index.html`, { status: 303 });
}
