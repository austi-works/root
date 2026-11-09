# Root Monorepo

This repository is a Bun workspace focused on the Austi marketing tool. It also holds the separate Austi desktop, Trading, and Portfolio projects.

## Workspace Map

- `apps/austi`: Austi marketing app, built with TanStack Start and backed by the root Convex app in `convex/`.
- `apps/austi-desktop`: Tauri desktop app for experimenting with local Codex inference workflows.
- `apps/austi-landing`: Astro marketing site for Austi.
- `apps/trading`: TanStack Start trading app with its own Convex app under `apps/trading/convex`.
- `apps/portfolio`: Astro portfolio site.
- `packages/ui`: Shared shadcn/Tailwind UI primitives and app-level UI helpers.
- `packages/web-foundation`: Shared TanStack Start, Vite, WorkOS, and Convex helpers.

## Common Commands

Use Bun from the repository root:

```sh
bun install
bun run lint
bun run typecheck
bun run test
bun run check
```

Product-specific commands:

```sh
bun run austi:dev
bun run austi:convex
bun run austi-desktop:dev
bun run austi-landing:dev
bun run trading:dev
bun run portfolio:dev

bun run trading:test
bun run portfolio:build
bun run austi-landing:build
```

The `*:dev`, `*:preview`, and `*:convex` scripts start background processes through [pitchfork](https://pitchfork.jdx.dev). Install it with `brew install pitchfork`:

```sh
pitchfork list
pitchfork logs austi --follow
pitchfork stop austi
```

See `.docs/local-processes.md` for daemons, ports, and logs.

Formatting is available as an explicit command and is not part of `check`:

```sh
bun run format
```

## Conventions

- Follow `AGENTS.md` for repository-wide agent instructions.
- Use `bun` and `bunx`; do not use `npm`, `npx`, `yarn`, or `pnpm`.
- New packages under `packages/` should follow `.docs/package-creation.md`.
- Import aliases and package import rules are documented in `.docs/code-conventions.md`.
- Theming and UI rules live in `.docs/ui-theming.md`.
- Analytics events and the funnel live in `.docs/austi/analytics.md`.
- Local background processes are documented in `.docs/local-processes.md`.
- Production branch naming and promotion rules live in `.docs/release-branches.md`.
