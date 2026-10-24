import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicNames = ['design-system', 'icons', 'resume-schema', 'resume-templates', 'utils', 'mcp'];
export function packages() {
  return readdirSync(join(root, 'packages')).map(dir => ({dir, ...JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'))}));
}
export function publicPackages() { return packages().filter(pkg => !pkg.private); }
