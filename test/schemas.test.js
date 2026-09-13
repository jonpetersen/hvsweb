import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryItemSchema } from '../src/lib/schemas.js';

// Called with no image() factory, schemas.js falls back to a plain
// non-empty-string check so this module stays importable by plain Node.
const schema = galleryItemSchema();

test('accepts a valid gallery item', () => {
  const result = schema.safeParse({ image: 'bread.jpg', alt: 'Fresh bread' });
  assert.equal(result.success, true);
});

test('rejects a missing alt', () => {
  const result = schema.safeParse({ image: 'bread.jpg' });
  assert.equal(result.success, false);
});

test('rejects an empty alt', () => {
  const result = schema.safeParse({ image: 'bread.jpg', alt: '' });
  assert.equal(result.success, false);
});

test('rejects a missing image', () => {
  const result = schema.safeParse({ alt: 'Fresh bread' });
  assert.equal(result.success, false);
});
