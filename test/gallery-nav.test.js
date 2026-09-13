import test from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, prevIndex } from '../src/lib/gallery-nav.js';

test('nextIndex advances by one', () => {
  assert.equal(nextIndex(0, 5), 1);
  assert.equal(nextIndex(3, 5), 4);
});

test('nextIndex wraps from the last item to the first', () => {
  assert.equal(nextIndex(4, 5), 0);
});

test('prevIndex retreats by one', () => {
  assert.equal(prevIndex(3, 5), 2);
});

test('prevIndex wraps from the first item to the last', () => {
  assert.equal(prevIndex(0, 5), 4);
});

test('a single-item list always returns index 0', () => {
  assert.equal(nextIndex(0, 1), 0);
  assert.equal(prevIndex(0, 1), 0);
});

test('an empty list is handled safely without throwing', () => {
  assert.equal(nextIndex(0, 0), 0);
  assert.equal(prevIndex(0, 0), 0);
});
