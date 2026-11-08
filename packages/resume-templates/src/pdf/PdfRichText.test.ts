import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pdfListMarkerOpticalOffset } from './PdfRichText';

test('PDF list marker is lifted relative to the geometric line-box center', () => {
  assert.ok(Math.abs(pdfListMarkerOpticalOffset(10, 1.3) - -1.5) < 1e-12);
  assert.equal(pdfListMarkerOpticalOffset(10, 1), 0);
  assert.equal(pdfListMarkerOpticalOffset(10, 0.9), 0);
});
