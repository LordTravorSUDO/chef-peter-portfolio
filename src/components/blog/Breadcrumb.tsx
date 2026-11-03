/**
 * Breadcrumb — accessible breadcrumb navigation for article/category/tag pages.
 * Outputs BreadcrumbList JSON-LD structured data inline.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  crumbs: Crumb[];
}

const SITE_URL = 'https://www.chefpetertheteacher.com';

export default function Breadcrumb({ crumbs }: Props) {
  const ldJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
    })),
  });

  return (
    <>
      <script type="application/ld+json">{ldJson}</script>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6A6A6A] flex-wrap">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-[#3A3A3A] shrink-0" />}
              {!isLast && crumb.href ? (
                <Link to={crumb.href} className="hover:text-[#C5A059] transition">
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-[#A09E98]' : ''}>{crumb.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
