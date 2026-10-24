# @magic-resume-kit/mcp

Local stdio MCP server and CLI for reading resumes and applying schema-aware patches through the Magic Resume API. It uses personal access tokens and requires a compatible API; it does not read the local editor's IndexedDB.

```sh
npx -y @magic-resume-kit/mcp --help
npx -y @magic-resume-kit/mcp config set --api-url https://your-api.example/api --pat YOUR_PAT
```

The executable remains `magic-resume`. Configure your MCP client to run `npx` with arguments `-y`, `@magic-resume-kit/mcp`, `mcp`. Use a real PAT only in your local setup, never in committed files. Schema and registry logic is bundled into the executable, avoiding React and PDF runtime dependencies for CLI users. MIT licensed.

## Public distribution

Install `@magic-resume-kit/mcp` from the public [npm registry](https://www.npmjs.com/package/@magic-resume-kit/mcp). No GitHub Packages token or private registry configuration is required. The package source and release workflow live in [Magic Resume Kit](https://github.com/Magic-Resume/magic-resume-kit).

See the [consumer integration guide](https://github.com/Magic-Resume/magic-resume-kit/blob/main/docs/consumer-migration.md) for host requirements and the [release guide](https://github.com/Magic-Resume/magic-resume-kit/blob/main/docs/releasing.md) for versioning and publication.
