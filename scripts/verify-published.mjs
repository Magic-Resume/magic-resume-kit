import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { publicPackages, root } from './packages.mjs';
import { verifyAfterPublication } from './registry-propagation.mjs';

await verifyAfterPublication(() => {
  const result = spawnSync(process.execPath, [join(root, 'scripts/consumer-smoke.mjs'), '--registry'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}, publicPackages());
