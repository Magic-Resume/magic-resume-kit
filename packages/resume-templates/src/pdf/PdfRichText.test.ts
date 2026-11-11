import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pdfListMarkerOpticalOffset } from './PdfRichText';

test('PDF list marker is lifted relative to the geometric line-box center', () => {
  assert.ok(Math.abs(pdfListMarkerOpticalOffset(10, 1.3) - -1.5) < 1e-12);
  assert.equal(pdfListMarkerOpticalOffset(10, 1), 0);
  assert.equal(pdfListMarkerOpticalOffset(10, 0.9), 0);
});

for (const [lineHeight, offset] of [[1, 0], [1.3, -1.5], [1.5, -2.5], [1.65, -3.25]] as const) {
  test(`first-line em-box alignment compensates leading at line height ${lineHeight}`, () => {
    assert.ok(Math.abs(pdfListMarkerOpticalOffset(10, lineHeight) - offset) < 1e-12);
    assert.ok(Math.abs(10 * lineHeight / 2 + offset - 5) < 1e-12, 'marker center stays at half the em size');
  });
}
