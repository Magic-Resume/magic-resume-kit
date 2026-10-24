import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { publicPackages, root } from './packages.mjs';
const output = join(root, '.artifacts');
mkdirSync(output, {recursive: true});
const artifacts = [];
function targets(value) {
  if (typeof value === 'string') return [value];
  return Object.values(value ?? {}).flatMap(targets);
}
for (const pkg of publicPackages()) {
  let file = join(output, `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`);
  execFileSync('pnpm', ['pack', '--out', file], {cwd: join(root, 'packages', pkg.dir), stdio: 'pipe'});
  const digest = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);
  const immutableFile = file.replace(/\.tgz$/, `-${digest}.tgz`);
  renameSync(file, immutableFile); file = immutableFile;
  const files = execFileSync('tar', ['-tzf', file], {encoding: 'utf8'}).split('\n').filter(Boolean).map(f => f.replace(/^package\//, ''));
  const packed = JSON.parse(execFileSync('tar', ['-xOzf', file, 'package/package.json'], {encoding: 'utf8'}));
  assert.equal(packed.name, pkg.name);
  assert.equal(packed.version, pkg.version);
  assert.ok(files.includes('LICENSE') && files.includes('README.md'), `${pkg.name}: missing license or README`);
  assert.ok(files.some(f => f.startsWith('dist/') && f.endsWith('.js')), `${pkg.name}: no compiled JS`);
  assert.ok(!files.some(f => /(?:^|\/)(?:node_modules|src|test|\.env)|\.test\.|\.tsbuildinfo$|\.(?:woff2?|ttf|otf)$/.test(f)), `${pkg.name}: source, tests, fonts or build metadata in archive`);
  assert.ok(!JSON.stringify(packed).includes('workspace:'), `${pkg.name}: workspace protocol left in archive`);
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(packed[section] ?? {})) {
      assert.ok(!/^(?:file:|link:)/.test(version), `${pkg.name}: local runtime dependency`);
      if (name.startsWith('@magic-resume-kit/')) assert.equal(version, publicPackages().find(p => p.name === name)?.version);
    }
  }
  for (const target of [...targets(packed.exports), ...targets(packed.bin)]) {
    if (target.includes('*')) assert.ok(files.some(f => f.startsWith(target.replace('./', '').split('*')[0])));
    else assert.ok(files.includes(target.replace(/^\.\//, '')), `${pkg.name}: missing export ${target}`);
  }
  artifacts.push({name: pkg.name, version: pkg.version, file});
  console.log(`${pkg.name}@${pkg.version}: ${files.length} files, exports and manifest passed`);
}
writeFileSync(join(output, 'manifest.json'), JSON.stringify(artifacts, null, 2) + '\n');
