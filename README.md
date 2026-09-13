# Hambledon Village Shop website

The public brochure site for Hambledon Village Shop — a community-owned shop,
café/deli and Post Office in Hambledon, Surrey.

Live at **https://www.hambledonvillageshop.co.uk**.

Built with [Astro](https://astro.build) + TypeScript, Tailwind CSS (utilities
only, no preflight — see CLAUDE.md), Zod content collections for the image
galleries, and [Lucide](https://lucide.dev) icons. Migrated from a Jekyll
site in September 2026.

## Hosting

- **GitHub Pages**, deployed by GitHub Actions using the Pages artifact flow (`actions/upload-pages-artifact` + `actions/deploy-pages`) — not the legacy Jekyll auto-build. The repo's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment), otherwise `deploy-pages` fails.
- **Custom domain**: `www.hambledonvillageshop.co.uk`, configured by `public/CNAME` (built into `dist/CNAME`) and shown under Settings → Pages. The apex redirects to `www` (GitHub does this automatically).
- **DNS** is at Cloudflare (zone `hambledonvillageshop.co.uk`): the apex has `A` records to GitHub Pages (185.199.108.153, .109.153, .110.153, .111.153); `www` is a `CNAME` to `jonpetersen.github.io`, **DNS only (grey cloud)** so GitHub can issue and renew the HTTPS certificate. The same zone also holds `dashboard.` (hvs-dashboard VPS), `ups.` (Cloudflare tunnel) and mail records — don't touch those.
- **Verified domain**: `hambledonvillageshop.co.uk` is verified on the `jonpetersen` GitHub account (Settings → Pages → Verified domains), backed by the TXT record `_github-pages-challenge-jonpetersen.hambledonvillageshop.co.uk`. **Never delete that TXT record** — it is what stops another GitHub account claiming the domain.
- **The repo must stay public.** Free-plan GitHub Pages only serves public repos.

### What went wrong in 2026 (why the above matters)
In 2026 the repo was briefly made private, which removed its Pages site. DNS still pointed at GitHub, so another GitHub account attached `hambledonvillageshop.co.uk` to its own Pages site (serving an empty page from ~28 Aug 2026) and GitHub then refused the domain as "already taken". Recovery in Sept 2026: verify the domain on the jonpetersen account (TXT challenge record), re-create Pages with the GitHub Actions source, re-attach the custom domain, set `www` to DNS-only, enforce HTTPS.

## Local development

Requires Node ≥22.

```bash
npm ci
npm run dev       # http://localhost:4321
npm run check     # astro check (TypeScript)
npm run build     # -> dist/
npm run preview   # serve the built dist/ locally
npm test          # node:test — see "Tests" below
```

## Keeping the MacBook in sync

The Mac mini and MacBook (`jons-macbook-neo`) both have a checkout at `~/dev/hvsweb`, cloned over HTTPS (the repo is public, so fetching needs no credentials). On the MacBook a LaunchAgent runs `scripts/autopull.sh` every 15 minutes (and at login): it **only fast-forwards** `main` to `origin/main`. It never resets, rebases, stashes, merges or runs `npm install`, and it skips (logging why) when the checkout is on another branch, has uncommitted changes to tracked files, has unpushed commits, has diverged, or git holds `index.lock`. An untracked local file that collides with an incoming file also blocks the fast-forward and is logged as `DIVERGED`.

- Log: `~/Library/Logs/hvsweb-autopull.log` (launchd's own output: `hvsweb-autopull.launchd.log`)
- Install / reinstall:
  ```bash
  cp launchd/com.jonpetersen.hvsweb-autopull.plist ~/Library/LaunchAgents/
  launchctl bootout gui/$(id -u)/com.jonpetersen.hvsweb-autopull 2>/dev/null; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.jonpetersen.hvsweb-autopull.plist
  ```
- Check it: `launchctl print gui/$(id -u)/com.jonpetersen.hvsweb-autopull | grep -E 'state|last exit'` and `tail ~/Library/Logs/hvsweb-autopull.log`
- After a pull that changes `package.json`, run `npm ci` yourself before `npm run dev`.

## Editing common things

- **Opening hours** — edit `src/lib/site-data.js` (the `HOURS` export).
  Every page that shows hours (home, shop, café, post office) imports it via
  `src/consts.ts`, so a single edit updates them all.
- **Add a gallery photo** — drop the image file into `src/assets/images/`,
  then add `{ "image": "../../assets/images/<file>", "alt": "<description>" }`
  to the relevant JSON file under `src/content/galleries/` (`theshop.json`,
  `thecafe.json`, `post-office.json`, `volunteering.json`, `gallery.json`).
  `alt` is required and non-empty (enforced by the Zod schema in
  `src/lib/schemas.js`), and the image path is validated to exist by
  Astro's content-collection `image()` helper at build time.
- **Replace the history PDF** — overwrite `public/hvs1922_2022.pdf` with the
  new file of the same name (the history page loads `/hvs1922_2022.pdf`
  directly).
- **Nav items / contact details / Instagram handle / Mapbox
  token+coordinates** — all in `src/lib/site-data.js`, re-exported by
  `src/consts.ts`.

## Tests

`node --test test/*.test.js` (also what `npm test` runs). No test
framework dependency — just Node's built-in runner.

- `test/gallery-nav.test.js`, `test/nav.test.js` — pure-logic unit tests for
  the lightbox index arithmetic (`src/lib/gallery-nav.js`) and the nav
  active-state rule (`src/lib/nav.js`).
- `test/schemas.test.js` — the gallery item Zod schema
  (`src/lib/schemas.js`) rejects a missing/empty `alt` and accepts valid
  items.
- `test/build-output.test.js` — runs against `dist/` (run `npm run build`
  first; these fail with a clear message rather than skipping if `dist/` is
  missing). Checks: every route builds; the PDF and `CNAME` are published
  correctly; every internal `href`/`src`/`srcset` in every page resolves to
  a real file in `dist/`; each page has exactly one active nav item and
  it's the right one; page titles are exact; the opening-hours strings
  (imported from consts, not re-typed) appear on the right pages; every
  `<img>` has a non-empty `alt`; nothing references the old
  `mozilla.github.io` pdf.js demo URL; the tel/mailto links are correct.
- `test/workflow.test.js` — parses `.github/workflows/deploy.yml` as text
  and asserts the `deploy` job `needs:` the `test` job, so a broken or
  removed dependency between them is caught.
- `test/autopull.test.js` — runs `scripts/autopull.sh` against real temporary git repos (bare origin + clones): fast-forwards when behind; leaves the checkout untouched when up to date, dirty, ahead, diverged, on another branch, locked, or missing; untracked files don't block a pull.

Run under both Node versions before trusting a change:

```bash
npm test                              # local Node
npx -y -p node@22 node --test test/*.test.js   # CI's Node version
```

## CI/CD

`.github/workflows/deploy.yml`, on push to `main`, on `pull_request`, and on
`workflow_dispatch`:

- **`test` job**: checkout, Node 22 (`actions/setup-node` with npm cache),
  `npm ci`, `npm run check`, `npm run build`, `npm test`. On `main`
  (push/dispatch, not PRs) it also uploads `dist/` as a Pages artifact.
- **`deploy` job**: `needs: test`; only runs on `main` and never on pull
  requests; deploys the artifact with `actions/deploy-pages`.

**Push to `main` = deploy.** To check a deploy: GitHub → Actions tab → the
latest "Deploy" run, or GitHub → Settings → Pages for the current live
deployment status/URL.

## Secrets

| Secret | Where | Notes |
|---|---|---|
| — | — | None. The Mapbox token in `src/lib/site-data.js` is a `pk.` **public** token — Mapbox public tokens are designed to be shipped client-side. It should be URL-restricted to this site's domain in the Mapbox account dashboard. |
| GitHub Pages deploy | GitHub Actions | Uses the workflow's built-in `GITHUB_TOKEN` via `id-token: write` / `pages: write` permissions — no manually managed secret. |
