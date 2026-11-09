#!/bin/sh
# Production releases ship the backend and frontend together. Previews only build the frontend,
# so a pull request can never change the production database or functions.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  cd ../..
  exec bunx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'bun run --filter austi build'
fi

exec bun run build
