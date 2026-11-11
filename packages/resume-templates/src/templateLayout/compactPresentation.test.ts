import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blueLineTemplate } from '../config/blue-line-template';
import { compactPresentationStyles } from './compactPresentation';

for (const [value, expected] of [['16px', 16], ['12pt', 16], ['1rem', 16], ['1em', 16], ['3mm', 96 * 3 / 25.4]] as const) {
  test(`compact metrics preserve ${value} in CSS pixels before PDF conversion`, () => {
    const tokens = structuredClone(blueLineTemplate.designTokens);
    tokens.typography.fontSize.sm = value;
    tokens.typography.letterSpacing = value;
    tokens.spacing.md = value;
    const styles = compactPresentationStyles(tokens);
    for (const actual of [styles.body.fontSize, styles.body.letterSpacing, styles.items.gap]) {
      assert.ok(Math.abs(Number(actual) - expected) < 1e-10, `${actual} should equal ${expected}`);
    }
  });
}
