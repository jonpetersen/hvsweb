// Asserts on the built dist/ output. Requires `npm run build` to have been
// run first — these tests FAIL (not skip) with a clear message if dist/ is
// missing, per CLAUDE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// consts.ts re-exports these from site-data.js verbatim (see CLAUDE.md) —
// import the plain-JS module directly since plain Node can't import .ts.
import { SITE_NAME, CONTACT, HOURS, NAV } from '../src/lib/site-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..');
const distDir = path.join(repoRoot, 'dist');

if (!existsSync(distDir)) {
  test('dist/ exists', () => {
    assert.fail(
      'dist/ does not exist — run "npm run build" first, then re-run the tests.'
    );
  });
} else {
  const ROUTES = [
    { route: '/', title: 'Home', navHref: '/' },
    { route: '/theshop/', title: 'The Shop', navHref: '/theshop/' },
    { route: '/thecafe/', title: 'The Café/Deli', navHref: '/thecafe/' },
    { route: '/post-office/', title: 'The Post Office', navHref: '/post-office/' },
    { route: '/volunteering/', title: 'Volunteering', navHref: '/volunteering/' },
    { route: '/gallery/', title: 'Gallery', navHref: '/gallery/' },
    // Nav label is "Our History"; the page <title> is the longer
    // "Our History 1922–2022" — both come from the same page, tested
    // separately below.
    { route: '/history/', title: 'Our History 1922–2022', navHref: '/history/' },
  ];

  /** @param {string} route */
  function distFileForRoute(route) {
    return path.join(distDir, route, 'index.html');
  }

  /** @param {string} route */
  function readRoute(route) {
    return readFileSync(distFileForRoute(route), 'utf8');
  }

  // ---------------------------------------------------------------------
  // (a) every expected route exists, plus the PDF and CNAME
  // ---------------------------------------------------------------------

  test('every expected route has a dist/<route>/index.html', () => {
    for (const { route } of ROUTES) {
      assert.ok(
        existsSync(distFileForRoute(route)),
        `missing dist${route}index.html`
      );
    }
  });

  test('the history PDF is published at the site root', () => {
    const pdfPath = path.join(distDir, 'hvs1922_2022.pdf');
    assert.ok(existsSync(pdfPath), 'dist/hvs1922_2022.pdf is missing');
    assert.ok(statSync(pdfPath).size > 0, 'dist/hvs1922_2022.pdf is empty');
  });

  test('CNAME is published with the exact expected content', () => {
    const cnamePath = path.join(distDir, 'CNAME');
    assert.ok(existsSync(cnamePath), 'dist/CNAME is missing');
    const content = readFileSync(cnamePath, 'utf8').trim();
    assert.equal(content, 'www.hambledonvillageshop.co.uk');
  });

  // ---------------------------------------------------------------------
  // (b) every internal href/src/srcset resolves to a file in dist/
  // ---------------------------------------------------------------------

  /** @param {string} url */
  function isExternalOrSkippable(url) {
    if (!url) return true;
    return (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('//') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('#') ||
      url.startsWith('data:')
    );
  }

  /** @param {string} url */
  function resolvesToFile(url) {
    const clean = url.split('#')[0].split('?')[0];
    if (!clean.startsWith('/')) return false; // every internal URL here is root-relative
    const rel = clean.slice(1);
    const direct = path.join(distDir, rel);
    if (existsSync(direct) && statSync(direct).isFile()) return true;
    // trailing-slash "directory" route -> its index.html
    const asIndex = path.join(distDir, rel, 'index.html');
    if (existsSync(asIndex)) return true;
    return false;
  }

  /** @param {string} html */
  function extractUrls(html) {
    /** @type {string[]} */
    const urls = [];
    const attrRegex = /\s(?:href|src|srcset)="([^"]*)"/g;
    let m;
    while ((m = attrRegex.exec(html))) {
      const value = m[1];
      if (value.includes(',') && / \d+w|\d+x/.test(value)) {
        // srcset: "url1 400w, url2 800w"
        for (const part of value.split(',')) {
          const url = part.trim().split(/\s+/)[0];
          if (url) urls.push(url);
        }
      } else {
        urls.push(value);
      }
    }
    return urls;
  }

  function allDistHtmlFiles() {
    /** @type {string[]} */
    const files = [];
    (function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.html')) files.push(full);
      }
    })(distDir);
    return files;
  }

  test('every internal href/src/srcset in every built page resolves to a file in dist/', () => {
    const htmlFiles = allDistHtmlFiles();
    assert.ok(htmlFiles.length > 0, 'no built HTML files found under dist/');

    const broken = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      for (const url of extractUrls(html)) {
        if (isExternalOrSkippable(url)) continue;
        if (!resolvesToFile(url)) {
          broken.push(`${path.relative(distDir, file)} -> ${url}`);
        }
      }
    }
    assert.deepEqual(broken, [], `broken internal links:\n${broken.join('\n')}`);
  });

  // ---------------------------------------------------------------------
  // (c) exactly one active nav item per page, and it is the right one
  // ---------------------------------------------------------------------

  test('each page has exactly one active nav item, and it is the right one', () => {
    for (const { route, navHref } of ROUTES) {
      const html = readRoute(route);
      const navMatch = html.match(/<nav class="main-nav">[\s\S]*?<\/nav>/);
      assert.ok(navMatch, `${route}: no <nav class="main-nav"> found`);
      const nav = navMatch[0];

      const activeMatches = nav.match(/<li class="active">/g) ?? [];
      assert.equal(
        activeMatches.length,
        1,
        `${route}: expected exactly one active nav item, found ${activeMatches.length}`
      );

      assert.ok(
        NAV.some((item) => item.href === navHref),
        `${route}: NAV has no entry for href "${navHref}"`
      );

      const activeLiMatch = nav.match(/<li class="active">\s*<a href="([^"]+)"/);
      assert.ok(activeLiMatch, `${route}: could not find the active <a href>`);
      assert.equal(
        activeLiMatch[1],
        navHref,
        `${route}: active nav item points to ${activeLiMatch[1]}, expected ${navHref}`
      );
    }
  });

  // ---------------------------------------------------------------------
  // (d) exact titles
  // ---------------------------------------------------------------------

  test('page titles are exact', () => {
    for (const { route, title } of ROUTES) {
      const html = readRoute(route);
      const expected = `<title>${title} – ${SITE_NAME}</title>`;
      assert.ok(
        html.includes(expected),
        `${route}: expected title tag ${expected}, not found`
      );
    }
  });

  // ---------------------------------------------------------------------
  // (e) hours strings from consts appear on the right pages
  // ---------------------------------------------------------------------

  test('shop hours appear on the home page', () => {
    const html = readRoute('/');
    assert.ok(html.includes(HOURS.shop.range));
    assert.ok(html.includes(HOURS.shop.lastOrdersTime));
    assert.ok(html.includes(HOURS.postOffice.weekdayRange));
    assert.ok(html.includes(HOURS.postOffice.saturdayRange));
  });

  test('shop hours appear on the shop page', () => {
    const html = readRoute('/theshop/');
    assert.ok(html.includes(HOURS.shop.range));
  });

  test('shop hours appear on the café page', () => {
    const html = readRoute('/thecafe/');
    assert.ok(html.includes(HOURS.shop.range));
    assert.ok(html.includes(HOURS.shop.lastOrdersTime));
  });

  test('post office hours appear on the post office page', () => {
    const html = readRoute('/post-office/');
    assert.ok(html.includes(HOURS.postOffice.weekdayRange));
    assert.ok(html.includes(HOURS.postOffice.saturdayRange));
  });

  // ---------------------------------------------------------------------
  // (f) every <img> has a non-empty alt
  // ---------------------------------------------------------------------

  test('every <img> in every built page has a non-empty alt attribute', () => {
    const htmlFiles = allDistHtmlFiles();
    const violations = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      const imgRegex = /<img\b[^>]*>/g;
      let m;
      while ((m = imgRegex.exec(html))) {
        const tag = m[0];
        const altMatch = tag.match(/\salt="([^"]*)"/);
        if (!altMatch || altMatch[1].trim() === '') {
          violations.push(`${path.relative(distDir, file)}: ${tag}`);
        }
      }
    }
    assert.deepEqual(violations, [], `<img> tags missing alt text:\n${violations.join('\n')}`);
  });

  // ---------------------------------------------------------------------
  // (g) no reference to mozilla.github.io
  // ---------------------------------------------------------------------

  test('no built page references mozilla.github.io', () => {
    const htmlFiles = allDistHtmlFiles();
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      assert.ok(
        !html.includes('mozilla.github.io'),
        `${path.relative(distDir, file)} references mozilla.github.io`
      );
    }
  });

  // ---------------------------------------------------------------------
  // (h) tel and mailto links are correct
  // ---------------------------------------------------------------------

  test('the tel link is correct on the home page', () => {
    const html = readRoute('/');
    assert.ok(html.includes(`href="${CONTACT.phoneHref}"`));
  });

  test('mailto links are correct and keep their ?ref= query strings', () => {
    const home = readRoute('/');
    assert.ok(
      home.includes(`href="mailto:${CONTACT.email}?ref=hambledon-village-shop-post-office"`)
    );

    const volunteering = readRoute('/volunteering/');
    assert.ok(
      volunteering.includes(
        `href="mailto:${CONTACT.email}?ref=hambledon-village-shop-volunteering"`
      )
    );
  });
}
