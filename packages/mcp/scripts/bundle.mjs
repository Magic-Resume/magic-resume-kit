/*
 * Publishable JS for `npx -y @magic-resume-kit/mcp`.
 *
 * Bundle the schema and registry so CLI consumers do not need the React or PDF
 * dependency graph. Only the MCP runtime dependencies stay external. tsc still
 * emits the .d.ts files (--emitDeclarationOnly); they reference no workspace
 * package, so they ship as they are.
 */
import { build } from 'esbuild';
import { readFile, readdir, rm } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).flatMap((name) => [name, `${name}/*`]);

// A previous plain-tsc or `dev` build leaves one .js per module; only the two
// bundled entries may be published.
for (const file of await readdir('dist')) {
  if (file.endsWith('.js')) await rm(`dist/${file}`);
}

await build({
  entryPoints: ['src/cli.ts', 'src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external,
  logLevel: 'warning',
});
