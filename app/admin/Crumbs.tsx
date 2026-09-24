/* Where you are: every level above this screen, each a link. Replaces a single
   "← Catalogue", which made reaching a sibling session two screens away. */

import Link from 'next/link';

export default function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link href="/admin">Catalogue</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="sep" aria-hidden="true">/</span>
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
