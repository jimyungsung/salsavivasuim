'use client';

/* The gate's sign-in button, sent back to the admin page it was pressed on.
   A client component only because the layout rendering the gate cannot see
   the path it is on. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signInHref } from '@/lib/safe-next';

export default function SignInLink() {
  return (
    <Link className="pill primary" href={signInHref(usePathname())}>
      Sign in ↗
    </Link>
  );
}
