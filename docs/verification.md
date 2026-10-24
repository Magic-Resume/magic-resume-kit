# Extraction and release verification

Extraction and first-release verification recorded on 2026-10-25. Package release checks and application integration checks have separate acceptance scopes.

## Package checks

- All six public packages build and pass their TypeScript checks.
- Public-boundary and legacy-template freeze checks pass. Freeze changes are limited to the mechanical package namespace rename.
- All six packed archives contain their declared exports, executable where applicable, license and README. They exclude tests, fonts and private application code, and contain no unresolved workspace dependency references.
- A clean consumer installs the six local archives without user registry credentials and verifies exported imports, declarations, schema, template IDs, React rendering and styles.
- A separate MCP-only installation runs the executable without React, Next.js or PDF dependencies. No PAT or live API request is used in this check.
- Release version parsing tests pass (2 tests). Workflow syntax checks and migration helper syntax checks pass.
- The filtered historical blob scan found no retained real storage bucket identifiers or tested credential patterns. The source history contains package directories, PDF patches and the original MIT license.

## Application integration checks

Both applications were migrated only in disposable local clones, using the same content-addressed package archives. The original application checkouts keep their workspace dependencies until the first npm release.

| Check | Open-source application | Commercial application |
| --- | --- | --- |
| GenUI and required local dependencies | Build passed | Build passed |
| Application production TypeScript | Passed | Passed |
| Tailwind sources | Passed | Passed |
| Production Next.js build | Passed | Passed |
| Local-only and entity boundaries | Passed | Not applicable |
| Host PDF font charset matches package | Passed | Passed |

The open-source production build uses its production TypeScript configuration. Its unrestricted test-inclusive TypeScript check still encounters pre-existing references in old cloud/interview tests; these are outside the extraction. Commercial TypeScript also passes with tests included. The commercial production build used a placeholder Clerk publishable key and did not connect to a real account.

## Public repository and release checks

The public repository is [Magic-Resume/magic-resume-kit](https://github.com/Magic-Resume/magic-resume-kit). [CI run 40116178471](https://github.com/Magic-Resume/magic-resume-kit/actions/runs/40116178471), at source commit `b6c47949970a7e3871aff35ece0419750789fc7d`, passed all builds, TypeScript checks, 252 tests, public-boundary checks, archive validation and isolated consumer installation. All six CI archives were downloaded, checked against their manifests and published as 1.0.0. The public registry archive SHA-256 hashes match those CI artifacts.

The 1.0.0 bootstrap used maintainer authentication and does not include GitHub provenance. Subsequent versions use the [publish workflow](../.github/workflows/publish.yml), which repeats the checks, publishes with OIDC and verifies anonymous installation from npm. The [GitHub release records](https://github.com/Magic-Resume/magic-resume-kit/releases) contain the corresponding publication and workflow receipts; a configured binding alone is not evidence of successful OIDC publication.

## Remaining application acceptance

Browser interactions and rendered PDF output have not been re-accepted as part of package extraction. Repeat the editor, light/dark, template and PDF checks before merging the actual application migrations. The original application checkouts still use their workspace dependencies; package publication does not migrate or deploy them. No consumer update PRs are created by this release workflow.
