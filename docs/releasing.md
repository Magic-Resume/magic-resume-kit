# Publishing Magic Resume Kit

Six public packages start at 1.0.0 under `@magic-resume-kit` on npmjs. The source repository is `Magic-Resume/magic-resume-kit`. The release workflow is gated by `PUBLIC_PACKAGES_PUBLISH_ENABLED=true` and runs only on `main`, on pushes or manual dispatch.

## Release workflow

The workflow installs dependencies without a release cache, builds, typechecks, runs the full unit suites, checks the public boundary and archives, and verifies an isolated installation. It publishes the exact checked archives using npm 11.21.1, then verifies anonymous installation from the registry, including a separate MCP-only installation. Existing versions are retained, so a partial publication can be safely resumed.

The workflow creates no pull requests and sends no application update events. It needs no GitHub App or cross-repository credentials. Changesets remains the local version/changelog tool: run `pnpm changeset`, then `pnpm version-packages` and commit the resulting versions before release. Pending changesets block publication rather than triggering a version PR. The private tsconfig workspace is never published.

## First release and authentication

The npm organization owner must have a verified email and enable account 2FA to configure trusted publishing. Packages must exist before a trusted publisher can be configured. After CI passes, use the logged-in maintainer to stage the six verified archives with `npm stage publish --access public`. For a new package, npm creates a public placeholder while keeping the staged release contents unpublished. This allows the trusted publisher to be configured before GitHub publishes the real 1.0.0 versions. After publication, reject any remaining bootstrap stages. This path needs no stored npm token. A short-lived scope-limited granular `NPM_TOKEN` secret is an optional alternative; never commit credentials.

For each of the six packages, bind npm Trusted Publishing to GitHub organization `Magic-Resume`, repository `magic-resume-kit`, workflow `publish.yml`, and allow direct `npm publish`. The workflow has `id-token: write`, uses a GitHub-hosted runner and requests provenance for CI releases. No environment name is configured. A new binding must complete its first successful publish within two days, so configure it near the next release and recreate an expired binding if needed. The first 1.0.0 release through this workflow validates all six OIDC bindings. If a bootstrap token was used instead, validate an OIDC release before removing it.

After the initial publication, verify anonymous package installation with `pnpm test:published`. Publishing packages does not migrate or deploy either application. Consumer update workflow templates stay disabled until a separate migration is authorized.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [scoped package publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
