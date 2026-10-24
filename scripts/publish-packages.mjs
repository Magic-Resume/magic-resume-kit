import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { publicPackages, root } from './packages.mjs';
const pending = readdirSync(join(root, '.changeset')).filter(file => file.endsWith('.md') && file !== 'README.md');
assert.equal(pending.length, 0, 'Run pnpm version-packages and commit the resulting versions before publishing.');
const artifacts = JSON.parse(readFileSync(join(root, '.artifacts/manifest.json'), 'utf8'));
const packages = publicPackages();
assert.equal(artifacts.length, packages.length);
assert.equal(new Set(artifacts.map(pkg => pkg.name)).size, packages.length);
// Dependencies first; MCP embeds schema/registry and remains independent at runtime.
const order = ['resume-schema', 'icons', 'design-system', 'utils', 'resume-templates', 'mcp'];
for (const dir of order) {
  const pkg = packages.find(pkg => pkg.dir === dir);
  const artifact = artifacts.find(artifact => artifact.name === pkg.name);
  assert.equal(artifact?.version, pkg.version);
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${pkg.version}`);
  if (response.ok) {
    const published = await response.json();
    assert.equal(published.name, pkg.name);
    assert.equal(published.repository?.url, pkg.repository.url);
    console.log(`${pkg.name}@${pkg.version} already exists; keeping the immutable published version.`);
    continue;
  }
  assert.equal(response.status, 404, `Cannot determine publication status for ${pkg.name}: HTTP ${response.status}`);
  const args = ['publish', artifact.file, '--access', 'public', '--registry=https://registry.npmjs.org/', '--ignore-scripts'];
  if (process.env.GITHUB_ACTIONS === 'true') args.push('--provenance');
  execFileSync('npm', args, {cwd: root, stdio: 'inherit'});
}
