# syntax=docker/dockerfile:1.7
# API images. Build context: repository root.
#
#   migrator  one-shot job: `prisma migrate deploy`, then the demo seed only if
#             SEED_DEMO_DATA=true (docker-compose sets it; real environments do not).
#   runtime   the API server (default target): production dependencies and
#             compiled JS only. The Prisma CLI toolchain is pruned out.
#
# Both run as the unprivileged `node` user under tini (signal forwarding, so
# Nest's graceful-shutdown hooks run on `docker stop`).
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apk add --no-cache openssl
WORKDIR /repo

# deps: install from the lockfile only (cached until a manifest changes)
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pm/api... --ignore-scripts

# build: compile, then carve out a self-contained production bundle
FROM deps AS build
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @pm/contracts build \
 && pnpm --filter @pm/api build \
 && pnpm --filter @pm/api deploy --legacy --prod /out \
 && cd /out && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma

# The CLI (and its config/engine-download toolchain) is only needed to migrate.
# The generated client in node_modules/.prisma is self-sufficient at runtime.
FROM build AS runtime-modules
RUN cd /out/node_modules && rm -rf .bin/prisma \
    .pnpm/prisma@* .pnpm/@prisma+engines@* .pnpm/@prisma+config@* .pnpm/@prisma+fetch-engine@* \
    .pnpm/effect@* .pnpm/fast-check@* .pnpm/c12@* .pnpm/jiti@* .pnpm/typescript@*

# shared release base
FROM node:${NODE_VERSION} AS release
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production PATH=/app/node_modules/.bin:$PATH
WORKDIR /app
ENTRYPOINT ["/sbin/tini", "--"]

FROM release AS migrator
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/prisma ./prisma
COPY --from=build /repo/apps/api/dist ./dist
USER node
CMD ["sh", "-c", "prisma migrate deploy && node dist/database/seed.js"]

FROM release AS runtime
# Code stays root-owned and read-only to the `node` user, so the process cannot rewrite it.
COPY --from=runtime-modules /out/package.json ./
COPY --from=runtime-modules /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
