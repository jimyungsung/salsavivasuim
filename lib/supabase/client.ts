'use client';

/* The browser client. Reads the publishable key, which is safe to ship — every
   table is protected by row-level security, not by hiding the key. */

import { createBrowserClient } from '@supabase/ssr';
import { requireConfig } from './config';

export function createClient() {
  const { url, key } = requireConfig();
  return createBrowserClient(url, key);
}
