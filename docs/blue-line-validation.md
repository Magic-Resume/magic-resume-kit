# Blue Line validation

This change belongs to `magic-resume-kit`. The kit has no application preview
server: the template package's `dev` script only watches TypeScript compilation.
The application's PDF canvas uses its installed template package, so refreshing
an application with a pinned npm dependency does not load this checkout.

## Package checks

Use Node >=22.13 and pnpm 10.28.1 (CI uses Node 24). From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test
pnpm check:packages
pnpm test:consumer
```

Run the build before the tests: the build cleans workspace package outputs that
the tests import. The template suite contains 261 tests, including preservation
of the commercial-installed marker default, explicit alignment overrides across
base/custom template IDs, editable anchors, field aliases, inline formatting,
CSS units, URL precedence and nested-group visibility.

## Render PDFs locally

The existing PDF smoke script uses synthetic data and renders all 20 templates.
Supply the host's full Source Han Sans/Serif font files; fonts stay outside the kit.

```sh
export MAGIC_RESUME_FONT_DIR=/absolute/path/to/host/public/fonts/full
PDF_SMOKE_OUTPUT_DIR="$PWD/.artifacts/pdf-after" \
  pnpm --filter @magic-resume-kit/resume-templates test:pdf
```

Open `.artifacts/pdf-after/blue-line.pdf` and `classic.pdf` side by side. Check
contacts, wrapped bullet text, experience title bands and rich-text formatting.
The script also checks PDF structure and the host-required synthetic-bold patches.

For the current compatibility gate, build the commercial-installed baseline
`395d261` in a separate checkout and compare it with the candidate using the same
input data, fonts and PDF patches. All 19 legacy templates must retain that
installed output; Blue Line's contact correction is checked against its accepted
`a49c594` output. See the [commercial compatibility results](blue-line-chrome-validation.md#commercial-compatibility-baseline).

The main checkout at `148cd7a` is useful for the historical layout comparison
below. It is not the installed commercial baseline and cannot establish upgrade
compatibility. Never compare versions rendered with different data or fonts.

## Before and after evidence

For the reproduced application fault and accepted contact correction, see
[Blue Line Chrome fault reproduction and acceptance](blue-line-chrome-validation.md).
The layout evidence below remains the historical main comparison.

These are the top 1800 raster pixels at 144 dpi, generated with the **unchanged
synthetic fixture** in `packages/resume-templates/scripts/render-pdf-smoke.mjs`.
They contain no private resume data. The baseline is main at `148cd7a`; the after
image is the shared-component implementation at `cbed815`. This comparison
includes the compact typography/layout changes from the branch's first commits.

Before - main, `148cd7a`:

![Blue Line before, synthetic fixture](images/blue-line/before-main.png)

After - shared components with compact presentation:

![Blue Line after, synthetic fixture](images/blue-line/after-shared.png)

To reproduce the raster excerpts after rendering each version:

```sh
pdftoppm -png -r 144 -singlefile -H 1800 /path/to/before/blue-line.pdf before-main
pdftoppm -png -r 144 -singlefile -H 1800 /path/to/after/blue-line.pdf after-shared
```

Historical validation during component unification and through `a49c594` used
fixed resume snapshots. The 19 legacy templates matched `148cd7a` in DOM markup,
PDF markup and 144-dpi pixels; Blue Line's component unification preserved its
then-established compact output at 192 dpi. Those results remain valid for those
revisions, but they did not test compatibility with commercial-installed
`395d261`: the installed package already lifted list markers, whereas main did
not. Commit `f03f515` restores that installed default and preserves explicit
centering overrides. Current private/public regression results use `395d261`
for the 19 legacy templates and accepted `a49c594` for Blue Line, as recorded in
the linked Chrome validation guide. No comparison covers every possible custom
token/data combination.

Historical alignment screenshots found from the previous evening already show
the compact V7 layout. They are not the main baseline and contain personal
contacts, so they are kept local rather than included in this public evidence.

## Verify the application integration

For an editor check before npm publication, use the content-addressed archives
from `pnpm check:packages` in a **disposable application checkout**, following
[the consumer guide](consumer-migration.md). Use the same exported resume in both
Blue Line and Classic. Retain the host's font files, PDF patches and CSS setup.
Do not write replacement files into the working application's `node_modules`.

The local PDF comparisons above validate renderer output; they are not evidence
that the existing application's pinned dependency was upgraded. Shipping requires
a versioned kit release followed by the application's exact dependency update.

## Known follow-up

With a custom `textSecondary` different from the body color, education location
text in the compact PDF currently inherits the body color. The default Blue Line
tokens use the same value for both, so this does not affect the screenshots.
This low-priority color case is outside the three P2 fixes in this change.
