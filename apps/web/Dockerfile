# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Web image. Build context: repository root.
#   docker build -f apps/web/Dockerfile -t patients-web .
# Uses Next.js `output: 'standalone'`: the runtime stage ships only the traced
# server files — no node_modules install, no source, no dev dependencies.
# ─────────────────────────────────────────────────────────────────────────────
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pm/web... --ignore-scripts

FROM deps AS build
COPY packages packages
COPY apps/web apps/web
RUN pnpm --filter @pm/contracts build && pnpm --filter @pm/web build

FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache tini
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
