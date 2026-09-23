import type { Metadata } from 'next';
import AppNav from '@/components/AppNav';
import Catalogue from './Catalogue';
import { ALL_AREAS, FILTERS, type Filter } from './view';
import { getCatalogue } from '@/lib/catalogue';
import './masterplan.css';

export const metadata: Metadata = {
  title: 'The Masterplan',
  description: 'Every module on the shelf, across seven areas of your dancing.',
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default async function MasterplanPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; f?: string }>;
}) {
  const { area, f } = await searchParams;

  /* The shelf comes from the database now, so what the back office publishes is
     what this page shows. */
  const areas = await getCatalogue();

  /* Area and filter are read on the server so a linked view renders correctly
     on first paint rather than snapping into place after hydration. */
  const initialArea =
    area === 'all' ? ALL_AREAS : clamp(parseInt(area ?? '', 10) || 0, 0, Math.max(0, areas.length - 1));
  const initialFilter: Filter = FILTERS.includes(f as Filter) ? (f as Filter) : 'all';

  return (
    <>
      <AppNav current="masterplan" />
      <Catalogue areas={areas} initialArea={initialArea} initialFilter={initialFilter} />
    </>
  );
}
