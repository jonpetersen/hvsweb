// Pure index arithmetic for the lightbox gallery. Kept dependency-free and
// framework-free so it can be unit tested directly with node:test and
// imported unchanged by the client-side Astro <script>.

/**
 * The index of the next item in a wrapping list.
 * @param {number} i - current index
 * @param {number} len - number of items in the list
 * @returns {number} the next index, wrapping to 0 after the last item;
 *   0 when the list is empty
 */
export function nextIndex(i, len) {
  if (len <= 0) return 0;
  return (i + 1) % len;
}

/**
 * The index of the previous item in a wrapping list.
 * @param {number} i - current index
 * @param {number} len - number of items in the list
 * @returns {number} the previous index, wrapping to the last item before
 *   index 0; 0 when the list is empty
 */
export function prevIndex(i, len) {
  if (len <= 0) return 0;
  return (i - 1 + len) % len;
}
