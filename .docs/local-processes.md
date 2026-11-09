# Local Processes

Long-running local processes are managed by [pitchfork](https://pitchfork.jdx.dev) and defined in
[`pitchfork.toml`](../pitchfork.toml). A background supervisor owns them, so they keep running after
the terminal or chat that started them closes.

Install once per machine:

```sh
brew install pitchfork
```

## Commands

The root `*:dev`, `*:preview`, and `*:convex` scripts start a daemon and return once it is ready.

```sh
bun run austi-landing:dev        # same as: pitchfork start austi-landing
pitchfork list                   # what is running
pitchfork list --json            # includes pid, status, and actual ports
pitchfork status austi-landing   # one daemon, including its port
pitchfork logs austi-landing --follow
pitchfork logs austi-landing -n 100
pitchfork start austi-landing --force   # restart
pitchfork stop austi-landing
pitchfork stop --all
```

Starting a daemon that is already running is a no-op. To run an app in the foreground without
pitchfork, use its workspace script, for example `bun run --filter austi dev`.

## Daemons and Ports

| Daemon                  | Root script             | Preferred port |
| ----------------------- | ----------------------- | -------------- |
| `austi`                 | `austi:dev`             | 3000           |
| `austi-preview`         | `austi:preview`         | 3000           |
| `austi-convex`          | `austi:convex`          | none           |
| `austi-landing`         | `austi-landing:dev`     | 4329           |
| `austi-landing-preview` | `austi-landing:preview` | 4329           |
| `trading`               | `trading:dev`           | 3000           |
| `trading-preview`       | `trading:preview`       | 4173           |
| `trading-convex`        | `trading:convex`        | none           |
| `portfolio`             | `portfolio:dev`         | 4321           |
| `portfolio-preview`     | `portfolio:preview`     | 4321           |
| `austi-desktop`         | `austi-desktop:dev`     | 1421           |

Web apps move to the next free port, up to 10 higher, when their preferred port is taken. Always
read the actual port from `pitchfork status <daemon>` or `pitchfork list --json`. Scripts read the
port from `$PORT`, which pitchfork sets. A moved port can break flows tied to a fixed origin, such
as auth redirects.

The desktop port is fixed by the app's Tauri `devUrl`, so a conflict fails the start instead.

The Convex daemons sync functions to cloud deployments and do not listen on a local port. Check
them with `pitchfork status` and `pitchfork logs`. If Convex needs an interactive login or project
selection, run `bunx convex dev` once in a terminal.

## Notes

- Short daemon names resolve to the current checkout. Each git worktree gets its own namespace from
  its directory name, for example `pitchfork-dev-processes/austi`, so use the full ID from
  `pitchfork list` when working across checkouts.
- An invalid `pitchfork.toml` stops the supervisor from starting. Durations must be strings, for
  example `timeout = "60s"`.
- Personal overrides go in `pitchfork.local.toml`, which is gitignored.
- `pitchfork boot enable` starts the supervisor at login, but it will not have your shell `PATH`,
  so `bun` must be made available to it first.
