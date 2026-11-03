/**
 * /admin/seo — Global SEO reference and sitemap instructions.
 */
import React from 'react';
import { Search, Info } from 'lucide-react';

export default function AdminSeoPage() {
  const domain = 'https://www.chefpetertheteacher.com';
  return (
    <div className="space-y-6 max-w-3xl">
      <title>SEO | Chef Peter CMS</title>
      <meta name="robots" content="noindex, nofollow" />

      <div>
        <h1 className="text-2xl font-bold text-[#1B365D]">SEO</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Per-article SEO settings live in the article editor. This page covers global settings.</p>
      </div>

      {/* Sitemap */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#4A777A]" />
          <h2 className="text-sm font-semibold text-[#1A2B40]">Sitemap</h2>
        </div>
        <p className="text-sm text-[#6B7A8D]">
          The sitemap at <a href={`${domain}/sitemap.xml`} target="_blank" rel="noopener noreferrer" className="text-[#4A777A] underline">{domain}/sitemap.xml</a> currently contains only the homepage.
        </p>
        <p className="text-sm text-[#6B7A8D]">
          Dynamic sitemap generation (including all published article URLs) will be added in Milestone 4. Until then, submit your article URLs manually in Google Search Console.
        </p>
      </div>

      {/* Robots */}
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#4A777A]" />
          <h2 className="text-sm font-semibold text-[#1A2B40]">Robots & indexing</h2>
        </div>
        <ul className="text-sm text-[#6B7A8D] space-y-2">
          <li>✅ <span className="text-[#1A2B40]">All /admin/* routes</span> send <code className="font-mono text-xs bg-[#F4F6F8] px-1 rounded">X-Robots-Tag: noindex, nofollow</code> via Vercel headers.</li>
          <li>✅ <span className="text-[#1A2B40]">Per-article noindex</span> is set in the article editor under SEO settings.</li>
          <li>✅ <span className="text-[#1A2B40]">Articles marked noindex</span> are also excluded from public RLS queries.</li>
        </ul>
      </div>

      {/* Article SEO tips */}
      <div className="bg-[#F4F6F8] rounded-xl border border-[#DDE3EA] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#1A2B40]">Per-article SEO checklist</h2>
        <ul className="text-sm text-[#6B7A8D] space-y-2">
          <li>• <strong className="text-[#1A2B40]">SEO title</strong> — max 70 characters. Defaults to article title if empty.</li>
          <li>• <strong className="text-[#1A2B40]">Meta description</strong> — max 160 characters. Defaults to excerpt.</li>
          <li>• <strong className="text-[#1A2B40]">Canonical URL</strong> — leave empty unless syndicating to another domain.</li>
          <li>• <strong className="text-[#1A2B40]">Featured image</strong> — used as og:image for social sharing previews.</li>
          <li>• <strong className="text-[#1A2B40]">Slug</strong> — keep short, descriptive and lowercase.</li>
        </ul>
      </div>
    </div>
  );
}
