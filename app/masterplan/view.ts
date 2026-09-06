/* Shared between the server page, which reads the view off the query string,
   and the client catalogue, which owns it from then on.

   These live outside Catalogue.tsx because a value imported from a 'use client'
   module into a server component arrives as a client reference, not the value
   itself — only components survive that crossing. */

export const ALL_AREAS = -1;

export type Filter = 'all' | 'open' | 'now' | 'soon';
export const FILTERS: Filter[] = ['all', 'open', 'now', 'soon'];

export const FILTER_COPY_KEY = {
  all: 'fAll', open: 'fOpen', now: 'fNow', soon: 'fSoon',
} as const;
