import { getCollection } from 'astro:content';
import type { ImageMetadata } from 'astro';

export interface GalleryItem {
  image: ImageMetadata;
  alt: string;
}

/**
 * Load one page's gallery grid items by content-collection entry id
 * (the JSON filename under src/content/galleries/, without extension).
 */
export async function getGalleryItems(id: string): Promise<GalleryItem[]> {
  const gallery = await getCollection('galleries', (entry) => entry.id === id);
  // Astro's `image()` schema helper types loosely as an opaque return type
  // from the caller's perspective; cast once here to the concrete shape our
  // components expect rather than at every call site.
  return (gallery[0]?.data.items ?? []) as unknown as GalleryItem[];
}
