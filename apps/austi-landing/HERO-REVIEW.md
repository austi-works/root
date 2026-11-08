# Hero revision verification

Verified on 2026-11-08 against the production Astro build.

## Root cause

The previous equal-column grid put a wide photograph inside a square stage, anchored to the
bottom. The photograph itself has substantial black space above the desk, so the chair and desk
occupied only the lower third of that stage. The image was not zero-height or behind another
layer. The animation gate did start, but its chips were invisible for the first 27% of the loop,
and there were no persistent workflow paths or nodes between animated phases.

The desktop grid now uses 42:58 proportions. A shared 1000 × 700 coordinate space aligns the
inline SVG and the enlarged, bottom-anchored photograph. The actual desk spans approximately 98%
of the scene width, with a small right bleed and masked top/left edges. Mobile scene height is
approximately 64–67vw after page gutters.

## Changed files

- `src/components/Hero.css`: column proportions, heading clamp, and 100svh minimum height.
- `src/components/DeskScene.astro`: replace placeholder layers with the inline SVG; coordinate
  first-paint startup, CSS/SMIL pause, visibility, and reduced motion.
- `src/components/DeskScene.css`: shared stage geometry, image scaling, masks, and caption/control.
- `src/components/HeroFlowSvg.tsx` and `HeroFlowSvg.css`: nine-second workflow, six input paths,
  four channel nodes, particles, approval ticks, ambient motion, and static reduced-motion frame.
- `src/lib/landing-content.ts`: exact replacement paragraph, channel labels, and accessible label.

The first sizing commit also records the previously uncommitted hero foundation, including
`Hero.astro`, the proof/integration/counter components, and metric data layer. Their existing
behavior was retained. Unrelated page and FAQ edits were left unstaged. No dependencies were added.

## Functional and visual checks

Headless Chrome checks and screenshots passed at **360, 768, 1280, 1440, and 1920px**:

- No horizontal page overflow or clipped channel nodes.
- SVG dimensions match the stage; the desk fills the right column.
- Particles have visible opacity and change position over time at every tested width.
- All four approval ticks appear after particle arrival.
- The existing control freezes/resumes both the SVG timeline and CSS animations and changes label.
- Leaving the hero or hiding the document pauses both animation systems.
- Reduced motion shows a composed static frame with paths, nodes, and checks. Changing the
  preference during the session also stops/resumes motion correctly.
- H1 and CTA destination are unchanged; paragraph matches the requested copy.
- No browser exceptions. Rendered SVG is **11,493 bytes**, with **one** Gaussian-blur filter.
- `bun run --filter austi-landing check` and `build` passed; focused Oxlint checks passed.

## Lighthouse comparison

Lighthouse **13.6.0**, Chrome **156**, default mobile profile (412 × 823, DPR 1.75), simulated
network throttling, and 4× CPU slowdown. Each production build was served from a temporary local
static-file server. One run per build; these are lab observations rather than field measurements.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Performance | 92 | 90 | −2 points |
| LCP | 3.386s | 3.494s | +0.108s / +3.2% |
| CLS | 0 | 0 | None |
| Total blocking time | 0ms | 0ms | None |

The small measured LCP regression should be checked again on the deployed host with production
compression. The SVG adds markup but no React hydration JavaScript. The photograph remains an
eager, high-priority image; SMIL starts after first paint. Neither audit reported run warnings.

## Remaining work

No new hero implementation TODOs. Existing proof, metric, and integration configuration remains
unchanged and still requires verified product data. Recheck the measured LCP on the deployed host.
