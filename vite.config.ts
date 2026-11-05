import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {siteGraph, jsonLdString} from './src/lib/seo/schema';

/** Injects the site-wide JSON-LD graph (src/lib/seo/schema.ts) into index.html. */
function siteJsonLd(): Plugin {
  return {
    name: 'site-jsonld',
    transformIndexHtml(html) {
      return html.replace('<!-- __SITE_JSONLD__ -->', `<script type="application/ld+json">${jsonLdString(siteGraph())}</script>`);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), siteJsonLd()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
