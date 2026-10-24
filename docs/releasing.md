# Publishing Magic Resume Kit

Six packages start at 1.0.0 under `@magic-resume-kit` on npmjs. Source code belongs in the public `Magic-Resume/magic-resume-kit` GitHub repository. Public npm installations require no token. No release occurs until the repository variable `PUBLIC_PACKAGES_PUBLISH_ENABLED` is set to `true`.

## First release

1. Confirm ownership of the npm organization `magic-resume-kit` and enable account 2FA. Create the public GitHub repository and push the reviewed local branch only when authorized.
2. Configure `RELEASE_BOT_APP_ID` and `RELEASE_BOT_PRIVATE_KEY` for the release bot. Give it contents and pull-request access to this repository and contents access to both application repositories. It creates version PRs and sends release events.
3. For the first release, configure a short-lived granular npm token in the GitHub repository secret `NPM_TOKEN` if trusted publishing cannot yet be configured for the new package names. The token must permit direct publishing of the selected scope and satisfy the organization's 2FA policy. No local `npm login` is required for this CI path, and no token belongs in repository files.
4. Enable the release gate, run CI, review the tarballs, then run the release workflow on `main`. Check that all six exact versions can be installed anonymously from npmjs before migrating application repositories.
5. For subsequent releases, configure each package's npm Trusted Publisher for organization `Magic-Resume`, repository `magic-resume-kit`, workflow `publish.yml`. Explicitly allow `npm publish`, because stage-only permission does not authorize this workflow's direct publish. Configure this shortly before the next release: npm requires the first successful publish for a new trusted publisher within two days. The workflow uses a GitHub-hosted runner, Node 24 and npm >=11.5.1, with `id-token: write`. Validate an OIDC release and then revoke/remove the bootstrap `NPM_TOKEN`.


The release workflow runs build, typecheck, tests, public-boundary checks and clean consumer installation before Changesets. Future changes use `pnpm changeset`; a version PR updates affected package versions and changelogs. The private tsconfig package is excluded from publication.

## Consumer updates

After publishing, the workflow sends `magic-packages-published` events containing exact published names and versions to both application repositories. Consumers must enable their update workflow only after the initial migration. Update PRs target an existing `release-YYYY-MM-DD` branch, never the default branch. Patch/minor updates can use auto-merge after required CI; major updates require review. A weekly and manual fallback can query npmjs for missed versions.

Until that initial migration is reviewed, applications keep their current workspace packages. A successful package publish does not authorize an application release or production deployment.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for runner and authentication requirements, and [GitHub npm registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) for why GitHub Packages is not used for anonymous public installation.
