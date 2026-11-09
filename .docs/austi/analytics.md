# Austi analytics

PostHog receives events from three surfaces, marked by the `surface` property.

## Landing (`surface: landing`)

No cookies: identity is held in memory, so a visitor is new on each page load. UTM parameters and
referrers arrive on `$pageview` automatically.

| Event | Properties |
| --- | --- |
| `$pageview`, `$pageleave` | automatic |
| `section_viewed` | `section` |
| `scroll_depth_reached` | `percent` (25, 50, 75, 100) |
| `early_access_clicked` | `location` |
| `email_copied` | none |
| `faq_opened` | `question` |
| `demo_voice_selected` | `sample` |
| `demo_review_used` | `action` |
| `access_channel_toggled` | `channel` |

## App (`surface: app`)

Users are identified by their opaque WorkOS id only, with no names or email addresses.

`$pageview`, `workspace_created`, `brand_saved`, `brand_relearned`, `campaign_created`,
`draft_approved`, `draft_held`, `draft_reopened`, `draft_edited`, `draft_revision_requested`,
`draft_copied`.

## Backend (`surface: backend`)

`generation_completed` and `generation_failed`, with `kind`, `model`, `duration_ms` and, on failure,
`failure_reason`. Convex sends these when `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` are set.

## Funnel to watch

`$pageview` -> `early_access_clicked` -> `workspace_created` -> `campaign_created` -> `draft_approved`
-> `draft_copied`.

The landing page and app use different identities, so treat those as two funnels joined by volume.

## When to leave the free tier

The app runs on the free AI Gateway model. Move when `generation_failed` shows a sustained
`failure_reason` of `403` or `429`, or when draft approval is low because of quality. Set the
`MARKETING_MODEL` Convex environment variable; no code change is needed.
