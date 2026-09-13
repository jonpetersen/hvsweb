import { z } from 'zod';

// The gallery item schema, as a factory rather than a fixed schema, because
// Astro's real `image()` validator (which checks the referenced file exists
// on disk and is only available inside a content collection's `schema`
// callback) can't be imported by plain Node. Callers inside Astro pass the
// real `image` function through; node:test calls this with no argument and
// gets a plain non-empty-string check instead, which is enough to exercise
// the `alt` rule this module owns.

/**
 * Build the Zod schema for one gallery grid item.
 * @param {() => import('zod').ZodType} [imageSchema] - Astro's `image()`
 *   helper from a content collection's schema factory. Omit to fall back to
 *   a plain string check (used by unit tests run under plain Node).
 * @returns {import('zod').ZodObject<any>}
 */
export function galleryItemSchema(imageSchema) {
  return z.object({
    image: imageSchema ? imageSchema() : z.string().min(1),
    alt: z.string().min(1, 'alt text is required'),
  });
}
