import { setTimeout } from 'node:timers/promises';

// Retry only the registry lag observed immediately after our own package release.
export async function verifyAfterPublication(run, packages, {
  attempts = 12,
  wait = () => setTimeout(10_000),
  log = console.log,
} = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = run();
    if (result.error) throw result.error;
    if (result.status === 0) return;
    const stderr = String(result.stderr ?? '');
    const unpublished = stderr.includes('npm error code ETARGET') && packages.some(pkg =>
      stderr.includes(`No matching version found for ${pkg.name}@${pkg.version}.`));
    if (!unpublished || attempt === attempts) {
      throw new Error(`Published package verification failed (exit ${result.status ?? result.signal ?? 'unknown'}).`);
    }
    log(`npm is still propagating a released version; retrying installation (${attempt}/${attempts}).`);
    await wait();
  }
}
