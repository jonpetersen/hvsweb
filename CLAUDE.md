# CLAUDE.md

Agent-facing notes for this repo. `AGENTS.md` is a symlink to this file.
Humans should read `README.md` instead.

## What this is

Astro + TypeScript brochure site for Hambledon Village Shop, migrated from
Jekyll in September 2026. Deployed to GitHub Pages behind a custom domain.
See `README.md` for the hosting picture and day-to-day editing instructions.

## Layout

- `src/pages/*.astro` — one file per route (`index`, `theshop`, `thecafe`,
  `post-office`, `volunteering`, `gallery`, `history`). Each maps 1:1 to the
  old Jekyll page of the same name.
- `src/layouts/BaseLayout.astro` — the `<html>` shell: head/title, global
  CSS import, header/main/lightbox/footer, and the Mapbox script (home page
  only, via a `map` prop).
- `src/components/Header.astro`, `Footer.astro`, `Lightbox.astro`,
  `GalleryGrid.astro` — mirror the old `_includes/header.html`,
  `footer.html`, `overlay.html`, and the repeated image-grid markup.
- `src/consts.ts` — single source of truth for nav items, contact details,
  opening hours, Instagram handle, and Mapbox config. Re-exports everything
  from `src/lib/site-data.js` (see "Why site-data.js exists" below).
- `src/lib/` — plain `.js` logic modules, deliberately dependency- and
  Astro-free so `node --test` can import them directly:
  - `gallery-nav.js` — `nextIndex`/`prevIndex` wrap-around arithmetic for
    the lightbox.
  - `nav.js` — `isActive(currentPath, href)`, the nav active-state rule.
  - `schemas.js` — the gallery item Zod schema, as a factory
    (`galleryItemSchema(imageSchema?)`) so it works both inside Astro
    (passed the real `image()` validator) and under plain Node (falls back
    to a plain non-empty-string check).
  - `site-data.js` — the actual constants; see below.
  - `galleries.ts` — `getGalleryItems(id)`, a thin typed wrapper around
    `getCollection('galleries', …)` used by every page with a gallery.
- `src/content.config.ts` + `src/content/galleries/*.json` — one JSON file
  per gallery (`theshop`, `thecafe`, `post-office`, `volunteering`,
  `gallery`), each `{ items: [{ image, alt }, …] }`. `image` is validated by
  Astro's `image()` content-collection helper (file must exist, gets
  optimised at build time); `alt` must be a non-empty string.
- `src/assets/images/` — all site images, imported through `astro:assets`
  (via the collection for galleries, directly for featured images/logo/
  Instagram icon). **Never** reference `/images/...` as a plain URL string —
  that path no longer exists post-migration.
- `src/styles/global.css` — the original Jekyll `assets/css/styles.css`,
  verbatim, plus two lines of `@tailwind components; @tailwind utilities;`
  at the top (see "Tailwind" below).
- `public/` — files served as-is at the site root: `CNAME`,
  `hvs1922_2022.pdf`.
- `test/` — `node:test` suite; see README.md § Tests.
- `.github/workflows/deploy.yml` — CI/CD; see README.md § CI/CD.

## Commands

```bash
npm ci && npm run check && npm run build && npm test
```
is the standard "does this still work" check — run it before considering
any change done.

## Conventions / decisions (House Standards was silent on these)

- **Tailwind preflight is off** (`applyBaseStyles: false` in
  `astro.config.mjs`, and `global.css` loads only `@tailwind components;
  @tailwind utilities;`, never `@tailwind base;`). Preflight resets element
  defaults (headings, links, lists, etc.); turning it on would visibly
  change the site, which must look identical to the old Jekyll build.
  Tailwind utility classes are still available for any new work.
- **`legacy-peer-deps=true`** in `.npmrc` (mirrors the house Astro
  precedent, `clockhouse`). `@astrojs/tailwind@6` declares peer support only
  up to Astro 5, but works fine with Astro 7 in practice; this avoids a
  false `ERESOLVE` failure on `npm ci`.
- **`pdfjs-dist` (npm) replaces the old unpinned
  `//mozilla.github.io/pdf.js/build/...` demo scripts** on the history page.
  A pinned dependency beats a moving demo URL with no version guarantee —
  the worker is imported via `?url` and bundled by Astro/Vite, so nothing is
  fetched from a third party at runtime.
- **Mapbox GL stays a CDN `<script>`/`<link>`** (v2.7.0, pinned, home page
  only), not an npm dependency — it's a large library used on exactly one
  page, so bundling it would cost more than it's worth. The Mapbox token in
  `src/lib/site-data.js` is a `pk.` public token, designed to be shipped
  client-side; it should be URL-restricted to this domain in the Mapbox
  account (operational task, not something this repo can enforce).
- **`src/consts.ts` re-exports from `src/lib/site-data.js`** rather than
  holding the data itself, because plain Node (used by the test suite)
  cannot import a `.ts` file without a transpilation step, but can import
  `.js` directly. Tests import `site-data.js`; Astro code imports
  `consts.ts` (which is just a re-export, so both stay in sync from one
  source).
- **The gallery item schema lives in `src/lib/schemas.js`, as a factory
  function**, not a fixed Zod schema, so it can be unit-tested under plain
  Node (which can't provide Astro's real `image()` file-existence
  validator) while still being the actual schema Astro uses at build time.
- **`npm test` runs `node --test test/*.test.js` (shell-glob-expanded),
  not `node --test test/`.** On this machine's Node 26, `node --test
  test/` (or `test` with no glob) throws `MODULE_NOT_FOUND` — a Node
  regression around directory arguments — while `node --test` with no
  path at all works via its own recursive test discovery. Explicit
  shell-expanded file paths (`test/*.test.js`) sidestep both issues and
  behave identically on Node 22 (CI) and Node 26 (local); verified by
  running the suite under both.
- **Dead code dropped, not ported**: the old `gallery.js` had a second,
  unused `DOMContentLoaded` handler wired to a `.popup-image` class that no
  template ever used. Not carried over.
- **Existing stray unmatched `</div>` tags** in the old `theshop.html`,
  `thecafe.html`, `post-office.html`, and `gallery.html` are simply absent
  from the new hand-authored `.astro` templates — there was nothing to
  "fix" once the markup was rewritten with correctly balanced tags.

## Gotchas

- **Push to `main` = deploy.** There is no staging environment; a push to
  `main` that passes `npm run check && npm run build && npm test` in CI
  goes live via `actions/deploy-pages`.
- **The repo must stay public.** GitHub Pages on the free plan requires a
  public repo; making it private has previously (Sept 2026) silently lost
  the Pages configuration.
- **Keep URLs stable.** All pages use `trailingSlash: 'always'` and must
  keep exactly these paths: `/`, `/theshop/`, `/thecafe/`, `/post-office/`,
  `/volunteering/`, `/gallery/`, `/history/`. Do not add/remove trailing
  slashes or rename routes without a redirect plan — these URLs are shared
  externally (Google listing, printed material, Instagram bio, etc.).
- **Images live in `src/assets/` and are referenced through the content
  collection** (for galleries) or a direct `astro:assets` import (for
  featured images, the header logo, the Instagram icon) — never as a plain
  `/images/...` string.
- Astro's `image()` content-collection validator will fail the build (not
  silently pass) if a gallery JSON entry points at a file that doesn't
  exist — that's the enforcement mechanism for "every gallery image must
  exist," not a separate check.
- `test/build-output.test.js` requires `dist/` to exist (`npm run build`
  first); it fails loudly rather than skipping if it's missing.
