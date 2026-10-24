import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { packages, root } from './packages.mjs';
for (const pkg of packages()) rmSync(join(root, 'packages', pkg.dir, 'dist'), { recursive: true, force: true });
