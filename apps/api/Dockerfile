# syntax=docker/dockerfile:1
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/messages/package.json ./packages/messages/
COPY packages/sdk/package.json ./packages/sdk/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Build
WORKDIR /app/apps/api
RUN pnpm run build:ts

FROM base AS production
WORKDIR /app

# Copy workspace package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/messages/package.json ./packages/messages/
COPY packages/sdk/package.json ./packages/sdk/

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/packages ./packages

WORKDIR /app/apps/api

EXPOSE 8080

CMD ["pnpm", "exec", "fastify", "start", "-l", "info", "-a", "0.0.0.0", "-p", "8080", "dist/app.js"]
