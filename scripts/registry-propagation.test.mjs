import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAfterPublication } from './registry-propagation.mjs';
const packages = [{name: '@magic-resume-kit/icons', version: '1.0.1'}];
const lag = {status: 1, stderr: 'npm error code ETARGET\nnpm error notarget No matching version found for @magic-resume-kit/icons@1.0.1.'};
const silent = {log: () => {}};

test('installation retries transient visibility of the exact released version', async () => {
  let runs = 0, waits = 0;
  await verifyAfterPublication(() => ++runs === 1 ? lag : {status: 0}, packages, {...silent, wait: async () => waits++});
  assert.equal(runs, 2);
  assert.equal(waits, 1);
});
test('successful installation completes without waiting', async () => {
  await verifyAfterPublication(() => ({status: 0}), packages, {...silent, wait: async () => assert.fail('unexpected retry')});
});
test('unrelated missing versions and other installation failures fail immediately', async () => {
  for (const stderr of [lag.stderr.replace('@magic-resume-kit/icons', 'unrelated'), lag.stderr.replace('1.0.1', '9.0.0'), 'npm error code E401']) {
    await assert.rejects(verifyAfterPublication(() => ({status: 1, stderr}), packages, {...silent, wait: async () => assert.fail('unexpected retry')}), /verification failed/);
  }
});
test('registry retries stop at the configured limit', async () => {
  let runs = 0, waits = 0;
  await assert.rejects(verifyAfterPublication(() => {runs++; return lag;}, packages, {...silent, attempts: 3, wait: async () => waits++}), /verification failed/);
  assert.equal(runs, 3);
  assert.equal(waits, 2);
});
test('process startup failures are preserved without retry', async () => {
  const error = new Error('spawn failed');
  await assert.rejects(verifyAfterPublication(() => ({error}), packages, {...silent, wait: async () => assert.fail('unexpected retry')}), err => err === error);
});
