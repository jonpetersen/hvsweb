// Pure nav active-state logic, shared between the header component (rendered
// at build time) and its unit tests.

/**
 * Strip a single trailing slash, except from the root path.
 * @param {string} path
 * @returns {string}
 */
function normalize(path) {
  if (!path) return '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

/**
 * Whether a nav link's href refers to the current page, ignoring a
 * trailing-slash mismatch on either side. The root path ("/") only matches
 * when the current path is itself the root — it must not mark every page
 * as active.
 * @param {string} currentPath - e.g. Astro.url.pathname
 * @param {string} href - the nav item's href
 * @returns {boolean}
 */
export function isActive(currentPath, href) {
  return normalize(currentPath) === normalize(href);
}
