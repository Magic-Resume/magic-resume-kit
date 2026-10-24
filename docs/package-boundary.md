# Public package boundary

The confirmed extraction contains six public packages under `@magic-resume-kit/*`. This boundary was confirmed on 2026-10-25 after comparing the open-source and commercial application checkouts.

| Package | Responsibility | Consumers |
| --- | --- | --- |
| resume-schema | Resume validation, data types and template IDs | Both applications, templates and MCP |
| resume-templates | Template registry, DSL, DOM and PDF rendering | Both applications; MCP bundles registry data |
| design-system | Semantic tokens, styles and presentational controls | Both applications and their GenUI packages |
| icons | Shared React icons | Both applications and templates |
| utils | Formatting, colors, motion and class names | Both applications and GenUI |
| mcp | Independently installed stdio CLI and API client | End-user MCP clients, using PAT authentication |

MCP remains public by explicit scope decision. Its inclusion does not move PAT management, account APIs, API authentication or cloud data storage into the kit. It does not access IndexedDB and is not an application runtime dependency.

## Contents that stay outside

`commercial-billing`, `commercial-runtime`, `commercial-legal` and the current Clerk-aware `env` package stay in the commercial application. Core services and analytics packages remain in their existing private repositories. No accounts, cloud synchronization, quotas, checkout, interview or memory business logic enters the kit.

GenUI stays in each application for this phase. The compared commercial checkout contains 20 additional OpenUI files and a different contract/entrypoint; copying that directory wholesale would cross the agreed boundary. AI Lab, editor pages, state stores and backend adapters also stay in their respective applications.

The private tsconfig workspace supports kit development; each application keeps its own internal configuration. Fonts and application image assets stay with their hosts. The kit ships PDF patches and the font charset contract, with host setup documented in the template README.

## Compatibility decisions

The schema, template, utility and MCP source trees matched between the two application checkouts. Icons and design tokens use the compatible union needed by both applications. These additions are generic controls and styles; no commercial runtime code was copied.

The public history is filtered from the open-source checkout. The only legacy template content edits in this extraction rename package imports; the freeze manifest is updated for that mechanical change. The application migration is validated in disposable copies, with the original application checkouts retained until npm publication.
