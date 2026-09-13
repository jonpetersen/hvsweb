import test from 'node:test';
import assert from 'node:assert/strict';
import { isActive } from '../src/lib/nav.js';

test('matches an exact path', () => {
  assert.equal(isActive('/theshop/', '/theshop/'), true);
});

test('matches regardless of a missing trailing slash on either side', () => {
  assert.equal(isActive('/theshop', '/theshop/'), true);
  assert.equal(isActive('/theshop/', '/theshop'), true);
});

test('does not match a different page', () => {
  assert.equal(isActive('/thecafe/', '/theshop/'), false);
});

test('root only matches root, not every page', () => {
  assert.equal(isActive('/', '/'), true);
  assert.equal(isActive('/theshop/', '/'), false);
  assert.equal(isActive('/gallery/', '/'), false);
});
