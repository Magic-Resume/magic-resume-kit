# Magic Resume Kit

Magic Resume Kit contains the shared MIT packages used by the Magic Resume applications. Packages use the `@magic-resume-kit` namespace on npmjs so public installations do not require a GitHub Packages token. All six packages are available on npmjs, starting at 1.0.0. [GitHub releases](https://github.com/Magic-Resume/magic-resume-kit/releases) record published versions and CI verification.

| Package | Purpose |
| --- | --- |
| `@magic-resume-kit/resume-schema` | Resume validation, shared types, template IDs and JSON Schema |
| `@magic-resume-kit/resume-templates` | Template DSL, registry, DOM rendering and browser PDF rendering |
| `@magic-resume-kit/icons` | React icon components |
| `@magic-resume-kit/design-system` | Semantic styles and React controls |
| `@magic-resume-kit/utils` | Class names, formatting, colors and motion helpers |
| `@magic-resume-kit/mcp` | Local MCP server and schema-aware resume editing CLI |

`mcp` is an independently installed API client using PATs; neither application depends on its executable, and it does not access browser IndexedDB.

`packages/tsconfig` is private build configuration. AI orchestration, GenUI, accounts, billing, application code and fonts remain in their application repositories.

## Development

Use Node 22.22.2 or newer and pnpm 10.28.1.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm check:packages
pnpm test:consumer
```

`check:packages` creates six tarballs under `.artifacts`, checks every exported file and rejects unpublished workspace references, tests and font assets. `test:consumer` installs those tarballs in an isolated project using npmjs without user credentials, then verifies imports, types, React rendering and the MCP executable. A second isolated installation checks that MCP works without React, Next.js or PDF dependencies. The full package test suites run in GitHub CI.

PDF consumers must provide host fonts and apply the included patches. Tailwind consumers must scan the installed packages. See [template integration](packages/resume-templates/README.md), [consumer migration](docs/consumer-migration.md) and [release setup](docs/releasing.md). The confirmed [package boundary](docs/package-boundary.md) and [verification record](docs/verification.md) describe the package boundary and application integration checks.

## Source history

The repository retains the history of the seven package directories, PDF patches and MIT license from the public Magic Resume repository, filtered from source commit `f691a0f4`. Application files and their unrelated history are excluded. Real storage bucket identifiers in historical test fixtures have been replaced with an all-zero example. Public icons and design tokens include the compatible superset needed by both applications.

The legacy template freeze hashes were updated solely for the package import rename from `@magic-resume/*` to `@magic-resume-kit/*`; frozen rendering behavior is unchanged.

## License

MIT. The original copyright notice is retained in the root and every published package.
