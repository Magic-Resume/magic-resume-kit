# Local extraction verification

Verified on 2026-10-25 before any remote repository creation or package publication.

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

## Remaining release gates

The full unit suites are configured in GitHub CI and have not been run for this new repository remotely. Browser interactions and rendered PDF output have not been re-accepted as part of package extraction. Repeat the editor, light/dark, template and PDF checks before merging the actual application migrations.

There is no remote repository, npm publication or application dependency switch from this work. First establish repository and npm organization access, complete CI and publication, verify anonymous installation of the published versions, then apply the documented consumer migration. Production deployment remains a separate step.
