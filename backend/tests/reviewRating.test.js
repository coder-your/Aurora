import test from 'node:test';
import assert from 'node:assert/strict';
import { inferReviewStarRating } from '../services/reviewRating.service.js';

test('infers a high rating for strongly positive review text', () => {
  const rating = inferReviewStarRating('This book was absolutely beautiful, moving, and unforgettable. I loved every page.');
  assert.ok(rating >= 4);
});

test('infers a low rating for strongly negative review text', () => {
  const rating = inferReviewStarRating('This was dull, confusing, and disappointing. I hated it.');
  assert.ok(rating <= 2);
});

test('uses a neutral default when the review text is empty or weak', () => {
  const rating = inferReviewStarRating('');
  assert.equal(rating, 3);
});
