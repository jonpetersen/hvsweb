import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { galleryItemSchema } from './lib/schemas.js';

// Each JSON file under src/content/galleries/ is one page's image grid.
// `image` runs through Astro's `image()` helper, which both validates that
// the referenced file exists on disk and resolves it to an optimisable
// ImageMetadata object at build time.
const galleries = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/galleries' }),
  schema: ({ image }) =>
    z.object({
      items: z.array(galleryItemSchema(image)),
    }),
});

export const collections = { galleries };
