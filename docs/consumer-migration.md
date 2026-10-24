# Moving application repositories to public packages

The public package repository is ready for local artifact verification before its first npm release. Keep working application checkouts on workspace dependencies until all six 1.0.0 packages have been published and verified on npmjs.

## Preview and apply

From this repository, preview the migration against a clean application checkout:

```sh
node scripts/migrate-consumer.mjs --repo ../Magic-Resume
node scripts/migrate-consumer.mjs --repo ../Magic-Resume-Commercial
```

After publication, use a clean integration branch or worktree and add `--write`. Then run `pnpm install --no-frozen-lockfile` in the application repository and review the full diff. The migration replaces imports and dependencies with exact `@magic-resume-kit/*` versions, removes the six public package directories, updates Tailwind scans and Docker copies, moves entity checks onto the published schema, retains PDF patches, updates template verification and font-generation paths, and installs the future update workflow. The private tsconfig directory remains for each application's own workspace packages.

For pre-release validation, run `pnpm check:packages`, create a disposable application checkout, and use `--tarballs /path/to/magic-resume-kit/.artifacts --write`. This adds local tarball overrides for verification. Archive filenames include a content hash so package-manager caches cannot reuse an earlier build of the same unpublished version. Never commit those absolute paths or use them in a release build. Regenerate and review the lockfile after removing local overrides and switching to published versions.

## Verification before merging

Run the application's typecheck, boundary, Tailwind and build checks. In the editor, check template switching, light and dark controls, PDF export and AI Lab. Run full tests in GitHub CI. Keep each application's font assets, GenUI, private packages and existing private registry configuration. `@magic-resume-kit` always resolves through npmjs.

Only after this initial migration is merged, enable `PUBLIC_PACKAGES_UPDATES_ENABLED=true` and configure the release bot. The workflow reacts to exact-version release events, checks weekly for missed releases and allows manual runs. It requires an existing daily integration branch. Patch/minor updates request auto-merge after CI; major updates get a breaking label and require review. It never deploys an application.

Font generation validates its charset against the installed renderer. If the charset changes, set `MAGIC_RESUME_TEMPLATES_SRC` to the kit `packages/resume-templates/src` directory, regenerate both font assets and the charset module, then release the matching template package. It never writes into node_modules.
