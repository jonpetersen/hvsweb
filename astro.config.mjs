// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.hambledonvillageshop.co.uk',
  trailingSlash: 'always',
  output: 'static',
  // applyBaseStyles: false — the site's look comes from the verbatim
  // styles.css import (src/styles/global.css). Tailwind's preflight/base
  // reset would change existing element defaults (headings, links, lists)
  // and break visual parity with the Jekyll site. Tailwind utility classes
  // remain available for new work; see CLAUDE.md.
  integrations: [tailwind({ applyBaseStyles: false }), sitemap()],
});
