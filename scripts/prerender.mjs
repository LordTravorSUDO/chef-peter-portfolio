import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const serverEntry = path.join(root, 'dist-ssr', 'prerender-entry.js');
const template = await readFile(path.join(distDir, 'index.html'), 'utf8');
const { prerenderRoutes, renderSeoPage, renderRoute } = await import(pathToFileURL(serverEntry).href);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const setMeta = (html, attribute, key, value) => {
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n  </head>`);
};

for (const route of prerenderRoutes) {
  const { html: appHtml, page } = renderSeoPage(route);
  const canonicalUrl = `https://www.chefpetertheteacher.com${route}`;
  let output = template;

  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.metaTitle)}</title>`);
  output = setMeta(output, 'name', 'description', page.description);
  output = setMeta(output, 'property', 'og:title', page.metaTitle);
  output = setMeta(output, 'property', 'og:description', page.description);
  output = setMeta(output, 'property', 'og:url', canonicalUrl);
  output = setMeta(output, 'name', 'twitter:title', page.metaTitle);
  output = setMeta(output, 'name', 'twitter:description', page.description);

  const canonicalPattern = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
  output = canonicalPattern.test(output)
    ? output.replace(canonicalPattern, canonicalTag)
    : output.replace('</head>', `  ${canonicalTag}\\n  </head>`);

  // Structured data is rendered by the page component itself (src/lib/seo/schema.ts).
  output = output.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const fileName = route.slice(1) + '.html';
  await writeFile(path.join(distDir, fileName), output, 'utf8');
  console.log(`Prerendered ${route} -> dist/${fileName}`);
}

// ── Homepage ────────────────────────────────────────────────────────────────
// Written to dist/home.html — NOT index.html, which stays the empty SPA shell
// used as the fallback for every other route (and by the Edge middleware for
// article pages). middleware.ts serves home.html for "/". The <head> of the
// template already contains the homepage title, description, canonical and
// Open Graph tags (index.html defaults).
{
  const appHtml = renderRoute('/');
  const output = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  await writeFile(path.join(distDir, 'home.html'), output, 'utf8');
  console.log('Prerendered / -> dist/home.html');
}

await mkdir(path.join(distDir, 'seo'), { recursive: true });
await writeFile(
  path.join(distDir, 'seo', 'prerender-manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), routes: ['/', ...prerenderRoutes], files: { '/': 'home.html' } }, null, 2),
  'utf8'
);
