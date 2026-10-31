# @magic-resume-kit/resume-templates

Resume template contracts, registries, DOM components and browser PDF rendering. React 19 or newer and react-i18next 15 are peer dependencies. Next.js is not required.

```sh
npm install @magic-resume-kit/resume-templates react react-dom react-i18next
```

Use `/core` for template compilation and validation, `/registry` for template manifests, `/dom` for DOM rendering, `/server` for server utilities and the PDF document component and `/pdf/browser` for browser PDF export. `/pdf/charset` exposes the subset character set for host font-generation checks. Existing component and configuration subpaths remain exported.

## Tailwind styles

Components emit Tailwind classes. With Tailwind 4, include the design-system styles and explicitly scan installed JavaScript, because node_modules is not scanned automatically. Paths below assume a stylesheet in `apps/web/src/app` in a pnpm workspace; adjust them for the host project.

```css
@import "@magic-resume-kit/design-system/styles/tokens.css";
@import "@magic-resume-kit/design-system/styles/utilities.css";
@import "@magic-resume-kit/design-system/styles/motion.css";
@source "../../node_modules/@magic-resume-kit/resume-templates/dist";
@source "../../node_modules/@magic-resume-kit/design-system/dist";
```

## PDF fonts

The host serves subset `.woff2` files at `/fonts/` and matching full `.woff` files at `/fonts/full/`. Copy the application's existing `public/fonts` directory, retaining its font licenses and build scripts. Fonts are intentionally not included in this package.

Required families and filenames are defined in `src/pdf/browser.tsx`: SourceHanSansSC and SourceHanSerifSC Regular, Bold, RegularOblique and BoldOblique; LXGWWenKai Regular and Medium; GlowSansSC, SarasaGothicSC, ChironHeiHK, ChironSungHK and MapleMonoCN Regular and Bold; LXGWBrightGB Regular and Medium; ZhuqueFangsong, LXGWZhenKaiGB, QiushuiShotai and LXGWMarkerGothic Regular. Full fallback families use the existing full-font mapping. The packaged renderer retains same-origin `/api/pdf/logo-image` handling for versioned R2 logos; hosts using those logo URLs must supply that endpoint.

Hosts can avoid downloading whole CJK fonts by passing an optional `resolveFont(sourceUrl, characters)` callback to `createMagicResumePdfBlob`. It receives a sorted unique character set, including decoded rich text and localized labels. Return a URL or font data URL containing those glyphs from the original font, preserving outlines, metrics, shaping features and license records. Fonts and the subsetting service remain the host's responsibility; no service is contacted by default. A failed resolver falls back to the existing static source. Subsets use distinct font-family aliases so later edits can introduce new characters safely; inactive font profiles are bounded and active renders retain their fonts.

## PDF dependency patches

Synthetic bold rendering uses three upstream patches shipped under `patches/`. Package-manager patches are not inherited from a dependency. Copy these files into the host's `patches/` directory and keep these entries in its `pnpm-workspace.yaml`:

```yaml
overrides:
  '@react-pdf/layout': 4.6.1
  '@react-pdf/render': 4.5.1
  '@react-pdf/textkit': 6.3.0
patchedDependencies:
  '@react-pdf/layout@4.6.1': patches/@react-pdf__layout@4.6.1.patch
  '@react-pdf/render@4.5.1': patches/@react-pdf__render@4.5.1.patch
  '@react-pdf/textkit@6.3.0': patches/@react-pdf__textkit@6.3.0.patch
```

An npm consumer can import and render templates without these patches, but matching the applications' synthetic bold PDF output requires an equivalent patch mechanism. Do not claim PDF parity from installation alone.

For the font-dependent PDF regression check, set `MAGIC_RESUME_FONT_DIR` to the host's `public/fonts/full` directory and run `pnpm --filter @magic-resume-kit/resume-templates test:pdf` in this repository.

## Public distribution

Install `@magic-resume-kit/resume-templates` from the public [npm registry](https://www.npmjs.com/package/@magic-resume-kit/resume-templates). No GitHub Packages token or private registry configuration is required. The package source and release workflow live in [Magic Resume Kit](https://github.com/Magic-Resume/magic-resume-kit).

See the [consumer integration guide](https://github.com/Magic-Resume/magic-resume-kit/blob/main/docs/consumer-migration.md) for host requirements and the [release guide](https://github.com/Magic-Resume/magic-resume-kit/blob/main/docs/releasing.md) for versioning and publication.
