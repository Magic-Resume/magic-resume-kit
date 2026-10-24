# Publishing Magic Resume Kit

Six public packages start at 1.0.0 under `@magic-resume-kit` on npmjs. The source repository is `Magic-Resume/magic-resume-kit`. The release workflow is gated by `PUBLIC_PACKAGES_PUBLISH_ENABLED=true` and runs only on `main`, on pushes or manual dispatch.

## Release workflow

The workflow installs dependencies without a release cache, builds, typechecks, runs the full unit suites, checks the public boundary and archives, and verifies an isolated installation. It publishes the exact checked archives using npm 11.21.1, then verifies anonymous installation from the registry, including a separate MCP-only installation. Existing versions are retained, so a partial publication can be safely resumed.

The workflow creates no pull requests and sends no application update events. It needs no GitHub App or cross-repository credentials. Changesets remains the local version/changelog tool: run `pnpm changeset`, then `pnpm version-packages` and commit the resulting versions before release. Pending changesets block publication rather than triggering a version PR. The private tsconfig workspace is never published.

## First release and authentication

The npm organization owner must have a verified email and enable account 2FA to configure trusted publishing. A package must exist before its trusted publisher can be configured. For a new package, first complete a real release using the logged-in maintainer and an archive downloaded from a successful CI run. Run `npm publish <verified-archive.tgz> --access public --ignore-scripts --registry=https://registry.npmjs.org/` and complete npm's security-key prompt. Never copy the maintainer's login token into CI.

Staged publishing is an optional manual review path: `npm stage publish` creates a public placeholder and reserves the staged version number. Approve the checked archive with 2FA to publish it. Do not reject the only stage as a way to bootstrap direct OIDC publication: in the initial release, rejection removed the new package and its trusted publisher, and the workflow failed with `ENEEDAUTH`. Publishing a version that is still staged fails with HTTP 409.

For each of the six packages, bind npm Trusted Publishing to GitHub organization `Magic-Resume`, repository `magic-resume-kit`, workflow `publish.yml`, and allow direct `npm publish`. The workflow has `id-token: write`, uses a GitHub-hosted runner and requests provenance for CI releases. No environment name is configured and no stored npm token is required. A new binding must complete its first successful publish within two days, so validate it with the next real version promptly. Re-running an existing immutable version only checks installation; it does not exercise OIDC publication.

The initial 1.0.0 archives were published by the maintainer after CI verification, so those versions do not have GitHub provenance. The 1.0.1 documentation patch is the first version intended for publication by the GitHub workflow. Confirm a successful workflow and registry provenance for all six packages before treating the OIDC setup as verified. A short-lived scope-limited granular `NPM_TOKEN` secret remains an optional fallback; never commit credentials.

After the initial publication, verify anonymous package installation with `pnpm test:published`. Publishing packages does not migrate or deploy either application. Consumer update workflow templates stay disabled until a separate migration is authorized.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [scoped package publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
