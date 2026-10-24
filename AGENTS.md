# AGENTS.md

Magic Resume Kit contains six public MIT packages and a private tsconfig workspace. Package names use `@magic-resume-kit/*` on npmjs. Keep application code, accounts, billing, AI orchestration, fonts and credentials out of this repository.

Build with `pnpm build`; typecheck with `pnpm lint`; inspect all publish artifacts with `pnpm check:packages`; validate a clean installation with `pnpm test:consumer`. Full unit suites run in GitHub CI. Preserve the existing template IDs, public exports and schema-aware patch-based MCP behavior. Host fonts and PDF patches are documented in the template package. Never publish or push without user authorization.
