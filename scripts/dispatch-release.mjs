import { execFileSync } from 'node:child_process';
import { publicNames } from './packages.mjs';
const packages = JSON.parse(process.env.PUBLISHED_PACKAGES || '[]');
if (!Array.isArray(packages) || !packages.length) throw new Error('No published packages');
for (const pkg of packages) {
  if (!publicNames.some(name => pkg.name === `@magic-resume-kit/${name}`) || !/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('Invalid published package');
}
for (const repo of ['Magic-Resume', 'Magic-Resume-Commercial']) {
  execFileSync('gh', ['api', '--method', 'POST', `repos/Magic-Resume/${repo}/dispatches`, '--input', '-'], {
    input: JSON.stringify({event_type: 'magic-packages-published', client_payload: {packages}}), stdio: ['pipe', 'inherit', 'inherit'],
  });
}
