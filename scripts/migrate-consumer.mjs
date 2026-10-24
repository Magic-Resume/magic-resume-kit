import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import YAML from 'yaml';
import { publicNames, root as kitRoot } from './packages.mjs';
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
if (!option('--repo')) throw new Error('Usage: node scripts/migrate-consumer.mjs --repo PATH [--version 1.0.0] [--write] [--tarballs PATH]');
const root = resolve(option('--repo'));
const version = option('--version') || '1.0.0';
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected an exact stable version');
if (JSON.parse(readFileSync(join(root, 'apps/web/package.json'), 'utf8')).name !== '@magic-resume/web') throw new Error('Expected a Magic Resume application checkout');
if (execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim()) throw new Error('Use a clean checkout; commit or stash unrelated changes first');
const publicPath = name => `packages/${name}/`;
const names = new Set(publicNames.map(n => `@magic-resume-kit/${n}`));
const files = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
const replacements = new Map();
for (const file of files) {
  if (publicNames.some(n => file.startsWith(publicPath(n))) || !existsSync(join(root, file))) continue;
  if (!/\.(?:[cm]?[jt]sx?|json|css|astro|ya?ml|mdx?)$/.test(file) && !file.endsWith('Dockerfile')) continue;
  // Historical prose, lockfile and API docs are not code migration targets.
  if (file === 'pnpm-lock.yaml' || file.startsWith('docs/')) continue;
  const before = readFileSync(join(root, file), 'utf8');
  let after = before.replace(/@magic-resume\/(resume-schema|resume-templates|design-system|icons|utils|mcp)(?=$|[^a-zA-Z0-9_-])/g, '@magic-resume-kit/$1');
  if (file.endsWith('package.json')) {
    const pkg = JSON.parse(after);
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) for (const name of Object.keys(pkg[section] ?? {})) if (names.has(name)) pkg[section][name] = version;
    if (file === 'package.json') {
      pkg.devDependencies ||= {};
      // Root-level architecture checks resolve these contracts directly.
      pkg.devDependencies['@magic-resume-kit/design-system'] = version;
      pkg.devDependencies['@magic-resume-kit/resume-schema'] = version;
    }
    after = JSON.stringify(pkg, null, 2) + '\n';
  }
  after = after.replace(/\.\.\/\.\.\/\.\.\/\.\.\/packages\/(resume-templates|design-system)\/src/g, '../../node_modules/@magic-resume-kit/$1/dist');
  if (file.startsWith('scripts/')) {
    after = after.replace(/packages\/design-system\/styles/g, 'node_modules/@magic-resume-kit/design-system/styles');
    after = after.replace(/packages\/design-system\/src/g, 'node_modules/@magic-resume-kit/design-system/dist');
    // The shared design-system source rules are now owned by the kit CI.
  }
  if (file === 'scripts/check-entity.mjs') {
    const start = after.indexOf("const schema = read('packages/resume-schema/src/index.ts');");
    const end = after.indexOf('\nfor (const [locale, forms]', start);
    if (start < 0 || end < 0) throw new Error('Entity check changed; review migration');
    after = after.slice(0, start) + "const { templateIds } = await import('@magic-resume-kit/resume-schema');" + after.slice(end);
  }
  if (file === 'tsconfig.json') {
    const config = JSON.parse(after);
    config.references = (config.references || []).filter(ref => !publicNames.some(n => ref.path === `./packages/${n}`));
    after = JSON.stringify(config, null, 2) + '\n';
  }
  if (file.endsWith('/scripts/verify-custom-sections.tsx')) {
    after = after.replace('../../../packages/resume-templates/src/registry', '@magic-resume-kit/resume-templates/registry')
      .replace('../../../packages/resume-templates/src/renderer/MagicResumeRenderer', '@magic-resume-kit/resume-templates/renderer/MagicResumeRenderer')
      .replace('../../../packages/resume-templates/src/pdf/MagicResumePdfDocument', '@magic-resume-kit/resume-templates/server');
  }
  if (file.endsWith('/scripts/subset-fonts.mjs')) {
    after = after.replace("import subsetFont from 'subset-font';", "import subsetFont from 'subset-font';\nimport { CJK_SUBSET_CHARSET } from '@magic-resume-kit/resume-templates/pdf/charset';");
    const start = after.indexOf('const RUNTIME_CHARSET_MODULE =');
    const end = after.indexOf('\n\n', start);
    if (start < 0 || end < 0) throw new Error('Font generator changed; review migration');
    after = after.slice(0, start) + `const RUNTIME_CHARSET_MODULE = process.env.MAGIC_RESUME_TEMPLATES_SRC
  ? path.join(path.resolve(process.env.MAGIC_RESUME_TEMPLATES_SRC), 'pdf/cjk-subset-charset.ts')
  : null;
const subsetChars = [...new Set([...charset].filter((c) => !/\\s/.test(c)))].join('');
if (!RUNTIME_CHARSET_MODULE && subsetChars !== CJK_SUBSET_CHARSET) {
  throw new Error('Charset differs from the published renderer. Set MAGIC_RESUME_TEMPLATES_SRC to the kit resume-templates/src directory, regenerate and release the matching package before using these fonts.');
}` + after.slice(end);
    after = after.replace('const writeRuntimeCharsetModule = () => {', "const writeRuntimeCharsetModule = () => {\n  if (!RUNTIME_CHARSET_MODULE) { console.log('Font charset matches the published renderer.'); return; }");
  }
  if (file.endsWith('Dockerfile')) after = after.split('\n').filter(line => !publicNames.some(n => line.startsWith(`COPY packages/${n}/`))).join('\n');
  if (after !== before) replacements.set(file, after);
}
const workspace = YAML.parse(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'));
workspace.overrides = {...workspace.overrides, '@react-pdf/layout': '4.6.1', '@react-pdf/render': '4.5.1', '@react-pdf/textkit': '6.3.0'};
workspace.minimumReleaseAgeExclude = [...new Set([...(workspace.minimumReleaseAgeExclude || []), '@magic-resume-kit/*'])];
if (option('--tarballs')) {
  const artifacts = JSON.parse(readFileSync(join(resolve(option('--tarballs')), 'manifest.json'), 'utf8'));
  for (const pkg of artifacts) {
    if (!names.has(pkg.name) || pkg.version !== version) throw new Error('Tarball manifest differs from requested package set/version');
    workspace.overrides[pkg.name] = `file:${resolve(pkg.file)}`;
  }
  if (artifacts.length !== publicNames.length) throw new Error('Expected all six tarballs');
}
replacements.set('pnpm-workspace.yaml', YAML.stringify(workspace));
let npmrc = readFileSync(join(root, '.npmrc'), 'utf8');
if (!npmrc.includes('@magic-resume-kit:registry=')) npmrc += '\n@magic-resume-kit:registry=https://registry.npmjs.org/\n';
replacements.set('.npmrc', npmrc);
for (const [source, destination] of [
  ['templates/bump-magic-packages.yml', '.github/workflows/bump-magic-packages.yml'],
  ['templates/update-magic-packages.mjs', '.github/magic-packages/update.mjs'],
  ['templates/package-versions.mjs', '.github/magic-packages/package-versions.mjs'],
]) replacements.set(destination, readFileSync(join(kitRoot, source), 'utf8').replace("commit-message: ':arrow_up: chore(deps): update public resume packages'", existsSync(join(root, 'packages/commercial-runtime')) ? "commit-message: 'chore(deps): update public resume packages'" : "commit-message: ':arrow_up: chore(deps): update public resume packages'"));
const deletes = publicNames.filter(n => existsSync(join(root, 'packages', n))).map(n => `packages/${n}`);
console.log(JSON.stringify({mode: args.includes('--write') ? 'write' : 'preview', version, changedFiles: replacements.size, removeDirectories: deletes, localTarballs: !!option('--tarballs')}, null, 2));
if (!args.includes('--write')) process.exit(0);
for (const [file, text] of replacements) { mkdirSync(dirname(join(root, file)), {recursive: true}); writeFileSync(join(root, file), text); }
for (const dir of deletes) rmSync(join(root, dir), {recursive: true});
for (const file of ['@react-pdf__layout@4.6.1.patch', '@react-pdf__render@4.5.1.patch', '@react-pdf__textkit@6.3.0.patch']) {
  mkdirSync(join(root, 'patches'), {recursive: true});
  cpSync(join(kitRoot, 'patches', file), join(root, 'patches', file));
}
console.log('Migration prepared. Run pnpm install --no-frozen-lockfile, review the diff and run application CI before committing. Local tarball overrides are for scratch validation only.');
