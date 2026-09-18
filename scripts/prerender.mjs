import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const serverEntry = path.join(root, 'dist-ssr', 'prerender-entry.js');
const template = await readFile(path.join(distDir, 'index.html'), 'utf8');
const { prerenderRoutes, renderSeoPage } = await import(pathToFileURL(serverEntry).href);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const setMeta = (html, attribute, key, value) => {
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\\n  </head>`);
};

for (const route of prerenderRoutes) {
  const { html: appHtml, page } = renderSeoPage(route);
  const canonicalUrl = `https://www.chefpetertheteacher.com${route}`;
  let output = template;

  output = output.replace(/<title>[\\s\\S]*?<\\/title>/i, `<title>${escapeHtml(page.metaTitle)}</title>`);
  output = setMeta(output, 'name', 'description', page.description);
  output = setMeta(output, 'property', 'og:title', page.metaTitle);
  output = setMeta(output, 'property', 'og:description', page.description);
  output = setMeta(output, 'property', 'og:url', canonicalUrl);
  output = setMeta(output, 'name', 'twitter:title', page.metaTitle);
  output = setMeta(output, 'name', 'twitter:description', page.description);

  const canonicalPattern = /<link\\s+[^>]*rel=["']canonical["'][^>]*>/i;
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
  output = canonicalPattern.test(output)
    ? output.replace(canonicalPattern, canonicalTag)
    : output.replace('</head>', `  ${canonicalTag}\\n  </head>`);

  const primarySchema = page.path === '/about-chef-peter'
    ? {
        '@type': 'Person',
        name: 'Chef Peter the Teacher',
        alternateName: 'Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa',
        jobTitle: 'Certified Professional Chef, Consultant Chef and Culinary Educator',
        description: page.description,
        url: canonicalUrl,
        image: 'https://www.chefpetertheteacher.com/images/chef-peter.jpg',
        knowsAbout: ['Culinary Consultancy', 'Hospitality Operations', 'Menu Engineering', 'Professional Chef Training', 'Baking and Pastry']
      }
    : {
        '@type': 'Service',
        name: page.title,
        description: page.description,
        url: canonicalUrl,
        areaServed: { '@type': 'Country', name: 'Uganda' },
        provider: {
          '@type': 'Person',
          name: 'Chef Peter the Teacher',
          jobTitle: 'Certified Professional Chef and Consultant Chef',
          url: 'https://www.chefpetertheteacher.com/about-chef-peter'
        }
      };

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      primarySchema,
      {
        '@type': 'FAQPage',
        mainEntity: page.faqs.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.chefpetertheteacher.com/' },
          { '@type': 'ListItem', position: 2, name: page.title, item: canonicalUrl }
        ]
      }
    ]
  };

  output = output.replace(
    '</head>',
    `  <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>\\n  </head>`
  );
  output = output.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const fileName = route.slice(1) + '.html';
  await writeFile(path.join(distDir, fileName), output, 'utf8');
  console.log(`Prerendered ${route} -> dist/${fileName}`);
}

await mkdir(path.join(distDir, 'seo'), { recursive: true });
await writeFile(
  path.join(distDir, 'seo', 'prerender-manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), routes: prerenderRoutes }, null, 2),
  'utf8'
);
