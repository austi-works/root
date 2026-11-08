# Hero product scene: Round 3 verification

Verified on 2026-11-09 against the production Astro build. Three commits on the existing `main`
branch cover removal/spacing, the product scene, and verification. Unrelated page edits remain
unstaged. No project dependencies were added.

## Removed

- `public/images/hero-empty-desk.png`
- `public/images/hero-empty-desk-836.webp`
- `public/images/hero-empty-desk-1672.webp`
- `src/components/DeskScene.astro` and `DeskScene.css`
- `src/components/HeroFlowSvg.tsx` and `HeroFlowSvg.css`
- The obsolete desk-scene configuration in `src/lib/landing-content.ts`.

There are no remaining runtime references to those files. The CTA texture is still used by the
CTA, and `og-austi.png` is independently used by page metadata, so both were retained.

## Changed and added

- `src/components/Hero.astro`: use `HeroProductScene` in the existing hero grid.
- `src/components/Hero.css`: clear the nav with sensible top padding, retain a 100svh minimum,
  and reduce the trust-line gap. The desktop 42:58 grid and existing hero copy are retained.
- `src/components/HeroProductScene.astro` and `HeroProductScene.css`: crisp HTML cards, URL field,
  core, SVG connectors/particles, decorative cursor, caption, and pause/play control.
- `src/scripts/hero-product-scene.ts`: one ten-second GSAP clock owns typing, caret, status fades,
  particles, skeletons, card arrivals, ordered clicks, approval ticks, hold, reset, and ambient glow.
- `src/lib/heroScene.config.ts`: **all illustration copy and fictional examples**.
- `DESIGN.md`: update the hero asset guidance for the product illustration.

The scene starts from a complete server-rendered frame, then starts its timeline after first
paint. Connector and cursor anchors are measured on resize, so paths stay outside card text.
The caret moves by transform to avoid layout shifts. The illustration adds no React hydration.

## Content and narrow-screen choice

The clearly fictional Harbor & Pine brand uses the reserved `pine.example` URL. Ad, Social post,
Email, and SEO snippet examples contain no invented results, ratings, or metrics. Their Approve
buttons are decorative parts of the illustration; the separate pause/play control is interactive.

At widths up to 640px, the same composition and timeline show **Ad and Social post plus “+2 more”**.
This keeps text at least 11.5px at 360px. The URL remains top-left, the core center-left, and the
ordered content cards on the right. Wider layouts show all four cards; there is no DOM reordering.

## Verification

Headless Chrome screenshots and checks passed at **360×900, 768×1024, 1280×720, 1440×800, and
1920×1080**:

- No horizontal scroll or clipped cards. Body content stays inside each card.
- At 1280×720 and 1440×800, the headline, CTA/trust block, and entire scene fit above the fold.
- SVG connectors meet card edges, with ordered source/destination anchors and no crossings.
- URL typing, every status, moving particles, skeletons, cursor motion, and staggered approvals
  were observed at every tested width. The ten-second loop resets correctly.
- Manual pause freezes typing, caret, cursor, particles, cards, and ambient glow together.
- Hiding the document or leaving the hero pauses the timeline. Resuming preserves its position.
- Reduced motion shows the filled URL and approved final state, with no motion and no pause
  control. Changing the preference during a session also works.
- H1, paragraph, CTA destination, and surrounding page sections are retained. No browser errors.
- Astro `check` and `build`, focused Oxlint checks, and `git diff --check` passed.

## Lighthouse

Lighthouse **13.6.0**, Chrome **156**, default mobile profile (412×823, DPR 1.75), simulated network
throttling, and 4× CPU slowdown. Saved before/after production builds were served by temporary
local static-file servers. These are individual lab runs, not field measurements.

| Metric | Before | After |
| --- | ---: | ---: |
| Performance | 91 | 100 |
| LCP | 3.339s | 1.524s |
| CLS | 0 | 0 |
| Total blocking time | 0ms | 0ms |

No measured regression in these metrics. The photograph is no longer an LCP candidate. An initial
audit caught a tiny caret layout shift; positioning the caret with transforms removed it in the
final build. Production hosting and compression can change these lab timings.

## TODOs

Replace the fictional examples with approved examples in `src/lib/heroScene.config.ts` when ready.
Existing proof, live-counter, and integration configuration was left unchanged and remains outside
this revision. Recheck performance on the deployed host.
