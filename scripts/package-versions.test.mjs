import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUpdate, validatePublished } from '../templates/package-versions.mjs';
test('update classification never downgrades or silently merges majors', () => {
  assert.equal(classifyUpdate('1.2.3', '1.2.4'), 'compatible');
  assert.equal(classifyUpdate('1.2.3', '1.3.0'), 'compatible');
  assert.equal(classifyUpdate('1.2.3', '2.0.0'), 'major');
  assert.equal(classifyUpdate('2.0.0', '1.9.9'), 'skip');
  assert.equal(classifyUpdate('1.2.3', '1.2.3'), 'skip');
  assert.throws(() => classifyUpdate('workspace:*', '1.0.0'));
});
test('dispatch accepts only stable allowlisted public package versions', () => {
  assert.equal(validatePublished([{name: '@magic-resume-kit/icons', version: '1.0.0'}]).length, 1);
  assert.throws(() => validatePublished([{name: '@magic-resume-kit/icons', version: '2.0.0-beta.1'}]));
  assert.throws(() => validatePublished([{name: 'unrelated-package', version: '1.0.0'}]));
  assert.throws(() => validatePublished([{name: '@magic-resume-kit/icons', version: '1.0.0'}, {name: '@magic-resume-kit/icons', version: '1.0.1'}]));
});
