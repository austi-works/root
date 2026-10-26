---
name: Austi
description: 'Maintenance coordination for residential property managers.'
colors:
  night-office: '#0a0a0a'
  white: '#ffffff'
  paper: '#eeece5'
  surface: '#f8f6ef'
  ink: '#11110f'
  muted-dark: '#aaa8a1'
  muted-paper: '#66645f'
  accent: '#ff4f42'
  signal: '#dfff57'
  success: '#278a51'
typography:
  fontFamily: 'Clarity City, system-ui, sans-serif'
---

# Design System: Austi

## Visual thesis

**The maintenance desk after hours.** Austi lives between operational urgency and documented
control. Matte black suggests the work that keeps moving beyond office hours; warm paper and ruled
rows make every decision legible. The design should feel calm under pressure, not futuristic or
autonomous for its own sake.

## Hero focal asset

Use the existing empty operations-desk photograph as the first-viewport image. The paperwork makes
coordination burden tangible, while the empty chair supports the promise that intake can begin
before an operator is available. The message and research-stage CTA remain fully readable without
animation.

## Typography and color

- Use Clarity City throughout. Scale and spacing create hierarchy; avoid extra typefaces.
- Keep functional labels at 11px or larger; small status text must remain readable on dense operational views.
- Use warm white text on the night field and dark ink on paper.
- Use red for decisive human action and escalation.
- Use acid yellow only for the active or exceptional workflow state.
- Use green only for a completed operational state.

## Page sequence

1. Hero: one slogan and the workflow-conversation CTA.
2. Workflow: explain the first three moves from message to resolution lifecycle.
3. Controls: show the coordinate, pause, and handover boundary beside one static approval example.
4. FAQ: group operational, safety, data, integration, and research-stage questions for quick scanning.
5. Final CTA: invite operators into a focused research conversation.

## Layout rules

- Alternate full night and paper fields.
- Keep marketing copy direct and let operational evidence carry the detail.
- Use ruled editorial compositions instead of simulated application workbenches.
- Avoid repeated feature-card grids; give each section a distinct composition and job.
- Give product evidence substantially more room than its supporting copy.
- Stack two-column compositions below 900px and preserve readable workflow states on phones.

## Motion and interaction

Keep the core narrative readable without interaction. Use CSS for hover and focus states on real
controls only, and reserve disclosure behavior for the native FAQ details. Do not add a
smooth-scroll engine or scroll-bound interpolation. The decorative footer arc uses a scoped WebGL
shader with a Motion spring driven by extra scroll input at the bottom of the page. The effect is
a temporary section at the document's end: zero height at rest, expanding with the gesture to reveal a
tall sun glow along a shallow curved horizon. The viewport follows the revealed space,
then returns to the footer as it collapses. Suppress native bottom rubber-banding while handling
that boundary before gestures start; keep the page background consistent with the footer.
While a wheel or touch gesture is active, accumulate its movement directly into the reveal and
hold the position between updates. After a single 140ms quiet window, use Motion's spring with
visualDuration 0.65 and bounce 0 for an unhurried return without oscillation. Touchscreen release
starts the same spring directly. Keep this interaction simple: no hand-written spring integration
or momentum classifier. Trackpad finger release itself is unavailable to the page.
Small pulls begin as diffuse blue light, with a minimum diffusion width and a haze that fades into
black behind the footer content. Its initial exposure rises gradually from zero. As the pull grows,
resolve that haze into a shallow curved horizon with a saturated coral/yellow interior and a violet
halo. Give the blue outer contour its own slower, layered waves so the band widens and narrows
independently of the coral's curvature. Retain the calmer mobile displacement.
Blend coral directly into a full blue band, then fade its outside into black. Keep the band anchored
to the coral edge instead of shifting a separate highlight away from it.
Avoid a solid blue disc at the start and an undifferentiated gradient at full extension.
The CSS fallback follows the same progression from haze to curved horizon.
Reversing a gesture closes the space progressively before ordinary upward scrolling resumes.
Keep ordinary scrolling native.
Support the CSS glow when WebGL is unavailable and disable the effect for reduced motion.
While the glow is visible, advance the shader clock independently of page movement: gently
undulate the horizon and drift its violet fringe, including during held gestures. Only repaint the
canvas on those frames; page height remains controlled by the gesture and spring. Stop painting
at rest, offscreen, when hidden, or with reduced motion. The CSS fallback drifts subtly while active.
On phone widths, reduce wave and fringe displacement to 35% of desktop strength, scaling
smoothly back up between 640px and 1024px. Use CSS width so device pixel density cannot amplify it.

## Asset provenance

The hero photograph, responsive derivatives, CTA texture, and Clarity City font files are existing
repository assets. `public/og-austi.png` is an AI-edited social card derived from that hero
photograph and contains only the Austi name and category statement. Do not add customer logos,
testimonials, avatars, or integration marks until there is honest source material for them.

## Avoid

- Generic AI gradients, glowing agents, glassmorphism, and bento feature grids.
- Fake dashboards with unsupported metrics.
- Quantitative performance claims before real pilots produce evidence.
- Pricing, trials, or product-download language while the work is still in operator research.
