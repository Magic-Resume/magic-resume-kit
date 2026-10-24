import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packages, publicNames, root } from './packages.mjs';
const failures = [];
const all = packages();
const actual = all.filter(p => !p.private).map(p => p.dir).sort();
if (JSON.stringify(actual) !== JSON.stringify([...publicNames].sort())) failures.push('Unexpected public package set');
for (const pkg of all) {
  if (pkg.name !== `@magic-resume-kit/${pkg.dir}`) failures.push(`${pkg.dir}: invalid package name`);
  if (pkg.private) continue;
  if (pkg.license !== 'MIT' || pkg.publishConfig?.access !== 'public' || pkg.publishConfig?.registry !== 'https://registry.npmjs.org/') failures.push(`${pkg.name}: invalid public metadata`);
  if (pkg.repository?.url !== 'git+https://github.com/Magic-Resume/magic-resume-kit.git') failures.push(`${pkg.name}: invalid repository`);
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
    if (name.startsWith('@magic-resume/')) failures.push(`${pkg.name}: old/private dependency ${name}`);
    if (name === '@magic-resume-kit/tsconfig') failures.push(`${pkg.name}: private tsconfig runtime dependency`);
    if (/^(?:file:|link:|git\+|https?:)/.test(spec)) failures.push(`${pkg.name}: non-registry dependency ${name}`);
  }
}
const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
const rules = [
  ['real storage bucket', /pub-(?!0{32}\.)[a-f0-9]{32}\.r2\.dev/i],
  ['private application repository', /github\.com[/:]Magic-Resume\/(?:Magic-Resume-Commercial|Magic-Resume-Core|Magic-SDK)(?:[/.#\s]|$)/i],
  ['internal infrastructure host', /\b(?:hk1|prt|admin|agent-service|platform-api)\.(?:magic-resume\.(?:cn|com)|internal)\b/i],
  ['private IP address', /https?:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)/],
  ['local user path', /\/(?:Users|home)\/[a-zA-Z][\w.-]+\//],
  ['credential', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|npm_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/],
];
for (const file of new Set(tracked)) {
  if (!existsSync(join(root, file)) || file === 'scripts/check-boundary.mjs') continue;
  const text = readFileSync(join(root, file), 'utf8');
  for (const [label, pattern] of rules) if (pattern.test(text)) failures.push(`${file}: ${label}`);
  if (file.startsWith('packages/') && !file.endsWith('README.md') && /(?:from\s*|import\s*\()\s*['"][^'"]*(?:apps\/web|@clerk|commercial-)/.test(text)) failures.push(`${file}: app-only import`);
}
for (const file of ['@react-pdf__layout@4.6.1.patch', '@react-pdf__render@4.5.1.patch', '@react-pdf__textkit@6.3.0.patch']) {
  if (readFileSync(join(root, 'patches', file), 'utf8') !== readFileSync(join(root, 'packages/resume-templates/patches', file), 'utf8')) failures.push(`Published PDF patch differs: ${file}`);
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Public boundary passed (${actual.length} publishable packages).`);
