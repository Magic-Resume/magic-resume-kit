# @magic-resume-kit/mcp

Local stdio MCP server and CLI for reading resumes and applying schema-aware patches through the Magic Resume API. It uses personal access tokens and requires a compatible API; it does not read the local editor's IndexedDB.

```sh
npx -y @magic-resume-kit/mcp --help
npx -y @magic-resume-kit/mcp config set --api-url https://your-api.example/api --pat YOUR_PAT
```

The executable remains `magic-resume`. Configure your MCP client to run `npx` with arguments `-y`, `@magic-resume-kit/mcp`, `mcp`. Use a real PAT only in your local setup, never in committed files. Schema and registry logic is bundled into the executable, avoiding React and PDF runtime dependencies for CLI users. MIT licensed.
