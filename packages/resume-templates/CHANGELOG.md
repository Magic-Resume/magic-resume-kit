# @magic-resume-kit/resume-templates

## 1.1.1

### Patch Changes

- Use the product's new name, 知遇 / Kenmet (formerly Magic Resume), in MCP tool, prompt and CLI text, package descriptions, the sample resume, schema titles and exported PDF metadata. Package names, the MCP server name and the CLI command are unchanged.
- Updated dependencies
  - @magic-resume-kit/resume-schema@1.0.2
  - @magic-resume-kit/icons@1.0.2

## 1.1.0

### Minor Changes

- Allow hosts to resolve PDF fonts to glyph subsets while preserving the original font metrics. Reuse font preparation across concurrent renders, isolate font families by character set, and retain the existing static font path when no resolver is supplied or preparation fails.

## 1.0.1

### Patch Changes

- Document public npm installation and host integration, and enable GitHub provenance through the first automated release.
- Updated dependencies
  - @magic-resume-kit/resume-schema@1.0.1
  - @magic-resume-kit/icons@1.0.1
