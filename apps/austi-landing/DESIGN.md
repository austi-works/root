---
name: Austi
description: 'A brand-aware AI marketing workspace.'
colors:
  night-office: '#0a0a0a'
  white: '#ffffff'
  paper: '#eeece5'
  surface: '#f8f6ef'
  ink: '#11110f'
  muted-dark: '#aaa8a1'
  muted-paper: '#66645f'
  primary: '#ffffff'
typography:
  fontFamily: 'Clarity City, system-ui, sans-serif'
---

# Design System: Austi

## Visual thesis

**One interface, under a spotlight.** The page is black and strictly monochrome, with white as the
only primary. Every illustration sits in a thin-bordered frame on an original grainy, grey backdrop.
Inside it is one full mock of the Austi app (`components/app`), and `Spotlight.astro` moves a camera
to a region of it while the rest falls into shadow.

## Frames and backdrops

Use `Frame.astro` for every illustration. Backdrops in `public/images/backdrops` are original,
procedurally generated folds, ripples and halftones. Grain is one shared tile applied in CSS so
each backdrop stays small. Do not use another site's imagery.

The WebGL halftone planet appears once, in the mid-page zoom-through, and the hero CTA keeps its
HDR super-white image through `ShaderButton.astro`. Product shots in `public/images/products` are
original renders for the fictional brand.

## Typography and color

- Use Clarity City throughout. Scale and spacing create hierarchy; avoid extra typefaces.
- Keep functional labels at 11px or larger; small status text must remain readable on dense operational views.
- Use warm white text on the night field and dark ink on paper.
- Use white as the primary for buttons, active states and completed marks. Do not add a hue.
- Express state through fill, outline and opacity.
- Only the fictional brand's content inside the app mock may use a serif or warm paper tones.

## Page sequence

Hero zoom, word-by-word statement, Learn (text scrolls, frame floats), Plan (brief floats, frames
scroll), Create (horizontal gallery), iris wipe to paper, Voice, Review, planet curtain and
zoom-through, A week, Limits (stacked frames), Who for, Early access, FAQ, closing zoom.

## Layout rules

- Black is the default field; the paper run is the one sustained inversion.
- Give each section a distinct composition and job. Avoid repeated feature-card grids.
- Keep illustrative content labelled, and keep development status clear.
- Stack two-column compositions below 900px and preserve readable states on phones.

## Motion and interaction

Keep the core narrative readable without interaction. Use CSS for hover and focus states on real
controls and native details for FAQ disclosure.

An inline script sets `.motion` on the root only when motion is allowed, and every scrubbed layout
is scoped to it, so no-JS and reduced-motion visitors get a normal document. Scenes use tall
sections with `position: sticky` stages scrubbed by ScrollTrigger in `landing-motion.ts`; do not use
ScrollTrigger pinning.

Keep scrolling direct, without ScrollSmoother. Use GSAP normalizeScroll with nested scrolling
enabled to align touch momentum, viewport measurements and snapping on mobile browsers.
GSAP ScrollTrigger tracks the 20rem footer reveal and owns its
snap-back: wait while touch is held, allow 0.15 seconds after scroll changes, then return over
0.65 seconds without overshooting. Keep the trigger end one pixel beyond the document boundary
so snapping remains active during a maximum held pull. Use matchMedia for reduced motion and
cleanup, including disabling normalization. Do not add release timers, input handlers or scroll wrappers.

Preserve the WebGL shader: diffuse dark blue on small pulls, a shallow coral/yellow horizon on
deeper pulls, and an independently moving blue fringe joined to the coral. Keep 35% wave strength
on phones, scaling to full strength between 640px and 1024px. GSAP's ticker advances the
shader while visible, including during a held gesture. The fixed shader blends behind the
transparent footer and revealed space. Do not add a second CSS gradient renderer.

## Asset provenance

The logo, CTA texture, and Clarity City font files are existing repository assets. The hero uses
a WebGL shader rather than a photograph. `public/og-austi.png` remains the existing social card,
independently used by page metadata. Do not add customer logos,
testimonials, avatars, or integration marks until there is honest source material for them.

## Avoid

- Generic AI gradients, glowing agents, glassmorphism, and bento feature grids.
- Illustrations with unsupported metrics.
- Quantitative performance claims before real pilots produce evidence.
- Pricing, trials, or product-download language while the work is still in operator research.
