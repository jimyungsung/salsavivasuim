import { NextResponse } from 'next/server';
import { getMember } from '@/lib/member';

/* Who is signed in, for the prototype's nav — the static screens under
   /prototype cannot ask the server any other way, and without this they drew a
   hard-coded name and no Admin link. Chrome only, like getMember() itself. */
export async function GET() {
  return NextResponse.json(await getMember(), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
